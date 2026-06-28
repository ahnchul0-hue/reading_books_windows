import { defineConfig } from '@playwright/test'

// Electron E2E. 브라우저 바이너리 불필요(앱의 electron 사용).
// 사전 조건: npm run build && npm run rebuild:electron (better-sqlite3 Electron ABI).
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
})
