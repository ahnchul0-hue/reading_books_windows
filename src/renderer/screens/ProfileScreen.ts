import type { AppContext } from '../context'
import type { CloudUser } from '../../shared/types'
import { applyTheme } from '../theme'
import { showPinPad } from '../pinPad'
import { loadSettings } from '../settingsSync'

const AVATARS = ['🐰', '🦊', '🐼', '🐯', '🐸', '🐧', '🐬', '🦉', '🐱', '🐶']

export async function renderProfileScreen(ctx: AppContext): Promise<void> {
  ctx.state.text = undefined
  const online = await ctx.api.cloud.status().catch(() => false)
  if (online) return renderCloudHome(ctx)
  return renderLocalHome(ctx)
}

// 로그인 성공 → 로컬 프로필에 매핑(읽기 흐름/캐시는 로컬 사용)
async function loginAs(ctx: AppContext, user: CloudUser): Promise<void> {
  const { api, state, nav } = ctx
  const locals = await api.profiles.list()
  const lp = locals.find((p) => p.name === user.name) ?? (await api.profiles.create(user.name, user.avatar))
  state.profile = lp
  state.cloudUserId = user.id
  state.settings = await loadSettings(ctx) // 온라인이면 서버 설정 기준
  applyTheme(state.settings.theme)
  nav.toDashboard()
}

// --- 서버 연결됨: 사용자 선택 + PIN 로그인 ---
async function renderCloudHome(ctx: AppContext): Promise<void> {
  const { root, api } = ctx
  const users = await api.cloud.users().catch(() => [] as CloudUser[])

  root.innerHTML = `
    <section class="screen">
      <div class="row-between">
        <h1>📖 읽기 친구들</h1>
        <div class="row">
          <button class="btn" id="settings">⚙ 서버</button>
          <button class="btn btn-primary" id="add">＋ 새 사용자</button>
        </div>
      </div>
      <p class="muted">친구를 고르고 비밀번호(4자리)를 눌러요. 🟢 서버 연결됨 — 친구들과 비교할 수 있어요.</p>
      <div class="cards" id="cards"></div>
    </section>`

  const cards = root.querySelector('#cards') as HTMLElement
  ;(root.querySelector('#add') as HTMLElement).addEventListener('click', () => renderNewCloudUser(ctx))
  ;(root.querySelector('#settings') as HTMLElement).addEventListener('click', () =>
    renderServerSettings(ctx),
  )

  if (users.length === 0) {
    cards.innerHTML = `<p class="muted">오른쪽 위 “＋ 새 사용자”로 첫 친구를 만들어요.</p>`
  }
  for (const u of users) {
    const card = document.createElement('div')
    card.className = 'card'
    card.innerHTML = `<div class="avatar"></div><div class="name"></div>`
    ;(card.querySelector('.avatar') as HTMLElement).textContent = u.avatar ?? '🙂'
    ;(card.querySelector('.name') as HTMLElement).textContent = u.name
    card.addEventListener('click', async () => {
      const pin = await showPinPad(`${u.name}의 비밀번호`)
      if (!pin) return
      try {
        const auth = await api.cloud.login(u.id, pin)
        await loginAs(ctx, auth.user)
      } catch {
        alert('비밀번호가 달라요. 다시 해 볼까요?')
      }
    })
    cards.appendChild(card)
  }
}

function renderNewCloudUser(ctx: AppContext): void {
  const { root, api } = ctx
  let chosen = AVATARS[0]
  root.innerHTML = `
    <section class="screen">
      <h1>새 친구 만들기</h1>
      <div class="option-group"><label>별명</label>
        <input type="text" id="nick" maxlength="12" placeholder="별명을 적어요" /></div>
      <div class="option-group"><label>그림 고르기</label><div class="row" id="avatars"></div></div>
      <div class="row">
        <button class="btn" id="cancel">취소</button>
        <button class="btn btn-primary" id="save">다음 (비밀번호 정하기)</button>
      </div>
    </section>`
  const avatarsRow = root.querySelector('#avatars') as HTMLElement
  const chips: HTMLButtonElement[] = []
  for (const a of AVATARS) {
    const chip = document.createElement('button')
    chip.className = 'chip' + (a === chosen ? ' selected' : '')
    chip.style.fontSize = '1.8rem'
    chip.textContent = a
    chip.addEventListener('click', () => {
      chosen = a
      chips.forEach((c) => c.classList.toggle('selected', c === chip))
    })
    chips.push(chip)
    avatarsRow.appendChild(chip)
  }
  const nick = root.querySelector('#nick') as HTMLInputElement
  ;(root.querySelector('#cancel') as HTMLElement).addEventListener('click', () => renderProfileScreen(ctx))
  ;(root.querySelector('#save') as HTMLElement).addEventListener('click', async () => {
    const name = nick.value.trim()
    if (!name) {
      nick.focus()
      return
    }
    const pin = await showPinPad('새 비밀번호 4자리')
    if (!pin) return
    const pin2 = await showPinPad('한 번 더 확인')
    if (pin2 !== pin) {
      alert('비밀번호가 서로 달라요. 다시 만들어요.')
      return
    }
    try {
      const auth = await api.cloud.register(name, chosen, pin)
      await loginAs(ctx, auth.user)
    } catch {
      alert('만들기에 실패했어요. 잠시 후 다시 해 주세요.')
    }
  })
  nick.focus()
}

