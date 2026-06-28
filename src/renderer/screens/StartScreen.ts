import type { AppContext, SelectedText } from '../context'
import type { LinesPerPage, SpeedMult, TimerMin } from '../../shared/types'
import { applyTheme } from '../theme'
import { normalizeText } from '../../core/text'

const LINES: LinesPerPage[] = [3, 4, 5]
const SPEEDS: SpeedMult[] = [0.5, 1.0, 1.5, 2.0]
const TIMERS: TimerMin[] = [5, 10, 15, 20]

export async function renderStartScreen(ctx: AppContext): Promise<void> {
  const { root, api, state, nav } = ctx
  const profile = state.profile
  const settings = state.settings
  if (!profile || !settings) {
    nav.toProfile()
    return
  }

  let selected: SelectedText | null = state.text ?? null
  const saved = await api.texts.list(profile.id)

  root.innerHTML = `
    <section class="screen">
      <div class="row-between">
        <h1>${profile.avatar ?? '🙂'} ${escapeHtml(profile.name)}</h1>
        <button class="btn" id="back">친구 바꾸기</button>
      </div>

      <h2>무엇을 읽을까요?</h2>
      <input type="text" id="title" placeholder="글 제목 (선택)" />
      <textarea id="body" placeholder="여기에 글을 붙여넣어요 (Ctrl+V)"></textarea>
      <div class="row">
        <button class="btn" id="save">이 글 저장</button>
        <button class="btn" id="import">파일 열기 (.txt)</button>
      </div>

      <h2>저장된 글</h2>
      <div class="list" id="saved"></div>

      <h2>어떻게 읽을까요?</h2>
      <div class="options" id="options"></div>

      <div class="row">
        <button class="btn btn-primary btn-lg" id="start" disabled>읽기 시작 ▶</button>
      </div>
    </section>`

  const titleEl = root.querySelector('#title') as HTMLInputElement
  const bodyEl = root.querySelector('#body') as HTMLTextAreaElement
  const startBtn = root.querySelector('#start') as HTMLButtonElement
  const savedList = root.querySelector('#saved') as HTMLElement

  const refreshStartEnabled = (): void => {
    const hasText = (selected?.body ?? normalizeText(bodyEl.value)).length > 0
    startBtn.disabled = !hasText
  }

  // 저장된 글 목록
  const renderSaved = (items: typeof saved): void => {
    savedList.innerHTML = ''
    if (items.length === 0) {
      savedList.innerHTML = `<p class="muted">아직 저장된 글이 없어요.</p>`
      return
    }
    for (const t of items) {
      const item = document.createElement('div')
      item.className = 'list-item' + (selected?.id === t.id ? ' selected' : '')
      const span = document.createElement('span')
      span.textContent = t.title || '(제목 없음)'
      item.appendChild(span)
      item.addEventListener('click', () => {
        selected = { id: t.id, title: t.title, body: t.body }
        bodyEl.value = ''
        savedList.querySelectorAll('.list-item').forEach((el) => el.classList.remove('selected'))
        item.classList.add('selected')
        refreshStartEnabled()
      })
      savedList.appendChild(item)
    }
  }
  renderSaved(saved)

  // 직접 입력하면 저장글 선택 해제
  bodyEl.addEventListener('input', () => {
    if (bodyEl.value.trim()) {
      selected = null
      savedList.querySelectorAll('.list-item').forEach((el) => el.classList.remove('selected'))
    }
    refreshStartEnabled()
  })

  // 글 저장
  ;(root.querySelector('#save') as HTMLElement).addEventListener('click', async () => {
    const body = normalizeText(bodyEl.value)
    if (!body) return
    const title = titleEl.value.trim() || firstLine(body)
    const item = await api.texts.save(profile.id, title, body)
    selected = { id: item.id, title: item.title, body: item.body }
    void renderStartScreen({ ...ctx, state: { ...state, text: selected } })
  })

  // .txt 열기
  ;(root.querySelector('#import') as HTMLElement).addEventListener('click', async () => {
    const res = await api.texts.importTxt()
    if (!res) return
    titleEl.value = res.title
    bodyEl.value = res.body
    selected = null
    refreshStartEnabled()
  })

  // 옵션
  const opts = root.querySelector('#options') as HTMLElement
  const persist = async (): Promise<void> => {
    await api.settings.set(profile.id, settings)
  }

  opts.appendChild(
    chipGroup('한 화면 줄 수', LINES, settings.linesPerPage, (v) => {
      settings.linesPerPage = v
      void persist()
    }),
  )
  opts.appendChild(
    chipGroup('속도 (1.0배 = 분당 400자)', SPEEDS, settings.speedMult, (v) => {
      settings.speedMult = v
      void persist()
    }, (v) => `${v.toFixed(1)}×`),
  )
  opts.appendChild(
    chipGroup('시간(분)', TIMERS, settings.timerMin, (v) => {
      settings.timerMin = v
      void persist()
    }),
  )
  opts.appendChild(
    chipGroup('테마', ['light', 'dark'] as const, settings.theme, (v) => {
      settings.theme = v
      applyTheme(v)
      void persist()
    }, (v) => (v === 'light' ? '밝게 ☀' : '어둡게 🌙')),
  )
  opts.appendChild(fontStepper(settings.fontPt, (v) => {
    settings.fontPt = v
    void persist()
  }))

  // 시작
  ;(root.querySelector('#back') as HTMLElement).addEventListener('click', () => nav.toProfile())
  startBtn.addEventListener('click', () => {
    const body = selected ? selected.body : normalizeText(bodyEl.value)
    if (!body) return
    state.text = selected ?? { title: titleEl.value.trim() || firstLine(body), body }
    nav.toReading()
  })

  refreshStartEnabled()
}

