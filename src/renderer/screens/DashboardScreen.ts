import type { AppContext } from '../context'
import type { Category, TextItem } from '../../shared/types'
import { activeDateSet, computeStreak, monthlyCalendar, lastNDaysMinutes } from '../../core/stats'
import { normalizeText } from '../../core/text'

const pad = (n: number) => String(n).padStart(2, '0')
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const SWATCHES = ['#a78bfa', '#34d399', '#fb923c', '#d4a373', '#f472b6', '#60a5fa', '#f87171', '#22d3ee', '#facc15']
const EMOJIS = ['📖', '🔬', '🐾', '🏰', '🎵', '✏️', '🚀', '🌳', '🍎', '⚽', '🎨', '🦕']

export async function renderDashboardScreen(ctx: AppContext): Promise<void> {
  const { root, api, state, nav } = ctx
  const profile = state.profile
  if (!profile) {
    nav.toProfile()
    return
  }

  const [sessions, texts, cats] = await Promise.all([
    api.session.recent(profile.id),
    api.texts.list(profile.id),
    api.categories.list(),
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
      <div class="cat-filter" id="filter"></div>
      <div id="composer"></div>
      <div class="text-grid" id="texts"></div>
    </section>`

  renderCalendar(root.querySelector('#cal') as HTMLElement, cal)

  // 카테고리 필터 칩
  let filterId: number | null = null
  const filterEl = root.querySelector('#filter') as HTMLElement
  const textsEl = root.querySelector('#texts') as HTMLElement
  const drawFilter = () => {
    filterEl.innerHTML = ''
    const all = chip('전체', '', filterId === null, () => {
      filterId = null
      drawFilter()
      renderTexts(textsEl, texts, filterId, ctx)
    })
    filterEl.appendChild(all)
    for (const c of cats) {
      const used = texts.some((t) => (t.categoryId ?? null) === c.id)
      if (!used) continue
      const el = chip(`${c.emoji} ${c.name}`, c.color, filterId === c.id, () => {
        filterId = c.id
        drawFilter()
        renderTexts(textsEl, texts, filterId, ctx)
      })
      filterEl.appendChild(el)
    }
  }
  drawFilter()
  renderTexts(textsEl, texts, filterId, ctx)

  // 이벤트
  ;(root.querySelector('#home') as HTMLElement).addEventListener('click', () => nav.toProfile())
  ;(root.querySelector('#start') as HTMLElement).addEventListener('click', () => nav.toStart())
  const composerEl = root.querySelector('#composer') as HTMLElement
  ;(root.querySelector('#compose') as HTMLElement).addEventListener('click', () =>
    openComposer(ctx, composerEl, cats, { title: '', body: '' }),
  )
  ;(root.querySelector('#open') as HTMLElement).addEventListener('click', async () => {
    const res = await api.texts.importTxt()
    if (!res) return
    openComposer(ctx, composerEl, cats, res) // 파일 내용을 작성칸에 채워 카테고리 고르기
  })
}

function renderCalendar(calEl: HTMLElement, cal: ReturnType<typeof monthlyCalendar>): void {
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
      } else c.classList.add('empty')
      row.appendChild(c)
    }
    calEl.appendChild(row)
  }
}

function renderTexts(
  grid: HTMLElement,
  texts: TextItem[],
  filterId: number | null,
  ctx: AppContext,
): void {
  const { state, nav } = ctx
  grid.innerHTML = ''
  const shown = filterId === null ? texts : texts.filter((t) => (t.categoryId ?? null) === filterId)
  if (shown.length === 0) {
    grid.innerHTML = `<p class="muted">글이 없어요. “＋ 글 저장” 또는 “파일 열기”로 추가해요.</p>`
    return
  }
  for (const t of shown) {
    const color = t.category?.color ?? '#60a5fa'
    const emoji = t.category?.emoji ?? '✏️'
    const card = document.createElement('div')
    card.className = 'text-card'
    const thumb = document.createElement('div')
    thumb.className = 'text-thumb'
    thumb.style.borderTop = `5px solid ${color}`
    const badge = document.createElement('span')
    badge.className = 'cat-badge'
    badge.textContent = emoji
    const preview = document.createElement('div')
    preview.className = 'thumb-text'
    preview.textContent = t.body.slice(0, 60)
    thumb.append(badge, preview)
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

function openComposer(
  ctx: AppContext,
  host: HTMLElement,
  cats: Category[],
  init: { title: string; body: string },
): void {
  const { api, state, nav } = ctx
  let catId = cats.find((c) => c.name === '내 글')?.id ?? cats[0]?.id ?? 6

  const draw = () => {
    host.innerHTML = `
      <div class="panel">
        <input type="text" id="ctitle" placeholder="글 제목 (선택)" />
        <textarea id="cbody" placeholder="여기에 글을 붙여넣어요 (Ctrl+V)"></textarea>
        <label class="muted">어떤 종류의 글인가요?</label>
        <div class="cat-pick" id="cpick"></div>
        <div class="row">
          <button class="btn" id="ccancel">취소</button>
          <button class="btn btn-primary" id="csave">저장</button>
        </div>
      </div>`
    const titleEl = host.querySelector('#ctitle') as HTMLInputElement
    const bodyEl = host.querySelector('#cbody') as HTMLTextAreaElement
    titleEl.value = init.title
    bodyEl.value = init.body

    const pick = host.querySelector('#cpick') as HTMLElement
    for (const c of cats) {
      pick.appendChild(
        chip(`${c.emoji} ${c.name}`, c.color, c.id === catId, () => {
          catId = c.id
          init.title = titleEl.value
          init.body = bodyEl.value
          draw()
        }),
      )
    }
    // 부모용: 새 카테고리
    const addChip = chip('＋ 새 종류', '', false, () => {
      init.title = titleEl.value
      init.body = bodyEl.value
      openNewCategory(ctx, host, cats, init)
    })
    pick.appendChild(addChip)

    ;(host.querySelector('#ccancel') as HTMLElement).addEventListener('click', () => {
      host.innerHTML = ''
    })
    ;(host.querySelector('#csave') as HTMLElement).addEventListener('click', async () => {
      const body = normalizeText(bodyEl.value)
      if (!body || !state.profile) return
      const ttl = titleEl.value.trim() || body.split('\n')[0].slice(0, 20) || '내 글'
      await api.texts.save(state.profile.id, ttl, body, catId)
      host.innerHTML = ''
      void nav.toDashboard()
    })
    bodyEl.focus()
  }
  draw()
}

function openNewCategory(
  ctx: AppContext,
  host: HTMLElement,
  cats: Category[],
  init: { title: string; body: string },
): void {
  const { api } = ctx
  let emoji = EMOJIS[6]
  let color = SWATCHES[6]
  host.innerHTML = `
    <div class="panel">
      <div class="panel-title">새 카테고리 (부모)</div>
      <input type="text" id="cname" maxlength="8" placeholder="종류 이름 (예: 만화)" />
      <label class="muted">그림</label><div class="row" id="emojis"></div>
      <label class="muted">색</label><div class="row" id="colors"></div>
      <div class="row">
        <button class="btn" id="caback">취소</button>
        <button class="btn btn-primary" id="caadd">추가</button>
      </div>
    </div>`
  const emojiRow = host.querySelector('#emojis') as HTMLElement
  const colorRow = host.querySelector('#colors') as HTMLElement
  const ebtns: HTMLButtonElement[] = []
  for (const e of EMOJIS) {
    const b = chip(e, '', e === emoji, () => {
      emoji = e
      ebtns.forEach((x) => x.classList.toggle('selected', x === b))
    })
    ebtns.push(b)
    emojiRow.appendChild(b)
  }
  const cbtns: HTMLButtonElement[] = []
  for (const c of SWATCHES) {
    const b = document.createElement('button')
    b.className = 'swatch' + (c === color ? ' selected' : '')
    b.style.background = c
    b.addEventListener('click', () => {
      color = c
      cbtns.forEach((x) => x.classList.toggle('selected', x === b))
    })
    cbtns.push(b)
    colorRow.appendChild(b)
  }
  const name = host.querySelector('#cname') as HTMLInputElement
  ;(host.querySelector('#caback') as HTMLElement).addEventListener('click', () =>
    openComposer(ctx, host, cats, init),
  )
  ;(host.querySelector('#caadd') as HTMLElement).addEventListener('click', async () => {
    const nm = name.value.trim()
    if (!nm) {
      name.focus()
      return
    }
    const created = await api.categories.add(nm, emoji, color)
    cats.push(created)
    openComposer(ctx, host, cats, init)
  })
  name.focus()
}

function chip(label: string, color: string, selected: boolean, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.className = 'cchip' + (selected ? ' selected' : '')
  b.textContent = label
  if (color) {
    b.style.borderColor = color
    if (selected) {
      b.style.background = color
      b.style.color = '#10131a'
    }
  }
  b.addEventListener('click', onClick)
  return b
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
