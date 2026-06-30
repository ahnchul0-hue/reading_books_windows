// 효과음(딩동) + 햅틱. 설정의 soundOn/hapticOn을 따름.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
import * as Haptics from 'expo-haptics'

let soundOn = true
let hapticOn = true
export function setSoundPrefs(s: boolean, h: boolean): void {
  soundOn = s
  hapticOn = h
}

let startP: AudioPlayer | null = null
let endP: AudioPlayer | null = null
let selP: AudioPlayer | null = null
let inited = false
function ensure(): void {
  if (inited) return
  inited = true
  try {
    void setAudioModeAsync({ playsInSilentMode: true })
    startP = createAudioPlayer(require('../assets/sounds/start.wav'))
    endP = createAudioPlayer(require('../assets/sounds/end.wav'))
    selP = createAudioPlayer(require('../assets/sounds/select.wav'))
  } catch {
    /* 오디오 불가 */
  }
}
async function play(p: AudioPlayer | null): Promise<void> {
  if (!soundOn || !p) return
  try {
    await p.seekTo(0)
    p.play()
  } catch {
    /* 무시 */
  }
}

export const cue = {
  start(): void {
    ensure()
    void play(startP)
    if (hapticOn) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  },
  end(): void {
    ensure()
    void play(endP)
    if (hapticOn) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  },
  select(): void {
    ensure()
    void play(selP)
    if (hapticOn) Haptics.selectionAsync().catch(() => {})
  },
}
