# 읽기 훈련 앱(Reading Trainer) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: 이 계획은 `superpowers:subagent-driven-development`(권장) 또는 `superpowers:executing-plans`로 태스크 단위 실행한다. 단계는 체크박스(`- [ ]`) 문법으로 추적한다.

**Goal:** 10세 아동의 문해력·좌→우 시선처리 훈련용 Windows 데스크톱 앱(Electron, 단일 .exe)을, 순수 로직과 UI를 분리한 테스트 가능한 구조로 구축한다.

**Architecture:** Electron 3-프로세스 분리(main = SQLite·파일IO·창관리, preload = contextBridge 안전 IPC, renderer = UI + 읽기 엔진). **핵심 난제 로직(속도 계산·페이지 분할·스윕 바 이동·휴식 스케줄·명언 선택)은 Electron 비의존 순수 모듈로 떼어내 TDD**한다. 이 분리가 곧 팀 에이전트의 포지션 경계가 된다.

**Tech Stack:** Electron, TypeScript, Vite(renderer 번들), better-sqlite3(동기 SQLite), Vitest(단위 테스트), Playwright(Electron E2E), electron-builder(NSIS 단일 .exe).

## Global Constraints

> 모든 태스크의 요구사항에 아래가 암묵적으로 포함된다. 값은 first_step.md에서 그대로 가져왔다.

