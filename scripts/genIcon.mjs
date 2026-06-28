// 앱 아이콘 생성기 (순수 JS). 둥근 사각 배경 + 글줄 3개 + 시그니처 스윕 바.
// 출력: build/icon.png (256), build/icon.ico
import { PNG } from 'pngjs'
import pngToIco from 'png-to-ico'
import { writeFileSync, mkdirSync } from 'node:fs'

const S = 256
const png = new PNG({ width: S, height: S })
const px = (x, y, r, g, b, a = 255) => {
  if (x < 0 || y < 0 || x >= S || y >= S) return
  const i = (y * S + x) * 4
  if (a >= 255) {
    png.data[i] = r
    png.data[i + 1] = g
    png.data[i + 2] = b
    png.data[i + 3] = 255
    return
  }
  // 알파 블렌딩(기존 위에)
  const ba = png.data[i + 3] / 255
  const fa = a / 255
  const oa = fa + ba * (1 - fa)
  const blend = (f, b0) => Math.round((f * fa + b0 * ba * (1 - fa)) / (oa || 1))
  png.data[i] = blend(r, png.data[i])
  png.data[i + 1] = blend(g, png.data[i + 1])
  png.data[i + 2] = blend(b, png.data[i + 2])
  png.data[i + 3] = Math.round(oa * 255)
}

// 둥근 사각형 포함 판정
const inRounded = (x, y, l, t, r, b, rad) => {
  if (x < l || x > r || y < t || y > b) return false
  const cx = x < l + rad ? l + rad : x > r - rad ? r - rad : x
  const cy = y < t + rad ? t + rad : y > b - rad ? b - rad : y
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= rad * rad
}

const lerp = (a, b, t) => Math.round(a + (b - a) * t)

// 1) 배경 둥근 사각 (파랑 세로 그라데이션)
const M = 10 // 여백
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    if (!inRounded(x, y, M, M, S - 1 - M, S - 1 - M, 52)) continue
    const t = (y - M) / (S - 2 * M)
    px(x, y, lerp(37, 29, t), lerp(99, 78, t), lerp(235, 216, t)) // #2563eb → #1d4ed8
  }
}

// 2) 글줄 3개 (흰색 둥근 막대)
const lines = [
  [56, 92, 200, 110],
  [56, 130, 200, 148],
  [56, 168, 168, 186], // 마지막 줄은 짧게
]
for (const [l, t, r, b] of lines)
  for (let y = t; y <= b; y++)
    for (let x = l; x <= r; x++)
      if (inRounded(x, y, l, t, r, b, (b - t) / 2)) px(x, y, 245, 245, 245)

// 3) 시그니처 스윕 바 (앰버, 반투명) — 글줄 위를 덮는 세로 막대
const bx = 150
const bw = 26
for (let y = 74; y <= 204; y++)
  for (let x = bx; x <= bx + bw; x++)
    if (inRounded(x, y, bx, 74, bx + bw, 204, 8)) px(x, y, 240, 198, 116, 150) // #F0C674 ~59%

mkdirSync('build', { recursive: true })
const buf = PNG.sync.write(png)
writeFileSync('build/icon.png', buf)
const ico = await pngToIco(buf)
writeFileSync('build/icon.ico', ico)
console.log('생성: build/icon.png, build/icon.ico (', ico.length, 'bytes )')
