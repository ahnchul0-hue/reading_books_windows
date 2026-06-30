import type { AppContext } from '../context'
import type { Category, TextItem, LeaderRow } from '../../shared/types'
import { activeDateSet, computeStreak, monthlyCalendar, lastNDaysMinutes } from '../../core/stats'
import { normalizeText } from '../../core/text'
import { showOptionsPopup, showPickMorePopup } from '../optionsPopup'
import { countableLength, msPerChar } from '../../core/cpm'

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

  const cats = await api.categories.list()
  const online = state.cloudUserId != null
  let texts: TextItem[]
  let statSessions: { startedAt: string; activeMs: number }[]
  if (online) {
    try {
      const ct = await api.cloud.textsList()
      texts = ct.map((t) => ({
        id: t.id,
        profileId: profile.id,
        title: t.title,
        body: t.body,
        createdAt: '',
        categoryId: cats.find((c) => c.name === t.category)?.id ?? null,
        category: cats.find((c) => c.name === t.category) ?? null,
      }))
      statSessions = await api.cloud.meSessions()
    } catch {
      texts = await api.texts.list(profile.id)
      statSessions = (await api.session.recent(profile.id)).map((s) => ({ startedAt: s.startedAt, activeMs: s.activeMs }))
    }
  } else {
    texts = await api.texts.list(profile.id)
    statSessions = (await api.session.recent(profile.id)).map((s) => ({ startedAt: s.startedAt, activeMs: s.activeMs }))
  }

  // 이어서 읽기: 진행도(온라인=서버, 오프라인=로컬 상태)
  let progress: { textId: number; charsRead: number; title: string } | null = null
  if (online) {
    try {
      progress = await api.cloud.progressGet()
    } catch {
      progress = null
    }
  } else {
    const rs = await api.state.get(profile.id)
    if (rs && !rs.finished && rs.textId != null) {
      progress = {
        textId: rs.textId,
        charsRead: rs.charsRead,
        title: texts.find((t) => t.id === rs.textId)?.title ?? '',
      }
    }
  }
  const resumeText = progress ? texts.find((t) => t.id === progress!.textId) : undefined

  const now = new Date()
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const active = activeDateSet(statSessions.map((s) => s.startedAt))
  const streak = computeStreak(active, todayKey)
  const weekMin = lastNDaysMinutes(statSessions, todayKey, 7).reduce((a, b) => a + b.minutes, 0)
  const cal = monthlyCalendar(now.getFullYear(), now.getMonth(), active, todayKey)
  const cheer =
    streak > 0
      ? `🔥 ${streak}일째 이어가는 중이에요. 멋져요!`
      : '오늘 첫 걸음을 떼어 볼까요? 한 쪽이면 충분해요.'

  root.innerHTML = `
    <section class="screen">
      <div class="row-between">
        <h1>${profile.avatar ?? '🙂'} ${esc(profile.name)}</h1>
        <div class="row">
          <button class="btn" id="settings">⚙ 설정</button>
          <button class="btn" id="home">친구 바꾸기</button>
        </div>
      </div>
      <div class="main-actions">
        <button class="btn btn-primary btn-lg" id="resume"${resumeText ? '' : ' disabled'}>▶ 이어서 읽기<span class="sub">${resumeText ? esc(resumeText.title || '제목 없음') : '최근 읽던 글 없음'}</span></button>
        <button class="btn btn-lg" id="newread">＋ 새로 읽기</button>
      </div>
      <div class="dash-grid">
        <div class="stat"><div class="stat-num">🔥 ${streak}</div><div class="stat-lbl">연속 일수</div></div>
        <div class="stat"><div class="stat-num">${weekMin}<span class="unit">분</span></div><div class="stat-lbl">이번 주</div></div>
        <div class="stat"><div class="stat-num">${statSessions.length}<span class="unit">회</span></div><div class="stat-lbl">총 읽기</div></div>
      </div>
      <div class="panel">
        <div class="panel-title">${now.getFullYear()}년 ${now.getMonth() + 1}월</div>
        <div class="cal" id="cal"></div>
      </div>
      <p class="cheer">${cheer}</p>
      <div id="leader"></div>
      <div class="row-between">
        <h2>저장된 글</h2>
        <div class="row">
          <button class="btn" id="compose">＋ 글 저장</button>
          <button class="btn" id="open">📂 파일 열기</button>
        </div>
      </div>
      <div id="composer"></div>
      <div class="cat-tree" id="tree"></div>
    </section>`

  renderCalendar(root.querySelector('#cal') as HTMLElement, cal)
  void renderLeaderboard(root.querySelector('#leader') as HTMLElement, ctx)

  // 저장된 글: 카테고리 원형 트리
  const treeEl = root.querySelector('#tree') as HTMLElement
  renderTree(treeEl, texts, cats, ctx)

  // 이벤트
  ;(root.querySelector('#home') as HTMLElement).addEventListener('click', () => nav.toProfile())
  ;(root.querySelector('#settings') as HTMLElement).addEventListener('click', () => nav.toSettings())
  ;(root.querySelector('#newread') as HTMLElement).addEventListener('click', () => {
    treeEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  ;(root.querySelector('#resume') as HTMLElement).addEventListener('click', () => {
    if (!resumeText || !progress) return
    state.text = { id: resumeText.id, title: resumeText.title, body: resumeText.body }
    state.queue = []
    state.resumeChars = progress.charsRead
    nav.toReading()
  })
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

const METRICS = [
  { key: 'streak' as const, label: '연속일 🔥', unit: '일' },
  { key: 'weekMinutes' as const, label: '이번 주', unit: '분' },
  { key: 'totalChars' as const, label: '글자', unit: '자' },
  { key: 'completedCount' as const, label: '완독', unit: '권' },
]

async function renderLeaderboard(host: HTMLElement, ctx: AppContext): Promise<void> {
  let board: LeaderRow[] = []
  try {
    board = await ctx.api.cloud.leaderboard()
  } catch {
    return // 오프라인 → 표시 안 함
  }
  if (board.length === 0) return
  const meId = ctx.state.cloudUserId
  let metric: (typeof METRICS)[number]['key'] = 'weekMinutes'
  const medals = ['🥇', '🥈', '🥉']

  const draw = () => {
    const sorted = [...board].sort((a, b) => b[metric] - a[metric])
    const max = Math.max(1, ...sorted.map((r) => r[metric]))
    host.innerHTML = `<div class="panel">
        <div class="panel-title">🏆 친구들과 비교</div>
        <div class="row" id="lmetric"></div>
        <div id="lrows"></div>
        <div class="cheer" id="ldiff"></div>
      </div>`
    const mrow = host.querySelector('#lmetric') as HTMLElement
    for (const m of METRICS) {
      const b = document.createElement('button')
      b.className = 'cchip' + (m.key === metric ? ' selected' : '')
      b.textContent = m.label
      b.addEventListener('click', () => {
        metric = m.key
        draw()
      })
      mrow.appendChild(b)
    }
    const rows = host.querySelector('#lrows') as HTMLElement
    sorted.forEach((r, i) => {
      const me = r.userId === meId
      const div = document.createElement('div')
      div.className = 'leader-row' + (me ? ' me' : '')
      const rank = i < 3 ? medals[i] : `${i + 1}`
      const pct = Math.round((r[metric] / max) * 100)
      div.innerHTML = `<span class="lrank">${rank}</span><span class="lava">${r.avatar ?? '🙂'}</span><span class="lname"></span><span class="lbar"><span style="width:${pct}%"></span></span><span class="lval">${r[metric]}</span>`
      ;(div.querySelector('.lname') as HTMLElement).textContent = r.name + (me ? ' (나)' : '')
      rows.appendChild(div)
    })
    const diff = host.querySelector('#ldiff') as HTMLElement
    const meIdx = sorted.findIndex((r) => r.userId === meId)
    const unit = METRICS.find((m) => m.key === metric)!.unit
    if (meIdx === 0) diff.textContent = '🎉 1등이에요! 멋져요!'
    else if (meIdx > 0) {
      const above = sorted[meIdx - 1]
      diff.textContent = `한 칸 위 ${above.name}까지 ${above[metric] - sorted[meIdx][metric]}${unit} 남았어요. 조금만 더!`
    } else diff.textContent = ''
  }
  draw()
}

function renderTree(host: HTMLElement, texts: TextItem[], cats: Category[], ctx: AppContext): void {
  host.innerHTML = ''
  if (texts.length === 0) {
    host.innerHTML = `<p class="muted">글이 없어요. “＋ 글 저장” 또는 “파일 열기”로 추가해요.</p>`
    return
  }
  const groups: { name: string; emoji: string; color: string; items: TextItem[] }[] = []
  for (const c of cats) {
    const items = texts.filter((t) => (t.categoryId ?? null) === c.id)
    if (items.length) groups.push({ name: c.name, emoji: c.emoji, color: c.color, items })
  }
  const uncat = texts.filter((t) => (t.categoryId ?? null) === null)
  if (uncat.length) groups.push({ name: '기타', emoji: '✨', color: '#9ca3af', items: uncat })

  for (const g of groups) {
    const node = document.createElement('div')
    node.className = 'tree-node'
    const head = document.createElement('button')
    head.className = 'tree-head'
    head.innerHTML = `<span class="tree-circle"></span><span class="tree-emoji"></span><span class="tree-name"></span><span class="tree-count"></span><span class="tree-chev">▸</span>`
    ;(head.querySelector('.tree-circle') as HTMLElement).style.background = g.color
    ;(head.querySelector('.tree-emoji') as HTMLElement).textContent = g.emoji
    ;(head.querySelector('.tree-name') as HTMLElement).textContent = g.name
    ;(head.querySelector('.tree-count') as HTMLElement).textContent = `${g.items.length}개`
    const body = document.createElement('div')
    body.className = 'tree-body'
    body.style.display = 'none'
    let open = false
    head.addEventListener('click', () => {
      open = !open
      body.style.display = open ? 'block' : 'none'
      ;(head.querySelector('.tree-chev') as HTMLElement).textContent = open ? '▾' : '▸'
    })
    for (const t of g.items) {
      const item = document.createElement('div')
      item.className = 'tree-item'
      item.style.borderLeft = `5px solid ${g.color}`
      const title = document.createElement('div')
      title.className = 'tree-item-title'
      title.textContent = t.title || '(제목 없음)'
      const prev = document.createElement('div')
      prev.className = 'tree-item-prev'
      prev.textContent = t.body.slice(0, 50)
      item.append(title, prev)
      item.addEventListener('click', () => void startNewRead(ctx, t, texts))
      body.appendChild(item)
    }
    node.append(head, body)
    host.appendChild(node)
  }
}

async function startNewRead(ctx: AppContext, t: TextItem, texts: TextItem[]): Promise<void> {
  const { state, nav } = ctx
  state.text = { id: t.id, title: t.title, body: t.body }
  state.queue = []
  state.resumeChars = 0
  const go = await showOptionsPopup(ctx)
  if (!go) return
  // 글자수 vs 시간: 글이 짧으면 다음 글을 고르도록 안내
  const settings = state.settings
  if (settings) {
    const estMs = countableLength(t.body) * msPerChar(settings.speedMult)
    const timerMs = settings.timerMin * 60000
    if (estMs < timerMs * 0.9) {
      const remainSec = Math.round((timerMs - estMs) / 1000)
      const others = texts.filter((x) => x.id !== t.id)
      state.queue = await showPickMorePopup(ctx, others, remainSec)
    }
  }
  nav.toReading()
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
      // 서버에도 저장(베스트 에포트 — 오프라인이면 무시)
      const catName = cats.find((c) => c.id === catId)?.name ?? null
      try {
        await api.cloud.saveText(ttl, body, catName)
      } catch {
        /* 오프라인 */
      }
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