// --- helpers ---

function chipGroup<T extends string | number>(
  label: string,
  values: readonly T[],
  current: T,
  onPick: (v: T) => void,
  fmt: (v: T) => string = (v) => String(v),
): HTMLElement {
  const group = document.createElement('div')
  group.className = 'option-group'
  const lab = document.createElement('label')
  lab.textContent = label
  const row = document.createElement('div')
  row.className = 'row'
  const chips: HTMLButtonElement[] = []
  for (const v of values) {
    const chip = document.createElement('button')
    chip.className = 'chip' + (v === current ? ' selected' : '')
    chip.textContent = fmt(v)
    chip.addEventListener('click', () => {
      onPick(v)
      chips.forEach((c) => c.classList.toggle('selected', c === chip))
    })
    chips.push(chip)
    row.appendChild(chip)
  }
  group.append(lab, row)
  return group
}

function fontStepper(current: number, onChange: (v: number) => void): HTMLElement {
  const MIN = 24
  const MAX = 48
  let pt = current
  const group = document.createElement('div')
  group.className = 'option-group'
  group.innerHTML = `<label>글자 크기</label>
    <div class="row">
      <button class="chip" id="minus">－</button>
      <span class="chip" id="val" style="min-width:4rem;text-align:center"></span>
      <button class="chip" id="plus">＋</button>
    </div>`
  const val = group.querySelector('#val') as HTMLElement
  const draw = (): void => {
    val.textContent = `${pt}pt`
  }
  group.querySelector('#minus')!.addEventListener('click', () => {
    pt = Math.max(MIN, pt - 2)
    draw()
    onChange(pt)
  })
  group.querySelector('#plus')!.addEventListener('click', () => {
    pt = Math.min(MAX, pt + 2)
    draw()
    onChange(pt)
  })
  draw()
  return group
}

function firstLine(s: string): string {
  const line = s.split('\n')[0].trim()
  return line.length > 20 ? line.slice(0, 20) + '…' : line || '내 글'
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[c]
  })
}
