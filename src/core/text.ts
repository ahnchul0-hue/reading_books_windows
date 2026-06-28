// 텍스트 정규화 (순수 로직) — 붙여넣기/.txt 두 입력 경로를 같은 내부 형식으로 통일(D-4-2).

/**
 * 줄바꿈을 \n으로 통일, 탭→공백, 줄 끝 공백 제거, 앞뒤 여백 제거.
 * 내부 빈 줄(문단 구분)은 보존한다.
 */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n') // \r\n, \r → \n
    .replace(/\t/g, ' ') // 탭 → 공백
    .replace(/[ ]+\n/g, '\n') // 줄 끝 공백 제거
    .trim() // 앞뒤 여백/빈 줄 제거
}