// --- 서버 주소 설정 ---
async function renderServerSettings(ctx: AppContext): Promise<void> {
  const { root, api } = ctx
  const url = await api.cloud.getUrl()
  root.innerHTML = `
    <section class="screen">
      <h1>⚙ 서버 설정</h1>
      <p class="muted">친구들과 비교하려면 같은 서버 주소를 써요. 다른 기기에서는 이 컴퓨터의 주소를 넣어요.</p>
      <div class="option-group">
        <label>서버 주소</label>
        <input type="text" id="surl" placeholder="http://192.168.0.10:4000" />
      </div>
      <div class="row">
        <button class="btn" id="test">연결 테스트</button>
        <span id="tstat" class="muted"></span>
      </div>
      <div class="row">
        <button class="btn" id="back">← 뒤로</button>
        <button class="btn btn-primary" id="save">저장</button>
      </div>
    </section>`
  const input = root.querySelector('#surl') as HTMLInputElement
  input.value = url
  const stat = root.querySelector('#tstat') as HTMLElement
  ;(root.querySelector('#test') as HTMLElement).addEventListener('click', async () => {
    stat.textContent = '확인 중…'
    await api.cloud.setUrl(input.value.trim())
    const ok = await api.cloud.status().catch(() => false)
    stat.textContent = ok ? '🟢 연결됨' : '🔴 연결 안 됨'
  })
  ;(root.querySelector('#back') as HTMLElement).addEventListener('click', () => renderProfileScreen(ctx))
  ;(root.querySelector('#save') as HTMLElement).addEventListener('click', async () => {
    await api.cloud.setUrl(input.value.trim())
    void renderProfileScreen(ctx)
  })
  input.focus()
}

// --- 서버 미연결: 로컬 모드(기존 동작) ---
async function renderLocalHome(ctx: AppContext): Promise<void> {
  const { root, api, state, nav } = ctx
  const profiles = await api.profiles.list()
  root.innerHTML = `
    <section class="screen">
      <div class="row-between">
        <h1>📖 읽기 친구들</h1>
        <div class="row">
          <button class="btn" id="settings">⚙ 서버</button>
          <button class="btn btn-primary" id="add">＋ 새 사용자</button>
        </div>
      </div>
      <p class="muted">⚪ 오프라인 모드 — 기록은 이 컴퓨터에만 저장돼요. (서버에 연결되면 친구와 비교돼요.)</p>
      <div class="cards" id="cards"></div>
    </section>`
  const cards = root.querySelector('#cards') as HTMLElement
  ;(root.querySelector('#add') as HTMLElement).addEventListener('click', () => renderLocalNewProfile(ctx))
  ;(root.querySelector('#settings') as HTMLElement).addEventListener('click', () =>
    renderServerSettings(ctx),
  )
  if (profiles.length === 0) {
    cards.innerHTML = `<p class="muted">오른쪽 위 “＋ 새 사용자”로 첫 친구를 만들어요.</p>`
  }
  for (const p of profiles) {
    const card = document.createElement('div')
    card.className = 'card'
    card.innerHTML = `<button class="del" title="지우기">✕</button><div class="avatar"></div><div class="name"></div>`
    ;(card.querySelector('.avatar') as HTMLElement).textContent = p.avatar ?? '🙂'
    ;(card.querySelector('.name') as HTMLElement).textContent = p.name
    card.addEventListener('click', async () => {
      state.profile = p
      state.cloudUserId = undefined
      state.settings = await api.settings.get(p.id)
      applyTheme(state.settings.theme)
      nav.toDashboard()
    })
    ;(card.querySelector('.del') as HTMLElement).addEventListener('click', async (e) => {
      e.stopPropagation()
      if (confirm(`'${p.name}' 친구의 글·기록이 모두 지워져요. 지울까요?`)) {
        await api.profiles.remove(p.id)
        void renderLocalHome(ctx)
      }
    })
    cards.appendChild(card)
  }
}

function renderLocalNewProfile(ctx: AppContext): void {
  const { root, api } = ctx
  let chosen = AVATARS[0]
  root.innerHTML = `
    <section class="screen">
      <h1>새 친구 만들기</h1>
      <div class="option-group"><label>별명</label>
        <input type="text" id="nick" maxlength="12" placeholder="별명을 적어요" /></div>
      <div class="option-group"><label>그림 고르기</label><div class="row" id="avatars"></div></div>
      <div class="row">
        <button class="btn" id="cancel">취소</button>
        <button class="btn btn-primary" id="save">만들기</button>
      </div>
    </section>`
  const avatarsRow = root.querySelector('#avatars') as HTMLElement
  const chips: HTMLButtonElement[] = []
  for (const a of AVATARS) {
    const chip = document.createElement('button')
    chip.className = 'chip' + (a === chosen ? ' selected' : '')
    chip.style.fontSize = '1.8rem'
    chip.textContent = a
    chip.addEventListener('click', () => {
      chosen = a
      chips.forEach((c) => c.classList.toggle('selected', c === chip))
    })
    chips.push(chip)
    avatarsRow.appendChild(chip)
  }
  const nick = root.querySelector('#nick') as HTMLInputElement
  ;(root.querySelector('#cancel') as HTMLElement).addEventListener('click', () => renderLocalHome(ctx))
  ;(root.querySelector('#save') as HTMLElement).addEventListener('click', async () => {
    const name = nick.value.trim()
    if (!name) {
      nick.focus()
      return
    }
    await api.profiles.create(name, chosen)
    void renderLocalHome(ctx)
  })
  nick.focus()
}
