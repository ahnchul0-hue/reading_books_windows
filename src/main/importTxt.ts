import { basename, extname } from 'node:path'
import { normalizeText } from '../core/text'

/** .txt 파일 경로+내용 → 제목(파일명) + 정규화 본문. (순수: fs/dialog 비의존) */
export function parseTxt(filePath: string, contents: string): { title: string; body: string } {
  return {
    title: basename(filePath, extname(filePath)),
    body: normalizeText(contents),
  }
}
