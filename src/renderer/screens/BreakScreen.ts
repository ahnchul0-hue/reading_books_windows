import type { Quote } from '../../shared/types'
import { BREAK_MS } from '../../core/breakScheduler'

/**
 * 강제 휴식 오버레이를 띄우고 카운트다운을 진행한다(스킵 불가 — 버튼 없음).
 * 읽기 화면 위에 덮으며, 끝나면 스스로 사라지고 resolve된다.
 * @param durationMs 휴식 길이(기본 20초). 테스트에서 단축 주입 가능.
 */
export function showBreak(quote: Quote | null, durationMs: number = BREAK_MS): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'break-overlay'
    overlay.innerHTML = `
      <div class="muted">잠깐 쉬어요 👀</div>
      <div class="break-quote"></div>
      <div class="break-count"></div>`
    ;(overlay.querySelector('.break-quote') as HTMLElement).textContent =
      quote?.body ?? '눈을 잠시 쉬게 해요.'
    const countEl = overlay.querySelector('.break-count') as HTMLElement
    document.body.appendChild(overlay)

    let remaining = durationMs
    let last = 0
    const draw = (): void => {
      countEl.textContent = `${Math.max(0, Math.ceil(remaining / 1000))}초 후에 다시 시작해요`
    }
    draw()

    const frame = (now: number): void => {
      if (last === 0) last = now
      remaining -= now - last
      last = now
      draw()
      if (remaining <= 0) {
        overlay.remove()
        resolve()
        return
      }
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
}
