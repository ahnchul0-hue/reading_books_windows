import type { AppContext } from '../context'

export function renderEndScreen(ctx: AppContext): void {
  const { root, state, nav } = ctx
  const s = state.lastSummary
  const min = s ? Math.round(s.activeMs / 60000) : 0
  const sec = s ? Math.round((s.activeMs % 60000) / 1000) : 0

  root.innerHTML = `
    <section class="screen">
      <h1>오늘도 끝까지 읽었어요! 👏</h1>
      <div class="end-summary">
        <div class="big">잘했어요, ${escapeHtml(state.profile?.name ?? '친구')}!</div>
        <div>읽은 글자: <b>${s?.charsRead ?? 0}</b>자</div>
        <div>읽은 시간: <b>${min}분 ${sec}초</b></div>
        <div>도달한 쪽: <b>${s?.pageReached ?? 0}</b>쪽</div>
        <div>속도: <b>${(s?.speedMult ?? 1).toFixed(1)}×</b></div>
      </div>
      <div class="row">
        <button class="btn btn-primary btn-lg" id="again">다시 읽기</button>
        <button class="btn" id="dash">대시보드</button>
        <button class="btn" id="profile">친구 바꾸기</button>
      </div>
    </section>`

  ;(root.querySelector('#again') as HTMLElement).addEventListener('click', () => nav.toReading())
  ;(root.querySelector('#dash') as HTMLElement).addEventListener('click', () => nav.toDashboard())
  ;(root.querySelector('#profile') as HTMLElement).addEventListener('click', () => nav.toProfile())
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return map[c]
  })
}
