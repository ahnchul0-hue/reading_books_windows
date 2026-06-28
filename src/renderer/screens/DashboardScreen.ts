import type { AppContext } from '../context'
import type { TextItem } from '../../shared/types'
import { activeDateSet, computeStreak, monthlyCalendar, lastNDaysMinutes } from '../../core/stats'
import { normalizeText } from '../../core/text'

const pad = (n: number) => String(n).padStart(2, '0')
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export async function renderDashboardScreen(ctx: AppContext): Promise<void> {
  const { root, api, state, nav } = ctx
  const profile = state.profile
  if (!profile) {
    nav.toProfile()
    return
  }

  const [sessions, texts] = await Promise.all([
    api.session.recent(profile.id),
    api.texts.list(profile.id),
  ])

  const now = new Date()
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const active = activeDateSet(sessions.map((s) => s.startedAt))
  const streak = computeStreak(active, todayKey)
  const weekMin = lastNDaysMinutes(
    sessions.map((s) => ({ startedAt: s.startedAt, activeMs: s.activeMs })),
    todayKey,
    7,
  ).reduce((a, b) => a + b.minutes, 0)
  const cal = monthlyCalendar(now.getFullYear(), now.getMonth(), active, todayKey)

  const cheer =
    streak > 0
      ? `🔥 ${streak}일째 이어가는 중이에요. 멋져요!`
      : '오늘 첫 걸음을 떼어 볼까요? 한 쪽이면 충분해요.'

  root.innerHTML = `
    <section class="screen">
      <div class="row-between">
        <h1>${profile.avatar ?? '🙂'} ${esc(profile.name)}</h1>
        <button class="btn" id="home">친구 바꾸기</button>
      </div>

      <button class="btn btn-primary btn-lg" id="start">▶ 읽기 시작</button>

      <div class="dash-grid">
        <div class="stat"><div class="stat-num">🔥 ${streak}</div><div class="stat-lbl">연속 일수</div></div>
        <div class="stat"><div class="stat-num">${weekMin}<span class="unit">분</span></div><div class="stat-lbl">이번 주</div></div>
        <div class="stat"><div class="stat-num">${sessions.length}<span class="unit">회</span></div><div class="stat-lbl">총 읽기</div></div>
      </div>

      <div class="panel">
        <div class="panel-title">${now.getFullYear()}년 ${now.getMonth() + 1}월</div>
        <div class="cal" id="cal"></div>
      </div>

      <p class="cheer">${cheer}</p>

      <div class="row-between">
        <h2>저장된 글</h2>
        <div class="row">
          <button class="btn" id="compose">＋ 글 저장</button>
          <button class="btn" id="open">📂 파일 열기</button>
        </div>
      </div>
      <div id="composer"></div>
      <div class="text-grid" id="texts"></div>
    </section>`

  // 캘린더 렌더
  const calEl = root.querySelector('#cal') as HTMLElement
  const head = document.createElement('div')
  head.className = 'cal-row cal-head'
  for (const w of WEEKDAYS) {
    const c = document.createElement('div')
    c.className = 'cal-cell'
    c.textContent = w
    head.appendChild(c)
  }
  calEl.appendChild(head)
  for (const week of cal) {
    const row = document.createElement('div')
    row.className = 'cal-row'
    for (const cell of week) {
      const c = document.createElement('div')
      c.className = 'cal-cell'
      if (cell) {
        c.textContent = String(cell.day)
        if (cell.active) c.classList.add('done')
        if (cell.isToday) c.classList.add('today')
      } else {
        c.classList.add('empty')
      }
      row.appendChild(c)
    }
    calEl.appendChild(row)
  }

  // 저장된 글 그리드
  renderTexts(root.querySelector('#texts') as HTMLElement, texts, ctx)

  // 이벤트
  ;(root.querySelector('#home') as HTMLElement).addEventListener('click', () => nav.toProfile())
  ;(root.querySelector('#start') as HTMLElement).addEventListener('click', () => nav.toStart())
  ;(root.querySelector('#open') as HTMLElement).addEventListener('click', async () => {
    const res = await api.texts.importTxt()
    if (!res) return
    await api.texts.save(profile.id, res.title, res.body)
    void renderDashboardScreen(ctx)
  })
  ;(root.querySelector('#compose') as HTMLElement).addEventListener('click', () =>
    toggleComposer(root.querySelector('#composer') as HTMLElement, ctx),
  )
}

function renderTexts(grid: HTMLElement, texts: TextItem[], ctx: AppContext): void {
  const { state, nav } = ctx
  grid.innerHTML = ''
  if (texts.length === 0) {
    grid.innerHTML = `<p class="muted">아직 저장된 글이 없어요. “＋ 글 저장” 또는 “파일 열기”로 추가해요.</p>`
    return
  }
  for (const t of texts) {
    const card = document.createElement('div')
    card.className = 'text-card'
    const thumb = document.createElement('div')
    thumb.className = 'text-thumb'
    thumb.textContent = t.body.slice(0, 60)
    const title = document.createElement('div')
    title.className = 'text-title'
    title.textContent = t.title || '(제목 없음)'
    card.append(thumb, title)
    card.addEventListener('click', () => {
      state.text = { id: t.id, title: t.title, body: t.body }
      nav.toStart()
    })
    grid.appendChild(card)
  }
}

function toggleComposer(host: HTMLElement, ctx: AppContext): void {
  const { api, state } = ctx
  if (host.dataset.open === '1') {
    host.dataset.open = '0'
    host.innerHTML = ''
    return
  }
  host.dataset.open = '1'
  host.innerHTML = `
    <div class="panel">
      <input type="text" id="ctitle" placeholder="글 제목 (선택)" />
      <textarea id="cbody" placeholder="여기에 글을 붙여넣어요 (Ctrl+V)"></textarea>
      <div class="row">
        <button class="btn" id="ccancel">취소</button>
        <button class="btn btn-primary" id="csave">저장</button>
      </div>
    </div>`
  const title = host.querySelector('#ctitle') as HTMLInputElement
  const body = host.querySelector('#cbody') as HTMLTextAreaElement
  ;(host.querySelector('#ccancel') as HTMLElement).addEventListener('click', () => {
    host.dataset.open = '0'
    host.innerHTML = ''
  })
  ;(host.querySelector('#csave') as HTMLElement).addEventListener('click', async () => {
    const text = normalizeText(body.value)
    if (!text || !state.profile) return
    const ttl = title.value.trim() || text.split('\n')[0].slice(0, 20) || '내 글'
    await api.texts.save(state.profile.id, ttl, text)
    void renderDashboardScreen(ctx)
  })
  body.focus()
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const m: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return m[c]
  })
}
