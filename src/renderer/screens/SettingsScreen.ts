import type { AppContext } from '../context'
import { applyTheme } from '../theme'
import { collapsibleStepper, collapsibleToggle } from '../ui'
import { saveSettings } from '../settingsSync'

const SPACINGS = [1.4, 1.6, 1.8, 2.0, 2.2]
const FONT_MIN = 24
const FONT_MAX = 48

export function renderSettingsScreen(ctx: AppContext): void {
  const { root, api, state, nav } = ctx
  const settings = state.settings
  const profile = state.profile
  if (!settings || !profile) {
    nav.toProfile()
    return
  }
  const persist = () => saveSettings(ctx)
  void api
  void profile
  const stepIn =<T,>(arr: readonly T[], cur: T, dir: number): T =>
    arr[Math.max(0, Math.min(arr.length - 1, arr.indexOf(cur) + dir))]

  root.innerHTML = `
    <section class="screen">
      <div class="row-between">
        <h1>⚙ 기본 설정</h1>
        <button class="btn" id="back">← 대시보드</button>
      </div>
      <p class="muted">여기서 정한 값이 기본으로 적용돼요. 메뉴를 눌러 펼친 뒤 바꿔요. (읽기 시작할 때 또 바꿀 수 있어요.)</p>
      <div class="options-col" id="opts"></div>
    </section>`

  const opts = root.querySelector('#opts') as HTMLElement
  opts.appendChild(
    collapsibleToggle('테마 (밝게 / 어둡게)', () => (settings.theme === 'dark' ? '🌙 어둡게' : '☀ 밝게'), () => {
      settings.theme = settings.theme === 'dark' ? 'light' : 'dark'
      applyTheme(settings.theme)
      persist()
    }),
  )
  opts.appendChild(
    collapsibleStepper('글자 크기', () => `${settings.fontPt}pt`, (d) => {
      settings.fontPt = Math.max(FONT_MIN, Math.min(FONT_MAX, settings.fontPt + d * 2))
      persist()
    }),
  )
  opts.appendChild(
    collapsibleStepper('줄 간격', () => settings.lineSpacing.toFixed(1), (d) => {
      settings.lineSpacing = stepIn(SPACINGS, settings.lineSpacing, d)
      persist()
    }),
  )
  opts.appendChild(
    collapsibleToggle('효과음', () => (settings.soundOn ? '🔔 켜짐' : '🔕 꺼짐'), () => {
      settings.soundOn = !settings.soundOn
      persist()
    }),
  )
  opts.appendChild(
    collapsibleToggle('진동(아이패드)', () => (settings.hapticOn ? '📳 켜짐' : '꺼짐'), () => {
      settings.hapticOn = !settings.hapticOn
      persist()
    }),
  )

  ;(root.querySelector('#back') as HTMLElement).addEventListener('click', () => nav.toDashboard())
}
