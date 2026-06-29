import type { AppContext, SelectedText } from '../context'
import type { LinesPerPage, SpeedMult, TextItem, TimerMin } from '../../shared/types'
import { applyTheme } from '../theme'

const LINES: LinesPerPage[] = [3, 4, 5]
const SPEEDS: SpeedMult[] = [0.5, 1.0, 1.5, 2.0]
const TIMERS: TimerMin[] = [5, 10, 15, 20]
const FONT_MIN = 24
const FONT_MAX = 48

export async function renderStartScreen(ctx: AppContext): Promise<void> {
  const { root, api, state, nav } = ctx
  const profile = state.profile
  const settings = state.settings
  if (!profile || !settings) {
    nav.toProfile()
    return
  }
  const texts = await api.texts.list(profile.id)

  root.innerHTML = `
    <section class="screen">
      <div class="row-between">
        <h1>▶ 읽기 시작</h1>
        <button class="btn" id="back">← 대시보드</button>
      </div>
      <div class="row">
        <button class="btn btn-lg" id="mode-new">새로 읽기</button>
        <button class="btn btn-lg" id="mode-cont">이어서 읽기</button>
      </div>
      <div id="mode"></div>
    </section>`

  const modeEl = root.querySelector('#mode') as HTMLElement
  const newBtn = root.querySelector('#mode-new') as HTMLButtonElement
  const contBtn = root.querySelector('#mode-cont') as HTMLButtonElement
  ;(root.querySelector('#back') as HTMLElement).addEventListener('click', () => nav.toDashboard())

  const selectMode = (mode: 'new' | 'cont') => {
    newBtn.classList.toggle('btn-primary', mode === 'new')
    contBtn.classList.toggle('btn-primary', mode === 'cont')
    if (mode === 'new') renderNew(ctx, modeEl, texts)
    else void renderContinue(ctx, modeEl, texts)
  }
  newBtn.addEventListener('click', () => selectMode('new'))
  contBtn.addEventListener('click', () => selectMode('cont'))
  selectMode('new') // 기본: 새로 읽기
}

// --- 새로 읽기 ---
function renderNew(ctx: AppContext, host: HTMLElement, texts: TextItem[]): void {
  const { state, api, nav } = ctx
  const settings = state.settings!
  const profile = state.profile!
  let primaryId = state.text?.id ?? texts[0]?.id ?? null
  const queue = new Set<number>()

  host.innerHTML = `
    <h2>무엇을 읽을까요?</h2>
    <div class="list" id="texts"></div>
    <h2>어떻게 읽을까요?</h2>
    <div class="options" id="opts"></div>
    <h2>시간이 남으면 읽을 다음 글 <span class="muted">(선택)</span></h2>
    <div class="list" id="queue"></div>
    <div class="row"><button class="btn btn-primary btn-lg" id="go">시작 ▶</button></div>`

  const goBtn = host.querySelector('#go') as HTMLButtonElement
  const refreshGo = () => (goBtn.disabled = primaryId == null)

  // 글 목록(주 선택)
  const list = host.querySelector('#texts') as HTMLElement
  if (texts.length === 0) {
    list.innerHTML = `<p class="muted">저장된 글이 없어요. 대시보드에서 “글 저장/파일 열기”로 추가해요.</p>`
  }
  const renderLists = () => {
    list.innerHTML = ''
    for (const t of texts) {
      const item = document.createElement('div')
      item.className = 'list-item' + (t.id === primaryId ? ' selected' : '')
      item.textContent = t.title || '(제목 없음)'
      item.addEventListener('click', () => {
        primaryId = t.id
        queue.delete(t.id)
        renderLists()
        refreshGo()
      })
      list.appendChild(item)
    }
    // 대기열(주 선택 제외)
    const q = host.querySelector('#queue') as HTMLElement
    q.innerHTML = ''
    const rest = texts.filter((t) => t.id !== primaryId)
    if (rest.length === 0) q.innerHTML = `<p class="muted">다른 글이 없어요.</p>`
    for (const t of rest) {
      const item = document.createElement('div')
      item.className = 'list-item' + (queue.has(t.id) ? ' selected' : '')
      item.textContent = (queue.has(t.id) ? '✓ ' : '') + (t.title || '(제목 없음)')
      item.addEventListener('click', () => {
        if (queue.has(t.id)) queue.delete(t.id)
        else queue.add(t.id)
        renderLists()
      })
      q.appendChild(item)
    }
  }
  renderLists()

  // 옵션 스테퍼
  renderOptions(ctx, host.querySelector('#opts') as HTMLElement)

  goBtn.addEventListener('click', () => {
    if (primaryId == null) return
    const find = (id: number): SelectedText => {
      const t = texts.find((x) => x.id === id)!
      return { id: t.id, title: t.title, body: t.body }
    }
    state.text = find(primaryId)
    state.queue = [...queue].map(find)
    state.resumeChars = 0
    nav.toReading()
  })
  refreshGo()
  void settings
  void api
  void profile
}

