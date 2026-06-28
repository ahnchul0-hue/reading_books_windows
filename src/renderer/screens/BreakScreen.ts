import type { Quote } from '../../shared/types'
import { BREAK_MS, breakRemainingMs, createBreak, isBreakOver, tickBreak } from '../../core/breakScheduler'

/**
 * 강제 휴식 오버레이를 띄우고 20초 카운트다운을 진행한다(스킵 불가).
 * 읽기 화면 위에 덮으며, 끝나면 스스로 사라지고 resolve된다.
 */
export function showBreak(quote: Quote | null): Promise<void> {
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

    let b = createBreak()
    let last = 0
    const draw = (): void => {
      const sec = Math.ceil(breakRemainingMs(b) / 1000)
      countEl.textContent = `${sec}초 후에 다시 시작해요`
    }
    draw()

    const frame = (now: number): void => {
      if (last === 0) last = now
      b = tickBreak(b, now - last)
      last = now
      draw()
      if (isBreakOver(b)) {
        overlay.remove()
        resolve()
        return
      }
      requestAnimationFrame(frame)
    }
    // 최소 BREAK_MS 보장(스킵 버튼 없음)
    void BREAK_MS
    requestAnimationFrame(frame)
  })
}
