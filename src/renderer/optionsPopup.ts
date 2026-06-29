import type { AppContext, SelectedText } from './context'
import type { LinesPerPage, SpeedMult, TextItem, TimerMin } from '../shared/types'
import { applyTheme } from './theme'
import { collapsibleStepper, collapsibleToggle } from './ui'

const SPACINGS = [1.4, 1.6, 1.8, 2.0, 2.2]

/**
 * 선택한 글이 타이머 시간보다 짧으면(글자수 부족), 남는 시간에 읽을 다음 글을 고르는 팝업.
 * @returns 대기열로 추가할 글들
 */
export function showPickMorePopup(
  ctx: AppContext,
  candidates: TextItem[],
  remainSec: number,
): Promise<SelectedText[]> {
  return new Promise((resolve) => {
    const picked = new Set<number>()
    const overlay = document.createElement('div')
    overlay.className = 'opt-overlay'
    overlay.innerHTML = `
      <div class="opt-box">
        <div class="opt-title">⏱ 시간이 남아요!</div>
        <p class="muted">이 글은 정한 시간보다 짧아요(약 ${remainSec}초 남음). 시간이 남으면 이어서 읽을 다음 글을 골라요.</p>
        <div class="list" id="more"></div>
        <div class="row" style="justify-content:flex-end">
          <button class="btn" id="skip">그냥 시작</button>
          <button class="btn btn-primary btn-lg" id="go">선택하고 시작 ▶</button>
        </div>
      </div>`
    document.body.appendChild(overlay)
    const list = overlay.querySelector('#more') as HTMLElement
    if (candidates.length === 0) list.innerHTML = `<p class="muted">고를 다른 글이 없어요.</p>`
    for (const t of candidates) {
      const item = document.createElement('div')
      item.className = 'list-item'
      const set = () => {
        item.classList.toggle('selected', picked.has(t.id))
        item.textContent = (picked.has(t.id) ? '✓ ' : '') + (t.title || '(제목 없음)')
      }
      set()
      item.addEventListener('click', () => {
        if (picked.has(t.id)) picked.delete(t.id)
        else picked.add(t.id)
        set()
      })
      list.appendChild(item)
    }
    const finish = () => {
      overlay.remove()
      resolve(
        candidates
          .filter((t) => picked.has(t.id))
          .map((t) => ({ id: t.id, title: t.title, body: t.body })),
      )
    }
    ;(overlay.querySelector('#skip') as HTMLElement).addEventListener('click', () => {
      picked.clear()
      finish()
    })
    ;(overlay.querySelector('#go') as HTMLElement).addEventListener('click', finish)
  })
}

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

    // 기본 접힘 — 펼쳐서 선택
    opts.appendChild(collapsibleStepper('한 화면 줄 수', () => `${settings.linesPerPage}줄`, (d) => {
      settings.linesPerPage = stepIn(LINES, settings.linesPerPage, d)
      persist()
    }))
    opts.appendChild(collapsibleStepper('속도', () => `${settings.speedMult.toFixed(1)}×`, (d) => {
      settings.speedMult = stepIn(SPEEDS, settings.speedMult, d)
      persist()
    }))
    opts.appendChild(collapsibleStepper('시간', () => `${settings.timerMin}분`, (d) => {
      settings.timerMin = stepIn(TIMERS, settings.timerMin, d)
      persist()
    }))
    opts.appendChild(collapsibleStepper('글자 크기', () => `${settings.fontPt}pt`, (d) => {
      settings.fontPt = Math.max(FONT_MIN, Math.min(FONT_MAX, settings.fontPt + d * 2))
      persist()
    }))
    opts.appendChild(collapsibleStepper('줄 간격', () => settings.lineSpacing.toFixed(1), (d) => {
      settings.lineSpacing = stepIn(SPACINGS, settings.lineSpacing, d)
      persist()
    }))
    opts.appendChild(collapsibleToggle('테마', () => (settings.theme === 'dark' ? '🌙 어둡게' : '☀ 밝게'), () => {
      settings.theme = settings.theme === 'dark' ? 'light' : 'dark'
      applyTheme(settings.theme)
      persist()
    }))

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
