import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// renderer(화면)만 Vite로 번들한다. main/preload는 tsc로 컴파일.
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './', // file:// 로 로드되는 패키지 앱에서 상대경로 보장
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
})
