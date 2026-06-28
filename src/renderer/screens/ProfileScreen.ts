import type { AppContext } from '../context'
import { applyTheme } from '../theme'

const AVATARS = ['🐰', '🦊', '🐼', '🐯', '🐸', '🐧', '🐬', '🦉', '🐱', '🐶']

export async function renderProfileScreen(ctx: AppContext): Promise<void> {
  const { root, api, state, nav } = ctx
  state.text = undefined
  const profiles = await api.profiles.list()

  root.innerHTML = `
    <section class="screen">
      <h1>누구인가요?</h1>
      <p class="muted">별명과 그림으로 친구를 구분해요. 모든 기록은 이 컴퓨터에만 저장되고 밖으로 나가지 않아요.</p>
      <div class="cards" id="cards"></div>
    </section>`

  const cards = root.querySelector('#cards') as HTMLElement

  for (const p of profiles) {
    const card = document.createElement('div')
    card.className = 'card'
    card.innerHTML = `
      <button class="del" title="이 친구 지우기">✕</button>
      <div class="avatar"></div>
      <div class="name"></div>`
    ;(card.querySelector('.avatar') as HTMLElement).textContent = p.avatar ?? '🙂'
    ;(card.querySelector('.name') as HTMLElement).textContent = p.name

    card.addEventListener('click', async () => {
      state.profile = p
      state.settings = await api.settings.get(p.id)
      applyTheme(state.settings.theme)
      nav.toStart()
    })
    ;(card.querySelector('.del') as HTMLElement).addEventListener('click', async (e) => {
      e.stopPropagation()
      if (confirm(`'${p.name}' 친구의 글·기록이 모두 지워져요. 지울까요?`)) {
        await api.profiles.remove(p.id)
        void renderProfileScreen(ctx)
      }
    })
    cards.appendChild(card)
  }

  const add = document.createElement('div')
  add.className = 'card'
  add.innerHTML = `<div class="avatar">➕</div><div class="name">새 친구</div>`
  add.addEventListener('click', () => renderNewProfileForm(ctx))
  cards.appendChild(add)
}

function renderNewProfileForm(ctx: AppContext): void {
  const { root, api } = ctx
  let chosen = AVATARS[0]

  root.innerHTML = `
    <section class="screen">
      <h1>새 친구 만들기</h1>
      <div class="option-group">
        <label>별명</label>
        <input type="text" id="nick" maxlength="12" placeholder="별명을 적어요" />
      </div>
      <div class="option-group">
        <label>그림 고르기</label>
        <div class="row" id="avatars"></div>
      </div>
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
  ;(root.querySelector('#cancel') as HTMLElement).addEventListener('click', () =>
    renderProfileScreen(ctx),
  )
  ;(root.querySelector('#save') as HTMLElement).addEventListener('click', async () => {
    const name = nick.value.trim()
    if (!name) {
      nick.focus()
      return
    }
    await api.profiles.create(name, chosen)
    void renderProfileScreen(ctx)
  })
  nick.focus()
}
