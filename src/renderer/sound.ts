// 효과음(Web Audio 합성, 에셋 불필요). 초등학생용 '딩동' 류.
let enabled = true
export function setSoundEnabled(on: boolean): void {
  enabled = on
}

let ctx: AudioContext | null = null
function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, startAt: number, dur: number, gain = 0.16): void {
  const a = ac()
  const t0 = a.currentTime + startAt
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = 'sine'
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g)
  g.connect(a.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.03)
}

export const sound = {
  // 시작: 딩-동(올라감)
  start(): void {
    if (!enabled) return
    try {
      tone(523.25, 0, 0.18)
      tone(659.25, 0.15, 0.3)
    } catch {
      /* 오디오 불가 */
    }
  },
  // 끝(완독): 딩-동-딩(축하)
  end(): void {
    if (!enabled) return
    try {
      tone(523.25, 0, 0.16)
      tone(659.25, 0.14, 0.16)
      tone(783.99, 0.28, 0.45)
    } catch {
      /* 오디오 불가 */
    }
  },
  // 선택: 톡(짧게)
  select(): void {
    if (!enabled) return
    try {
      tone(880, 0, 0.06, 0.08)
    } catch {
      /* 오디오 불가 */
    }
  },
}
