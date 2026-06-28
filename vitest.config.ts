import { defineConfig } from 'vitest/config'

// 순수 모듈(src/core) 단위 테스트. Electron/DOM 비의존.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
