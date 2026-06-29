import type { AppContext } from './context'
import type { Settings } from '../shared/types'

/** 설정 로드: 온라인이면 서버 기준, 아니면 로컬. */
export async function loadSettings(ctx: AppContext): Promise<Settings> {
  if (ctx.state.cloudUserId != null) {
    try {
      return await ctx.api.cloud.settingsGet()
    } catch {
      /* 서버 실패 → 로컬 폴백 */
    }
  }
  return ctx.api.settings.get(ctx.state.profile!.id)
}

/** 설정 저장: 로컬(캐시) + 온라인이면 서버. */
export function saveSettings(ctx: AppContext): void {
  const s = ctx.state.settings
  const p = ctx.state.profile
  if (!s || !p) return
  void ctx.api.settings.set(p.id, s)
  if (ctx.state.cloudUserId != null) void ctx.api.cloud.settingsSave(s).catch(() => {})
}
