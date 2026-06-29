import { test, expect, _electron as electron, type Page } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const STORY =
  '옛날 옛적에 작은 마을이 있었어요. 그 마을에는 책을 좋아하는 아이가 살았어요. ' +
  '아이는 매일 한 권씩 책을 읽었어요. 비가 오는 날에도 바람 부는 날에도 읽었어요. ' +
  '그렇게 아이는 점점 자라났어요. 어느 날 아이는 큰 도서관을 만났어요. ' +
  '그곳에는 수많은 이야기가 기다리고 있었어요. 아이는 오늘도 새로운 책을 펼쳤어요.'

async function launch() {
  const userDataDir = mkdtempSync(join(tmpdir(), 'rt-e2e-'))
  const app = await electron.launch({ args: ['.', `--user-data-dir=${userDataDir}`] })
  const win = await app.firstWindow()
  await win.waitForSelector('text=읽기 친구들')
  return { app, win }
}

async function makeProfileAndText(win: Page): Promise<void> {
  await win.click('text=새 사용자')
  await win.fill('#nick', '테스터')
  await win.click('#save')
  await win.click('text=테스터')
  await win.waitForSelector('#cal') // 대시보드
  await win.click('#start') // 대시보드 → 읽기 시작
  await win.waitForSelector('text=무엇을 읽을까요?')
  await win.fill('#body', STORY)
}

const transform = (win: Page) =>
  win.locator('.sweep-bar').evaluate((el) => (el as HTMLElement).style.transform)

test('전체 흐름: 읽기 → 스윕 이동 → 강제 휴식(스킵 불가) → 타이머 우선 종료', async () => {
  const { app, win } = await launch()
  await makeProfileAndText(win)

  // 테스트 시seam: 타이머·휴식 단축
  await win.evaluate(() => {
    ;(window as unknown as { __rtTest: unknown }).__rtTest = {
      timerMs: 4000,
      breakIntervalMs: 2200,
      breakMs: 1000,
    }
  })
  await win.click('#start')

  // 스윕 바 등장 + 이동
  await expect(win.locator('.sweep-bar')).toBeVisible()
  const t1 = await transform(win)
  await win.waitForTimeout(700)
  const t2 = await transform(win)
  expect(t2).not.toBe(t1)

  // 강제 휴식 등장 + 스킵 버튼 없음
  await win.waitForSelector('.break-overlay', { timeout: 6000 })
  expect(await win.locator('.break-overlay button').count()).toBe(0)
  await expect(win.locator('.break-quote')).not.toHaveText('')

  // 휴식 자동 종료(20초 채워야 하지만 테스트는 단축)
  await win.waitForSelector('.break-overlay', { state: 'detached', timeout: 5000 })

  // 타이머 우선 종료 → 종료 화면
  await win.waitForSelector('text=끝까지 읽었어요', { timeout: 12000 })

  await app.close()
})

test('일시정지/재개: 멈춤 중 막대 정지, 재개 시 다시 이동', async () => {
  const { app, win } = await launch()
  await makeProfileAndText(win)

  await win.evaluate(() => {
    ;(window as unknown as { __rtTest: unknown }).__rtTest = {
      timerMs: 600000,
      breakIntervalMs: 9_999_999,
    }
  })
  await win.click('#start')
  await expect(win.locator('.sweep-bar')).toBeVisible()
  await win.waitForTimeout(500)

  await win.click('#pause')
  const p1 = await transform(win)
  await win.waitForTimeout(500)
  const p2 = await transform(win)
  expect(p2).toBe(p1) // 정지 중 막대 고정

  await win.click('#pause')
  await win.waitForTimeout(500)
  const p3 = await transform(win)
  expect(p3).not.toBe(p2) // 재개 후 이동

  await app.close()
})