// --- 이어서 읽기 ---
async function renderContinue(ctx: AppContext, host: HTMLElement, texts: TextItem[]): Promise<void> {
  const { state, api, nav } = ctx
  const profile = state.profile!
  const rs = await api.state.get(profile.id)
  const t = rs && rs.textId != null ? texts.find((x) => x.id === rs.textId) : undefined

  if (!rs || rs.finished || !t) {
    host.innerHTML = `<p class="muted">이어서 읽을 기록이 없어요. “새로 읽기”로 시작해요.</p>`
    return
  }

  host.innerHTML = `
    <div class="panel">
      <div class="panel-title">이어서 읽기</div>
      <p>지난번 «<b>${esc(t.title || '제목 없음')}</b>»을(를) 읽고 있었어요.</p>
      <p class="muted">읽은 글자: 약 ${rs.charsRead}자. 그 다음부터 이어서 진행할까요?</p>
      <div class="row">
        <button class="btn btn-primary btn-lg" id="resume">이어서 진행 ▶</button>
      </div>
    </div>
    <h2>어떻게 읽을까요?</h2>
    <div class="options" id="opts"></div>`

  renderOptions(ctx, host.querySelector('#opts') as HTMLElement)
  ;(host.querySelector('#resume') as HTMLElement).addEventListener('click', () => {
    state.text = { id: t.id, title: t.title, body: t.body }
    state.queue = []
    state.resumeChars = rs.charsRead
    nav.toReading()
  })
}

// --- 옵션 스테퍼 ---
function renderOptions(ctx: AppContext, host: HTMLElement): void {
  const { state, api } = ctx
  const settings = state.settings!
  const profile = state.profile!
  const persist = () => void api.settings.set(profile.id, settings)

  host.innerHTML = ''
  const stepIn = <T,>(arr: readonly T[], cur: T, dir: number): T => {
    const i = arr.indexOf(cur)
    return arr[Math.max(0, Math.min(arr.length - 1, i + dir))]
  }

  host.appendChild(
    stepper('한 화면 줄 수', () => `${settings.linesPerPage}줄`, (dir) => {
      settings.linesPerPage = stepIn(LINES, settings.linesPerPage, dir)
      persist()
    }),
  )
  host.appendChild(
    stepper('속도', () => `${settings.speedMult.toFixed(1)}×`, (dir) => {
      settings.speedMult = stepIn(SPEEDS, settings.speedMult, dir)
      persist()
    }),
  )
  host.appendChild(
    stepper('시간', () => `${settings.timerMin}분`, (dir) => {
      settings.timerMin = stepIn(TIMERS, settings.timerMin, dir)
      persist()
    }),
  )
  host.appendChild(
    stepper('글자 크기', () => `${settings.fontPt}pt`, (dir) => {
      settings.fontPt = Math.max(FONT_MIN, Math.min(FONT_MAX, settings.fontPt + dir * 2))
      persist()
    }),
  )

  // 테마: 변경 버튼(토글)
  const themeGroup = document.createElement('div')
  themeGroup.className = 'option-group'
  themeGroup.innerHTML = `<label>테마</label>`
  const tbtn = document.createElement('button')
  tbtn.className = 'btn'
  const drawTheme = () => (tbtn.textContent = settings.theme === 'dark' ? '🌙 어둡게' : '☀ 밝게')
  drawTheme()
  tbtn.addEventListener('click', () => {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark'
    applyTheme(settings.theme)
    drawTheme()
    persist()
  })
  themeGroup.appendChild(tbtn)
  host.appendChild(themeGroup)
}

function stepper(label: string, value: () => string, onStep: (dir: number) => void): HTMLElement {
  const group = document.createElement('div')
  group.className = 'option-group'
  const lab = document.createElement('label')
  lab.textContent = label
  const box = document.createElement('div')
  box.className = 'stepper'
  const plus = document.createElement('button')
  plus.className = 'chip'
  plus.textContent = '+'
  const val = document.createElement('span')
  val.className = 'val'
  const minus = document.createElement('button')
  minus.className = 'chip'
  minus.textContent = '−'
  const draw = () => (val.textContent = value())
  draw()
  plus.addEventListener('click', () => {
    onStep(+1)
    draw()
  })
  minus.addEventListener('click', () => {
    onStep(-1)
    draw()
  })
  box.append(plus, val, minus)
  group.append(lab, box)
  return group
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const m: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return m[c]
  })
}
