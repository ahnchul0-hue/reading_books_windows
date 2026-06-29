import type { AppContext } from './context'
import type { LinesPerPage, SpeedMult, TimerMin } from '../shared/types'
import { applyTheme } from './theme'

const LINES: LinesPerPage[] = [3, 4, 5]
const SPEEDS: SpeedMult[] = [0.5, 1.0, 1.5, 2.0]
const TIMERS: TimerMin[] = [5, 10, 15, 20]
const FONT_MIN = 24
const FONT_MAX = 48

/** 글을 고른 뒤 읽기 옵션을 정하는 팝업. '시작'이면 true. */
export function showOptionsPopup(ctx: AppContext): Promise<boolean> {
  const { state, api } = ctx
  const settings = state.settings
  const profile = state.profile
  return new Promise((resolve) => {
    if (!settings || !profile) {
      resolve(false)
      return
    }
    const persist = () => void api.settings.set(profile.id, settings)
    const overlay = document.createElement('div')
    overlay.className = 'opt-overlay'
    overlay.innerHTML = `
      <div class="opt-box">
        <div class="opt-title">📖 ${escapeHtml(state.text?.title ?? '읽기')}</div>
        <p class="muted">어떻게 읽을까요?</p>
        <div class="options" id="opts"></div>
        <div class="row" style="justify-content:flex-end">
          <button class="btn" id="cancel">취소</button>
          <button class="btn btn-primary btn-lg" id="go">시작 ▶</button>
        </div>
      </div>`
    document.body.appendChild(overlay)
    const opts = overlay.querySelector('#opts') as HTMLElement

    const stepIn = <T,>(arr: readonly T[], cur: T, dir: number): T =>
      arr[Math.max(0, Math.min(arr.length - 1, arr.indexOf(cur) + dir))]

    opts.appendChild(stepper('한 화면 줄 수', () => `${settings.linesPerPage}줄`, (d) => {
      settings.linesPerPage = stepIn(LINES, settings.linesPerPage, d)
      persist()
    }))
    opts.appendChild(stepper('속도', () => `${settings.speedMult.toFixed(1)}×`, (d) => {
      settings.speedMult = stepIn(SPEEDS, settings.speedMult, d)
      persist()
    }))
    opts.appendChild(stepper('시간', () => `${settings.timerMin}분`, (d) => {
      settings.timerMin = stepIn(TIMERS, settings.timerMin, d)
      persist()
    }))
    opts.appendChild(stepper('글자 크기', () => `${settings.fontPt}pt`, (d) => {
      settings.fontPt = Math.max(FONT_MIN, Math.min(FONT_MAX, settings.fontPt + d * 2))
      persist()
    }))

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
    opts.appendChild(themeGroup)

    const close = (v: boolean) => {
      overlay.remove()
      resolve(v)
    }
    ;(overlay.querySelector('#cancel') as HTMLElement).addEventListener('click', () => close(false))
    ;(overlay.querySelector('#go') as HTMLElement).addEventListener('click', () => close(true))
  })
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const m: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return m[c]
  })
}