- 플랫폼: Windows 데스크톱, 배포는 **단일 .exe 설치본**(NSIS), 자동 업데이트 없음.
- 기준 속도: **1.0배 = 400 CPM**, 0.5=200 / 1.5=600 / 2.0=800 CPM.
- 글자 수 카운트: **공백(띄어쓰기·줄바꿈) 제외**, 한글 글자 + 문장부호만 1자.
- 문장 종결부(`. ? ! …` 등)에서 **스윕 바 0.3초(300ms) 정지**.
- 페이지: 한 화면 **3 / 4 / 5줄** 선택, 페이지 단위 전환.
- 폰트: **받침 잘 보이는 고딕 계열**, 기본 **24pt 이상**, 화면 −/+ 버튼으로 확대·축소(프로필별 기억).
- 테마: 라이트(스윕 바 = 연한 노랑) / 다크(스윕 바 = 앰버 #F0C674 계열), **글자폭 1.5배, 투명도 50%**, 프로필별 기억.
- 타이머: **5/10/15/20분** 선택, **타이머 우선 종료**(시간 끝나면 글 안 끝나도 종료, 글이 먼저 끝나면 처음부터 반복).
- 휴식: **5분(활성 읽기 시간)마다 20초 강제 휴식, 스킵 불가, 카운트다운 표시**, 명언 1개 크게.
- 명언: **1000개 데이터셋, 퍼블릭 도메인 위주, 10세 눈높이 쉬운 우리말, 최근 표시 제외(중복 방지)**.
- 저장: 프로필 / 글 / 세션 / 진도 / 설정 / 명언을 **SQLite에 프로필별** 저장.
- 아동 안전: 큰 버튼, 적은 선택지, 일시정지, 강제 휴식, 다크모드, 눈 피로 배려.

---

## 파일 구조 (책임 경계 = 에이전트 경계)

```
reading_books/
├─ package.json                      # electron, vite, vitest, electron-builder 스크립트
├─ electron-builder.yml              # NSIS 단일 .exe 설정
├─ tsconfig.json
├─ vite.config.ts                    # renderer 번들
├─ vitest.config.ts                  # 순수 모듈 단위 테스트
├─ docs/
│  └─ DESIGN-SPEC.md                 # Phase 0 산출물 (first_step.md 실행 결과)
├─ src/
│  ├─ core/                          # ★순수 로직 (Electron 비의존, TDD 핵심) — Engine 에이전트
│  │  ├─ cpm.ts                      # 배율↔CPM↔ms/char, countable char 규칙
│  │  ├─ paginate.ts                 # 글 → 3/4/5줄 페이지 분할
│  │  ├─ sweep.ts                    # 스윕 바 타임라인 빌드 + 위치 계산 + 문장끝 정지
│  │  ├─ breakScheduler.ts           # 5분마다 휴식 트리거, 활성시간 누적
│  │  ├─ sessionClock.ts             # 타이머 우선 종료, pause/resume 상태
│  │  └─ quotes.ts                   # 명언 무작위 선택 + 최근 제외 중복 방지
│  ├─ main/                          # Electron main — Backend 에이전트
│  │  ├─ index.ts                    # 앱 부트, BrowserWindow, 메뉴
│  │  ├─ db.ts                       # better-sqlite3 연결 + 마이그레이션 + 시드
│  │  ├─ repositories/
│  │  │  ├─ profileRepo.ts
│  │  │  ├─ textRepo.ts
│  │  │  ├─ sessionRepo.ts
│  │  │  └─ quoteRepo.ts
│  │  └─ ipc.ts                      # ipcMain 핸들러 (preload 계약 구현)
│  ├─ preload/
│  │  └─ index.ts                    # contextBridge.exposeInMainWorld('api', ...)
│  ├─ shared/
│  │  └─ ipc-contract.ts             # main↔renderer 공유 타입 (Architect 에이전트가 소유)
│  └─ renderer/                      # UI — Frontend 에이전트
│     ├─ index.html
│     ├─ main.ts                     # 화면 라우팅
│     ├─ screens/
│     │  ├─ ProfileScreen.ts
│     │  ├─ StartScreen.ts
│     │  ├─ ReadingScreen.ts         # core/sweep 소비, requestAnimationFrame 루프
│     │  ├─ BreakScreen.ts
│     │  └─ EndScreen.ts
│     ├─ theme.ts                    # 라이트/다크, 스윕 바 색·투명도
│     └─ styles.css
├─ data/
│  └─ quotes.seed.json               # 명언 시드 (Data 에이전트) — Phase 7
└─ tests/
   ├─ core/                          # cpm/paginate/sweep/break/quotes 단위 테스트
   ├─ main/                          # repository 단위 테스트(인메모리 SQLite)
   └─ e2e/                           # Playwright Electron 통합 테스트
```

핵심 원칙: **`src/core/`는 DOM·Electron·SQLite를 import하지 않는다.** 입력은 값, 출력은 값. 이래야 가장 어려운 로직(스윕 바 산수)을 UI 없이 빠르게 TDD하고, Engine 에이전트가 독립 작업할 수 있다.

---

## 팀 에이전트 오케스트레이션 설계 (실제 실행 구성)

### 역할(포지션) 정의

| 에이전트 | 담당 디렉토리 | 책임 | subagent_type / 도구 |
|---|---|---|---|
| **Architect** | `src/shared/`, `docs/DESIGN-SPEC.md` | 설계 명세서 산출, IPC 계약·DB 스키마·core 인터페이스 시그니처 확정 | `Plan` (읽기·설계), 결과 후 `claude` |
| **Engine** | `src/core/`, `tests/core/` | 순수 로직 TDD (cpm·paginate·sweep·break·session·quotes) | `claude` (Edit/Bash/Read) |
| **Backend** | `src/main/`, `src/preload/`, `tests/main/` | SQLite·repository·IPC·파일 열기 | `claude` |
| **Frontend** | `src/renderer/` | 5개 화면·테마·접근성·rAF 애니메이션 루프 | `claude` |
| **Data** | `data/quotes.seed.json` | 명언 1000개 수집·다듬기·중복검수 | `claude` + WebSearch |
| **QA** | `tests/e2e/`, 리뷰 | 통합·E2E·아동 UX 검수, 각 태스크 게이트 | `Explore`/`claude` + Playwright |

### 의존성 그래프 (병렬 vs 순차)

```
Phase 0  Architect: DESIGN-SPEC.md ─────────────┐ (휴먼 게이트)
                                                 ▼
Phase 1  (전원) 스캐폴드 + .exe 빌드 통과 ───────┐
                                                 ▼
Phase 2  Engine: core/ (TDD)  ──┐
Phase 3  Backend: db + repo  ───┼─ 병렬 가능 (shared 계약 확정 후)
Phase 7  Data: quotes 1000    ──┘
                  │ (Phase 2,3 완료)
                  ▼
Phase 4  Backend: IPC + preload (core·repo 소비)
                  ▼
Phase 5  Frontend: 화면 (core·IPC 소비)
                  ▼
Phase 6  QA: 통합 E2E (전체 흐름)
                  ▼
Phase 8  Backend: 단일 .exe 패키징 + Windows 스모크
```

병렬 구간(Phase 2·3·7)이 핵심 시간 절약 포인트. **Architect가 `src/shared/ipc-contract.ts`와 core 인터페이스 시그니처를 Phase 1 끝에 먼저 확정**해야 Engine/Backend/Frontend가 서로 안 막히고 병렬로 간다.

### 실제 실행 방법 두 가지

**(A) superpowers:subagent-driven-development (권장, 대화형 검수)**
- 각 태스크마다 fresh subagent 1개 dispatch → 2단계 리뷰(자기검증 금지, 별도 reviewer subagent) → 다음 태스크.
- 장점: 태스크 사이 휴먼/리뷰 게이트, C.H의 "설계→생성→검증 분리" 원칙과 일치.

**(B) Workflow 파이프라인 (병렬 자동화, 명시적 opt-in 필요)**
- Phase 2·3·7을 `parallel()`로 동시 실행, 각 역할 에이전트가 자기 디렉토리만 수정(충돌 시 `isolation: 'worktree'`).
- 게이트(설계 명세서 승인, 통합)는 휴먼 확인 후 다음 phase로.
- 사용하려면 사용자가 "ultracode" 또는 "워크플로 돌려줘"로 명시 요청해야 함.

오케스트레이션 스켈레톤(개념, Workflow 방식):

```js
// 의사 워크플로 — Phase 2·3·7 병렬, 이후 순차
phase('Foundation')
await agent('Architect: src/shared/ipc-contract.ts와 core 인터페이스 확정', {agentType:'Plan'})

phase('Parallel build')
const [engine, backend, data] = await parallel([
  () => agent('Engine: src/core 전체 TDD 구현', {isolation:'worktree'}),
  () => agent('Backend: db + repositories TDD 구현', {isolation:'worktree'}),
  () => agent('Data: quotes 1000개 수집·다듬기', {isolation:'worktree'}),
])

phase('Integrate')
await agent('Backend: IPC + preload, core/repo 연결')
await agent('Frontend: 5개 화면 + 테마 + rAF 루프')

phase('Verify')        // 자기검증 금지 — 독립 QA 에이전트
await agent('QA: Playwright E2E 전체 세션 흐름 검증', {agentType:'Explore'})
```

> 규칙(C.H CLAUDE.md): 생성 에이전트가 자기 산출물을 자체평가하지 않는다. 검증은 **항상 별도 QA/reviewer 에이전트**.

---

## Phase 0 — 설계 명세서 산출 (Architect)

**목표:** first_step.md를 실행해 `docs/DESIGN-SPEC.md`를 만든다. 이 단계는 **코드 없음**(first_step.md 규칙).

- [ ] **Step 1:** Architect 에이전트(`Plan` type)에게 first_step.md 전문을 전달, [1단계] 사고과정 + [2단계] 개요판까지 산출.
- [ ] **Step 2:** 휴먼(C.H) 검토 → "계속" → 본문 8개 장 전체를 약 3000자씩 이어서 작성.
- [ ] **Step 3:** `docs/DESIGN-SPEC.md`로 저장, [[wiki/log]] 기록(C.H vault 규칙).
- [ ] **Step 4 (게이트):** 부모(비개발자)도 읽고 기능 확인 가능한지 휴먼 승인. 미승인 시 Phase 1 진입 금지.

**산출물:** `docs/DESIGN-SPEC.md`. **수용 기준:** first_step.md의 RESPONSE 목차 8개 장 + DB 스키마 + 스윕 바 의사코드 + 명언 예시 5개 포함.

---

## Phase 1 — 프로젝트 스캐폴드 + 단일 .exe 빌드 통과 (전원)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `electron-builder.yml`
- Create: `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/index.html`, `src/renderer/main.ts`
- Test: `tests/core/smoke.test.ts`

**Interfaces:**
- Produces: 실행 가능한 Electron 앱(빈 창 "Reading Trainer"), `npm test` 통과, `npm run dist`로 `.exe` 생성.

- [ ] **Step 1: 실패 테스트 작성** — 빌드 도구 체인이 살아있는지 확인하는 스모크.
```ts
// tests/core/smoke.test.ts
import { describe, it, expect } from 'vitest'
import { appName } from '../../src/core/meta'
describe('toolchain', () => {
  it('exposes app name', () => { expect(appName()).toBe('Reading Trainer') })
})
```
- [ ] **Step 2: 실패 확인** — `npx vitest run tests/core/smoke.test.ts` → FAIL (`meta` 모듈 없음).
- [ ] **Step 3: 최소 구현**
```ts
// src/core/meta.ts
export function appName(): string { return 'Reading Trainer' }
```
- [ ] **Step 4: 통과 확인** — `npx vitest run` → PASS.
- [ ] **Step 5: Electron 빈 창** — `src/main/index.ts`에서 `BrowserWindow` 생성, `index.html` 로드. `npm start`로 빈 창 표시 확인.
- [ ] **Step 6: 단일 .exe 빌드** — `electron-builder.yml`에 `target: nsis`, `npm run dist` → `dist/Reading Trainer Setup.exe` 생성 확인(Windows 환경 또는 CI). **수용 기준: .exe 산출.**
- [ ] **Step 7: 커밋**
```bash
git add -A && git commit -m "chore: electron+vite+vitest scaffold, single-exe build passes"
```

---

## Phase 2 — 순수 엔진 코어 (Engine) ★최우선 난제

> first_step.md의 "핵심 설계 난제"가 모두 여기 모인다. UI 없이 값→값으로 TDD한다.

### Task 2-1: 속도 계산 `core/cpm.ts`

**Interfaces:**
- Produces: `countableLength(text: string): number`, `cpmFor(mult: 0.5|1.0|1.5|2.0): number`, `msPerChar(mult): number`

- [ ] **Step 1: 실패 테스트**
```ts
// tests/core/cpm.test.ts
import { countableLength, cpmFor, msPerChar } from '../../src/core/cpm'
it('counts korean+punct, excludes spaces/newlines', () => {
  expect(countableLength('안녕, 세상!\n끝.')).toBe(8) // 안녕,세상!끝.  = 8
})
it('maps multiplier to CPM', () => {
  expect(cpmFor(1.0)).toBe(400); expect(cpmFor(0.5)).toBe(200)
  expect(cpmFor(1.5)).toBe(600); expect(cpmFor(2.0)).toBe(800)
})
it('ms per char at 1.0x = 150ms', () => { expect(msPerChar(1.0)).toBe(150) })
```
- [ ] **Step 2: 실패 확인** — `npx vitest run tests/core/cpm.test.ts` → FAIL.
- [ ] **Step 3: 구현**
```ts
// src/core/cpm.ts
export function countableLength(text: string): number {
  return [...text].filter(ch => !/\s/.test(ch)).length
}
export function cpmFor(mult: number): number { return 400 * mult }
export function msPerChar(mult: number): number { return 60000 / cpmFor(mult) }
```
- [ ] **Step 4: 통과 확인** → PASS.
- [ ] **Step 5: 커밋** — `git commit -m "feat(core): cpm/countable-length speed math"`

### Task 2-2: 페이지 분할 `core/paginate.ts`

**Interfaces:**
- Consumes: 정규화된 텍스트(`\n` 줄바꿈)
- Produces: `paginate(text: string, linesPerPage: 3|4|5, maxCharsPerLine: number): string[][]` (페이지 → 줄 배열)

- [ ] **Step 1: 실패 테스트** — 긴 줄은 `maxCharsPerLine`에서 어절 경계로 줄바꿈, `linesPerPage`마다 새 페이지.
```ts
// tests/core/paginate.test.ts
import { paginate } from '../../src/core/paginate'
it('splits into pages of N lines, wraps at word boundary', () => {
  const pages = paginate('가 나 다 라 마 바', 2, 5) // 한 줄 5자, 2줄/페이지
  expect(pages.length).toBeGreaterThan(0)
  pages.forEach(p => expect(p.length).toBeLessThanOrEqual(2))
})
```
- [ ] **Step 2: 실패 확인** → FAIL.
- [ ] **Step 3: 구현** — 어절(공백) 단위로 `maxCharsPerLine` 넘으면 줄바꿈, `linesPerPage`마다 페이지 분할. (실제 픽셀 폭 측정은 Frontend가 글꼴 로드 후 보정; core는 글자수 기준 1차 분할.)
- [ ] **Step 4: 통과 확인** → PASS.
- [ ] **Step 5: 커밋.**

### Task 2-3: 스윕 바 타임라인 `core/sweep.ts` ★가장 어려운 로직

**설계 결정(근거):** 한 줄을 "세그먼트 = countable char 1개" 단위 타임라인으로 만든다. 각 세그먼트는 `durationMs`(= msPerChar, 문장종결부면 +300ms 정지)와 `startX/endX`(픽셀)를 가진다. **공백은 시간 0**이되 픽셀 폭은 **다음 countable char 세그먼트의 x 범위에 흡수**시켜 텔레포트를 막는다. 그래서 바는 부드럽게 이동하고, 카운트는 공백을 제외하며, 문장 끝에서 0.3초 멈춘다.

**Interfaces:**
- Consumes: `glyphX: number[]` (각 문자 우측 끝의 픽셀 x, Frontend가 측정해 주입), `msPerChar: number`
- Produces:
  - `buildLineTimeline(chars: string[], glyphX: number[], msPerChar: number): Segment[]`
  - `Segment = { startMs: number; endMs: number; startX: number; endX: number; holdMs: number }`
  - `sweepXAt(timeline: Segment[], elapsedMs: number): number`
  - `lineDuration(timeline: Segment[]): number`

- [ ] **Step 1: 실패 테스트**
```ts
// tests/core/sweep.test.ts
import { buildLineTimeline, sweepXAt, lineDuration } from '../../src/core/sweep'
const chars = [...'가나.다']            // '.' 는 문장 종결부
const glyphX = [10, 20, 25, 35]         // 각 글자 우측 끝 px
const tl = buildLineTimeline(chars, glyphX, 150)
it('non-space chars consume 150ms, sentence-end adds 300ms hold', () => {
  // 가(150) 나(150) .(150+300 hold) 다(150) => 활성 600ms + hold 300
  expect(lineDuration(tl)).toBe(900)
})
it('x is monotonic non-decreasing and ends at last glyphX', () => {
  expect(sweepXAt(tl, 0)).toBeCloseTo(0, 1)
  expect(sweepXAt(tl, 900)).toBeCloseTo(35, 1)
})
it('holds x during sentence-end pause', () => {
  // '.' 끝(누적 활성 450ms) 직후 300ms 동안 x 고정
  const xAtPauseStart = sweepXAt(tl, 450)
  const xMidPause = sweepXAt(tl, 600)
  expect(xMidPause).toBeCloseTo(xAtPauseStart, 1)
})
```
- [ ] **Step 2: 실패 확인** → FAIL.
- [ ] **Step 3: 구현**
```ts
// src/core/sweep.ts
export interface Segment { startMs:number; endMs:number; startX:number; endX:number; holdMs:number }
const SENTENCE_END = /[.?!…]/
export function buildLineTimeline(chars:string[], glyphX:number[], msPerChar:number):Segment[] {
  const segs:Segment[] = []
  let t = 0, prevX = 0
  for (let i=0;i<chars.length;i++){
    const ch = chars[i], xEnd = glyphX[i]
    if (/\s/.test(ch)) { prevX = xEnd; continue }     // 공백: 시간0, 폭은 다음 세그먼트가 흡수
    const hold = SENTENCE_END.test(ch) ? 300 : 0
    segs.push({ startMs:t, endMs:t+msPerChar, startX:prevX, endX:xEnd, holdMs:hold })
    t += msPerChar + hold
    prevX = xEnd
  }
  return segs
}
export function lineDuration(tl:Segment[]):number {
  if (!tl.length) return 0
  const last = tl[tl.length-1]
  return last.endMs + last.holdMs
}
export function sweepXAt(tl:Segment[], elapsed:number):number {
  if (!tl.length) return 0
  let cursor = 0
  for (const s of tl){
    const moveEnd = s.endMs, holdEnd = s.endMs + s.holdMs
    if (elapsed <= moveEnd){
      const r = (elapsed - s.startMs) / (s.endMs - s.startMs)
      return s.startX + (s.endX - s.startX) * Math.max(0, Math.min(1, r))
    }
    if (elapsed <= holdEnd) return s.endX           // 문장 끝 0.3초 정지
    cursor += (s.endMs - s.startMs) + s.holdMs
  }
  return tl[tl.length-1].endX
}
```
- [ ] **Step 4: 통과 확인** → PASS.
- [ ] **Step 5: 줄 끝→다음 줄, 페이지 끝→다음 페이지 테스트 추가** — `advanceLine(page, lineIdx)` 헬퍼로 마지막 줄이면 페이지 전환 신호 반환.
- [ ] **Step 6: 커밋** — `git commit -m "feat(core): sweep-bar timeline with sentence-end hold"`

### Task 2-4: 세션 시계 `core/sessionClock.ts`

**Interfaces:**
- Produces: `createClock(totalMs)`, `tick(state, dtMs)`, `pause/resume(state)`, `isEnded(state)` — **활성 읽기 시간만 누적**(pause·break 중 정지), `totalMs` 도달 시 종료(타이머 우선).

- [ ] **Step 1: 실패 테스트** — pause 중 tick은 누적 안 됨, totalMs 도달 시 `isEnded=true`.
- [ ] **Step 2~4:** 실패 확인 → 순수 상태머신 구현 → 통과.
- [ ] **Step 5: 커밋.**

### Task 2-5: 휴식 스케줄 `core/breakScheduler.ts`

**Interfaces:**
- Produces: `shouldBreak(activeMs): boolean` (5분=300000ms 누적마다 true), `BREAK_MS=20000`, 휴식 중 활성시간 정지.

- [ ] **Step 1: 실패 테스트** — 활성 300000ms 누적 시 휴식 트리거, 휴식 20초 카운트다운, **스킵 불가**(외부에서 강제 종료 API 없음).
- [ ] **Step 2~4:** 구현 → 통과.
- [ ] **Step 5: 커밋.**

### Task 2-6: 명언 선택 `core/quotes.ts`

**Interfaces:**
- Produces: `pickQuote(all: Quote[], recentIds: number[], rng?): Quote` — 최근 표시 N개 제외 후 무작위.

- [ ] **Step 1: 실패 테스트** — `recentIds`에 든 id는 안 뽑힘, 모두 최근이면 가장 오래된 것부터 허용, `rng` 주입으로 결정론적 테스트.
- [ ] **Step 2~4:** 구현 → 통과.
- [ ] **Step 5: 커밋.**

**Phase 2 수용 기준:** `npx vitest run tests/core` 전체 PASS, `src/core/`가 DOM/Electron/SQLite를 import하지 않음(의존성 lint 통과).

---

## Phase 3 — 데이터 계층 (Backend) — Phase 2와 병렬 가능

**Files:** `src/main/db.ts`, `src/main/repositories/*.ts`, `tests/main/*.test.ts`

**DB 스키마(better-sqlite3, 마이그레이션 0001):**
```sql
CREATE TABLE profiles (id INTEGER PRIMARY KEY, name TEXT NOT NULL, created_at TEXT);
CREATE TABLE settings (profile_id INTEGER, theme TEXT, font_pt INTEGER, lines_per_page INTEGER,
  speed_mult REAL, timer_min INTEGER, PRIMARY KEY(profile_id),
  FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE);
CREATE TABLE texts (id INTEGER PRIMARY KEY, profile_id INTEGER, title TEXT, body TEXT,
  created_at TEXT, FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE);
CREATE TABLE sessions (id INTEGER PRIMARY KEY, profile_id INTEGER, text_id INTEGER,
  started_at TEXT, ended_at TEXT, active_ms INTEGER, chars_read INTEGER,
  page_reached INTEGER, settings_json TEXT);
CREATE TABLE quotes (id INTEGER PRIMARY KEY, body TEXT NOT NULL, source TEXT, license TEXT);
CREATE TABLE quote_history (profile_id INTEGER, quote_id INTEGER, shown_at TEXT);
```

- [ ] **Task 3-1 profileRepo:** create/list/delete + 설정 분리 저장. TDD(인메모리 `:memory:` SQLite). 커밋.
- [ ] **Task 3-2 textRepo:** save/list/get(프로필별), 붙여넣기·파일 입력 동일 형식으로 정규화 후 저장. TDD. 커밋.
- [ ] **Task 3-3 sessionRepo:** 세션 시작/종료 기록, 진도(chars_read/page_reached) 저장. TDD. 커밋.
- [ ] **Task 3-4 quoteRepo:** 시드 로드, `pickQuote` 연동용 최근 history 조회/기록. TDD. 커밋.

**수용 기준:** `npx vitest run tests/main` 전체 PASS, FK CASCADE 동작(프로필 삭제 시 연관 삭제).

---

## Phase 4 — IPC + preload 계약 (Backend)

**Files:** `src/shared/ipc-contract.ts`(Architect 소유), `src/main/ipc.ts`, `src/preload/index.ts`

**Interfaces (shared contract — 발췌):**
```ts
export interface Api {
  profiles: { list(): Promise<Profile[]>; create(name:string): Promise<Profile>; remove(id:number): Promise<void> }
  texts: { list(profileId:number): Promise<TextItem[]>; save(profileId:number, title:string, body:string): Promise<TextItem>; importTxt(): Promise<{title:string;body:string}|null> }
  settings: { get(profileId:number): Promise<Settings>; set(profileId:number, s:Settings): Promise<void> }
  session: { save(s:SessionRecord): Promise<void> }
  quotes: { next(profileId:number): Promise<Quote> }
}
```

- [ ] **Task 4-1:** contextIsolation 켜고 `contextBridge.exposeInMainWorld('api', ...)`로 위 계약 노출. `importTxt`는 main의 `dialog.showOpenDialog`(.txt 필터)로 파일 읽어 반환.
- [ ] **Task 4-2:** ipcMain 핸들러를 repository에 연결. E2E에서 round-trip 테스트.
- [ ] **커밋.** **수용 기준:** renderer에서 `window.api.profiles.list()` 동작, 노드 통합 OFF·contextIsolation ON(보안).

---

## Phase 5 — UI 화면 (Frontend)

**Files:** `src/renderer/screens/*.ts`, `theme.ts`, `styles.css`

- [ ] **Task 5-1 ProfileScreen:** 큰 카드형 프로필 등록/선택/삭제. 적은 선택지·큰 버튼.
- [ ] **Task 5-2 StartScreen:** 글 붙여넣기 / .txt 열기(`api.texts.importTxt`) / 저장된 글 목록 선택, 줄수(3/4/5)·속도(0.5~2.0)·타이머(5~20분)·테마·글자크기(−/+) 선택. 설정은 프로필별 저장.
- [ ] **Task 5-3 ReadingScreen:** 글꼴 로드 후 `glyphX` 측정 → `core/sweep` 타임라인 빌드 → `requestAnimationFrame` 루프에서 `sweepXAt(elapsed)`로 반투명 세로 막대 위치 갱신(폭 1.5배·투명도 50%·테마 색). 줄 끝→다음 줄, 페이지 끝→다음 페이지. 일시정지/재개 버튼.
- [ ] **Task 5-4 BreakScreen:** 5분마다 자동, 20초 카운트다운(스킵 버튼 없음), 명언 1개 크게(`api.quotes.next`).
- [ ] **Task 5-5 EndScreen:** 타이머 종료 시 알림 + 읽은 분량 요약, 세션 저장(`api.session.save`).
- [ ] **Task 5-6 theme.ts:** 라이트=연한 노랑 / 다크=#F0C674, 프로필별 기억.
- [ ] **각 태스크 커밋.** **수용 기준:** 글자 크기 변경 시 재배치(`glyphX` 재측정 → 타임라인 재빌드), 테마 전환 즉시 반영.

---

## Phase 6 — 통합 E2E (QA, 자기검증 금지)

**Files:** `tests/e2e/session-flow.spec.ts` (Playwright + Electron)

- [ ] **Task 6-1:** 프로필 생성→글 붙여넣기→읽기 시작→스윕 바 이동 관찰→일시정지/재개→5분 지점 휴식(20초 강제)→타이머 종료→세션 저장 확인까지 전체 흐름.
- [ ] **Task 6-2:** 타이머 우선 종료 검증(글 다 읽어도 시간 남으면 처음부터 반복; 시간 끝나면 글 중간이어도 종료).
- [ ] **Task 6-3:** pause/resume 상태 보존(위치·남은 시간·진도), 휴식 스킵 불가.
- [ ] **커밋.** **수용 기준:** 위 시나리오 그린.

---

## Phase 7 — 명언 1000개 데이터셋 (Data) — Phase 3 이후 병렬

**Files:** `data/quotes.seed.json`

- [ ] **Task 7-1:** 퍼블릭 도메인 위주 출처 수집(출처·라이선스 명기). 형식:
```json
[{ "id": 1, "body": "오늘 배운 작은 것이 내일의 큰 힘이 됩니다.", "source": "속담(다듬음)", "license": "public-domain" }]
```
- [ ] **Task 7-2:** **10세 눈높이로 쉬운 우리말 다듬기**(어려운 한자어·관념어 제거), 중복 문장 검수.
- [ ] **Task 7-3:** 시드 로더가 `quotes` 테이블에 적재, `pickQuote` 최근 제외 동작 검증.
- [ ] **커밋.** **수용 기준:** 1000개, 중복 0, 모든 문장 10세 가독성 기준 통과(QA 샘플 검수 50개).

---

## Phase 8 — 단일 .exe 패키징 (Backend)

- [ ] **Task 8-1:** `electron-builder.yml` NSIS 설정 마무리(앱 아이콘, 설치 경로, 바탕화면 아이콘), `better-sqlite3` 네이티브 모듈 rebuild 포함.
- [ ] **Task 8-2:** `npm run dist` → `Reading Trainer Setup.exe` 생성.
- [ ] **Task 8-3:** Windows에서 설치→실행→DB 생성→세션 1회 완주 스모크 테스트.
- [ ] **커밋.** **수용 기준:** 깨끗한 Windows에서 단일 .exe 설치만으로 동작.

---

## 계획적으로 더 확인할 부분 (Open Questions / 검증 포인트)

> first_step.md "계획적으로 더 확인할 부분"에 대한 답. 실행 전 확정 권장.

**A. 설계/스펙 미확정**
1. **줄바꿈 픽셀 기준** — core의 글자수 기반 분할 vs Frontend의 실제 글꼴 픽셀 폭 측정. 글자 크기 −/+ 시 페이지 재분할이 필요 → "Frontend 측정 후 core 재호출" 경계를 Architect가 확정해야 함.
2. **스윕 바 vs 페이지** — 막대가 "현재 줄 한 줄" 위를 이동하는지, "페이지 전체"를 한 번에 훑는지. 본 계획은 **줄 단위 이동 후 다음 줄 하강**으로 가정. 시선처리 훈련 의도와 맞는지 확인.
3. **공백 처리 부드러움** — 공백 폭을 다음 세그먼트에 흡수(본 계획)하면 띄어쓰기 많은 글에서 속도 미세 변동. 실제 아동 테스트로 체감 확인 필요.
4. **타이머 정의** — 타이머가 "활성 읽기 시간"(pause·break 제외) 기준인지 "벽시계 시간"인지. 본 계획은 **활성 시간** 가정. first_step.md는 "타이머 우선 종료"만 명시 → 확정 필요.
5. **글 끝났는데 시간 남음** — "처음부터 반복" vs "대기". 본 계획은 **반복** 가정.

**B. 기술 리스크**
6. **better-sqlite3 네이티브 모듈** — Electron 버전별 ABI rebuild 필요(`electron-rebuild`). Phase 1에서 미리 검증해 Phase 8 폭탄 방지.
7. **Windows 빌드 환경** — 개발은 macOS(현재 환경). `.exe` 빌드/스모크는 Windows 또는 CI(GitHub Actions windows-latest) 필요. → CI 파이프라인을 Phase 1에 추가 권장.
8. **글꼴 동봉** — "받침 잘 보이는 고딕"의 구체 글꼴(예: Pretendard, 나눔고딕) 라이선스 확인 후 .exe에 동봉.

**C. 데이터/컴플라이언스**
9. **명언 라이선스** — 퍼블릭 도메인 1000개 확보 현실성. 부족 시 자체 창작/속담 다듬기 비율 정책 필요. 출처·라이선스 컬럼 필수 기록.
10. **아동 개인정보** — 프로필명에 실명 입력 시 로컬 SQLite에만 저장(외부 전송 없음)임을 부모에게 명시. CPPG 관점 점검(C.H 관심사).

**D. 프로세스**
11. **GitHub 앱 미설치** — ultraplan 클라우드/코드리뷰 자동화를 쓰려면 https://github.com/apps/claude/installations/new 설치 필요(현재 미설치).
12. **에이전트 충돌 방지** — Phase 2·3·7 병렬 시 각 에이전트가 자기 디렉토리만 수정. 공유 파일(`src/shared/ipc-contract.ts`)은 Architect 단독 소유, 변경 시 다운스트림에 전파.

---

## 권장 진행 순서 요약

1. **Phase 0** — Architect로 `DESIGN-SPEC.md` 산출 → 휴먼 승인 (게이트).
2. **Open Questions A·B** 확정 (특히 1·4·6·7).
3. **Phase 1** — 스캐폴드 + .exe 빌드 + CI를 먼저 통과시켜 패키징 리스크 조기 제거.
4. **Phase 2·3·7 병렬** — Engine/Backend/Data 동시. (Workflow 또는 subagent-driven)
5. **Phase 4→5→6** 순차 통합.
6. **Phase 8** — 최종 .exe + Windows 스모크.

각 Phase는 독립적으로 빌드·테스트 가능한 vertical slice다. Phase 3~8은 실행 시 각 역할 에이전트가 본 마스터 플랜을 기준으로 자기 영역의 상세 TDD 태스크 플랜(Phase 2 수준)으로 확장한다.
