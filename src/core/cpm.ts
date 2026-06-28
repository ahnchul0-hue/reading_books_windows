// 속도 계산 (순수 로직, Electron/DOM 비의존)
// 기준: 1.0배 = 400 CPM(분당 글자). 글자 수는 공백(띄어쓰기·줄바꿈·탭) 제외.

const BASE_CPM = 400

/** 공백(띄어쓰기·줄바꿈·탭 등)을 제외하고 한글 글자·문장부호만 1자로 센다. */
export function countableLength(text: string): number {
  return [...text].filter((ch) => !/\s/.test(ch)).length
}

/** 배율(0.5/1.0/1.5/2.0) → CPM. */
export function cpmFor(mult: number): number {
  return BASE_CPM * mult
}

/** 배율 → 1글자당 진행 시간(ms). 1.0배=150ms. */
export function msPerChar(mult: number): number {
  return 60000 / cpmFor(mult)
}
