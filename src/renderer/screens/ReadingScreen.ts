import type { AppContext, SelectedText } from '../context'
import { countableLength, msPerChar } from '../../core/cpm'
import { paginate } from '../../core/paginate'
import {
  advanceLine,
  buildLineTimeline,
  lineDuration,
  sweepXAt,
  type Segment,
} from '../../core/sweep'
import {
  createClock,
  isEnded,
  pause as pauseClock,
  remainingMs,
  resume as resumeClock,
  tick,
  type ClockState,
} from '../../core/sessionClock'
import { BREAK_INTERVAL_MS } from '../../core/breakScheduler'
import { showBreak } from './BreakScreen'

// 테스트 전용 시seam: 설정 시 타이머/휴식 시간을 단축. 미설정이면 실제 값 사용.
interface RtTest {
  timerMs?: number
  breakIntervalMs?: number
  breakMs?: number
}

export async function renderReadingScreen(ctx: AppContext): Promise<void> {
  const { root, api, state, nav } = ctx
  if (!state.profile || !state.settings || !state.text) {
    nav.toProfile()
    return
  }
  const profile = state.profile
  const settings = state.settings
  // 읽을 글 목록: 주 선택 + 대기열(시간 남으면 이어서)
  const readList: SelectedText[] = [state.text, ...(state.queue ?? [])]
  let textIdx = 0
  let currentText = readList[0]
  const tcfg: RtTest = (window as unknown as { __rtTest?: RtTest }).__rtTest ?? {}
  const totalTimerMs = tcfg.timerMs ?? settings.timerMin * 60000
  const breakIntervalMs = tcfg.breakIntervalMs ?? BREAK_INTERVAL_MS

  root.innerHTML = `
    <section class="screen reading">
      <div class="reading-top">
        <span id="timer">--:--</span>
        <span id="pageinfo"></span>
      </div>
      <div class="page" id="page"></div>
      <div class="reading-controls">
        <button class="btn" id="pause">⏸ 일시정지</button>
        <button class="btn" id="quit">끝내기</button>
      </div>
    </section>`

  const pageEl = root.querySelector('#page') as HTMLElement
  const timerEl = root.querySelector('#timer') as HTMLElement
  const pageInfoEl = root.querySelector('#pageinfo') as HTMLElement
  const pauseBtn = root.querySelector('#pause') as HTMLButtonElement
  pageEl.style.position = 'relative'
  pageEl.style.fontSize = `${settings.fontPt}pt`

  // 글꼴/크기·창 크기 기준 1줄 최대 글자수 추정 → core.paginate (반응형)
  let charWidthPx = measureCharWidth(pageEl)
  function computePages(): string[][] {
    charWidthPx = measureCharWidth(pageEl)
    const cs = getComputedStyle(pageEl)
    const avail = pageEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const maxChars = Math.max(4, Math.floor(avail / charWidthPx))
    return paginate(currentText.body, settings.linesPerPage, maxChars)
  }
  let pages = computePages()

  // 세션 시작 기록
  const startedAtIso = new Date().toISOString()
  const sessionId = await api.session.start(
    profile.id,
    currentText.id ?? null,
    JSON.stringify(settings),
  )

  // 현재 줄 배경 음영(백그라운드, 비도드라짐) + 스윕 바
  const lineHi = document.createElement('div')
  lineHi.className = 'line-highlight'
  pageEl.appendChild(lineHi)
  const bar = document.createElement('div')
  bar.className = 'sweep-bar'
  let barWidth = 2 * charWidthPx // 글자폭 2배(약 2글자)
  bar.style.width = `${barWidth}px`
  pageEl.appendChild(bar)

  // 런타임 상태
  let clock: ClockState = createClock(totalTimerMs)
  let activeSinceBreak = 0
  let charsRead = 0
  let textCharsConsumed = 0 // 현재 글에서 읽은 글자(이어읽기 저장용)
  let textFinished = false
  let pageReached = 1
  let pageIndex = 0
  let lineIndex = 0
  let lineElapsedMs = 0
  let currentLineText = ''
  let timeline: Segment[] = []
  let lineEls: HTMLElement[] = []
  let phase: 'reading' | 'paused' | 'break' | 'ended' = 'reading'
  let raf = 0
  let lastNow = 0

  if (pages.length === 0) {
    await endSession()
    return
  }

  const ms = msPerChar(settings.speedMult)

  function renderPage(): void {
    pageEl.querySelectorAll('.line').forEach((e) => e.remove())
    lineEls = []
    for (const lineText of pages[pageIndex]) {
      const lineEl = document.createElement('div')
      lineEl.className = 'line'
      for (const ch of [...lineText]) {
        const s = document.createElement('span')
        s.textContent = ch
        lineEl.appendChild(s)
      }
      pageEl.appendChild(lineEl)
      lineEls.push(lineEl)
    }
  }

  function loadLine(): void {
    currentLineText = pages[pageIndex][lineIndex]
    const lineEl = lineEls[lineIndex]
    const pageRect = pageEl.getBoundingClientRect()
    const glyphX = [...lineEl.children].map(
      (sp) => sp.getBoundingClientRect().right - pageRect.left,
    )
    timeline = buildLineTimeline([...currentLineText], glyphX, ms)
    // 바 + 현재 줄 음영을 현재 줄 위로 이동
    const lineRect = lineEl.getBoundingClientRect()
    const top = lineRect.top - pageRect.top
    bar.style.top = `${top}px`
    bar.style.height = `${lineRect.height}px`
    lineHi.style.top = `${top}px`
    lineHi.style.height = `${lineRect.height}px`
  }

  // 이어읽기: 읽은 글자수(target)에 해당하는 줄로 위치 이동 (레이아웃 비의존)
  function positionFromChars(target: number): void {
    pageIndex = 0
    lineIndex = 0
    textCharsConsumed = 0
    if (target <= 0) return
    let acc = 0
    for (let p = 0; p < pages.length; p++) {
      for (let l = 0; l < pages[p].length; l++) {
        const c = countableLength(pages[p][l])
        if (acc + c > target) {
          pageIndex = p
          lineIndex = l
          textCharsConsumed = acc
          return
        }
        acc += c
      }
    }
    pageIndex = pages.length - 1
    lineIndex = pages[pageIndex].length - 1
    textCharsConsumed = acc - countableLength(pages[pageIndex][lineIndex])
  }

  // 창 크기 변경 시 줄글이 화면을 채우도록 재배치
  let resizeT = 0
  function relayout(): void {
    if (phase === 'ended') return
    pages = computePages()
    if (pages.length === 0) return
    if (pageIndex >= pages.length) pageIndex = pages.length - 1
    if (lineIndex >= pages[pageIndex].length) lineIndex = pages[pageIndex].length - 1
    barWidth = 1.5 * charWidthPx
    bar.style.width = `${barWidth}px`
    renderPage()
    loadLine()
    lineElapsedMs = 0
  }
  function onResize(): void {
    window.clearTimeout(resizeT)
    resizeT = window.setTimeout(relayout, 150)
  }
  window.addEventListener('resize', onResize)

  function setBarX(x: number): void {
    bar.style.transform = `translateX(${x - barWidth / 2}px)`
  }

  function updateTopUI(): void {
    timerEl.textContent = fmtTime(remainingMs(clock))
    pageInfoEl.textContent = `${pageIndex + 1} / ${pages.length} 쪽`
  }

  async function endSession(): Promise<void> {
    if (phase === 'ended') return
    phase = 'ended'
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onResize)
    window.clearTimeout(resizeT)
    await api.session.finish(sessionId, {
      activeMs: clock.activeMs,
      charsRead,
      pageReached,
    })
    // 이어읽기 재개 지점 저장(현재 글 기준)
    await api.state.save(profile.id, {
      textId: currentText.id ?? null,
      charsRead: textCharsConsumed,
      finished: textFinished,
    })
    // 서버에 세션 업로드(랭킹용, 베스트 에포트 — 오프라인이면 무시)
    try {
      await api.cloud.uploadSession({
        activeMs: clock.activeMs,
        charsRead,
        completed: textFinished,
        startedAt: startedAtIso,
      })
    } catch {
      /* 오프라인 */
    }
    state.lastSummary = {
      charsRead,
      activeMs: clock.activeMs,
      pageReached,
      speedMult: settings.speedMult,
    }
    nav.toEnd()
  }

  async function startBreak(): Promise<void> {
    phase = 'break'
    cancelAnimationFrame(raf)
    let quote = null
    try {
      quote = await api.quotes.next(profile.id)
    } catch {
      quote = null
    }
    await showBreak(quote, tcfg.breakMs)
    if (phase !== 'break') return // 도중 종료된 경우
    activeSinceBreak = 0
    phase = 'reading'
    lastNow = 0
    raf = requestAnimationFrame(frame)
  }

  function frame(now: number): void {
    if (phase !== 'reading') return
    if (lastNow === 0) lastNow = now
    const dt = now - lastNow
    lastNow = now

    lineElapsedMs += dt
    clock = tick(clock, dt)
    activeSinceBreak += dt
    updateTopUI()

    const dur = lineDuration(timeline)
    setBarX(sweepXAt(timeline, Math.min(lineElapsedMs, dur)))

    if (lineElapsedMs >= dur) {
      const lineChars = countableLength(currentLineText)
      charsRead += lineChars
      textCharsConsumed += lineChars
      const adv = advanceLine({ pageIndex, lineIndex }, pages)
      if (adv.ended) {
        textFinished = true
        if (isEnded(clock)) {
          void endSession()
          return
        }
        // 글을 끝까지 읽음 + 시간 남음 → 미리 고른 다음 글로 (없으면 종료)
        textIdx++
        if (textIdx >= readList.length) {
          void endSession()
          return
        }
        currentText = readList[textIdx]
        pages = computePages()
        textFinished = false
        textCharsConsumed = 0
        pageIndex = 0
        lineIndex = 0
        renderPage()
      } else if (adv.pageIndex !== pageIndex) {
        pageIndex = adv.pageIndex
        lineIndex = adv.lineIndex
        renderPage()
      } else {
        lineIndex = adv.lineIndex
      }
      pageReached = Math.max(pageReached, pageIndex + 1)
      loadLine()
      lineElapsedMs = 0
    }

    if (isEnded(clock)) {
      void endSession()
      return
    }
    if (activeSinceBreak >= breakIntervalMs) {
      void startBreak()
      return
    }
    raf = requestAnimationFrame(frame)
  }

  function togglePause(): void {
    if (phase === 'reading') {
      phase = 'paused'
      clock = pauseClock(clock)
      cancelAnimationFrame(raf)
      pauseBtn.textContent = '▶ 재개'
    } else if (phase === 'paused') {
      phase = 'reading'
      clock = resumeClock(clock)
      lastNow = 0
      pauseBtn.textContent = '⏸ 일시정지'
      raf = requestAnimationFrame(frame)
    }
  }

  pauseBtn.addEventListener('click', togglePause)
  ;(root.querySelector('#quit') as HTMLElement).addEventListener('click', () => void endSession())

  // 초기 렌더 + 시작 (이어읽기면 저장된 글자수 위치로)
  positionFromChars(state.resumeChars ?? 0)
  pageReached = pageIndex + 1
  renderPage()
  loadLine()
  updateTopUI()
  raf = requestAnimationFrame(frame)
}

// --- helpers ---

function measureCharWidth(pageEl: HTMLElement): number {
  const probe = document.createElement('span')
  probe.style.visibility = 'hidden'
  probe.style.position = 'absolute'
  probe.style.whiteSpace = 'pre'
  probe.textContent = '가나다라마바사아자차'
  pageEl.appendChild(probe)
  const w = probe.getBoundingClientRect().width / 10
  probe.remove()
  return w || 20
}

function fmtTime(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
