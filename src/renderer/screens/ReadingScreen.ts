import type { AppContext } from '../context'
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
  const text = state.text
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

  // 글꼴/크기 기준 1줄 최대 글자수 추정 → core.paginate 1차 분할 (D1)
  const charWidthPx = measureCharWidth(pageEl)
  const cs = getComputedStyle(pageEl)
  const avail = pageEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
  const maxChars = Math.max(4, Math.floor(avail / charWidthPx))
  const pages = paginate(text.body, settings.linesPerPage, maxChars)

  // 세션 시작 기록
  const sessionId = await api.session.start(profile.id, text.id ?? null, JSON.stringify(settings))

  // 스윕 바
  const bar = document.createElement('div')
  bar.className = 'sweep-bar'
  const barWidth = 1.5 * charWidthPx // 글자폭 1.5배
  bar.style.width = `${barWidth}px`
  pageEl.appendChild(bar)

  // 런타임 상태
  let clock: ClockState = createClock(totalTimerMs)
  let activeSinceBreak = 0
  let charsRead = 0
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
    // 바를 현재 줄 위로 이동
    const lineRect = lineEl.getBoundingClientRect()
    bar.style.top = `${lineRect.top - pageRect.top}px`
    bar.style.height = `${lineRect.height}px`
  }

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
    await api.session.finish(sessionId, {
      activeMs: clock.activeMs,
      charsRead,
      pageReached,
    })
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
      charsRead += countableLength(currentLineText)
      const adv = advanceLine({ pageIndex, lineIndex }, pages)
      if (adv.ended) {
        if (isEnded(clock)) {
          void endSession()
          return
        }
        // 글을 끝까지 읽었지만 시간이 남음 → 처음부터 반복 (D4)
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

  // 초기 렌더 + 시작
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
