import './styles.css'
import { applyTheme } from './theme'
import type { AppContext, AppState, Nav } from './context'
import { renderProfileScreen } from './screens/ProfileScreen'
import { renderStartScreen } from './screens/StartScreen'
import { renderReadingScreen } from './screens/ReadingScreen'
import { renderEndScreen } from './screens/EndScreen'

const root = document.getElementById('app')!
const state: AppState = {}

const nav: Nav = {
  toProfile: () => void renderProfileScreen(ctx),
  toStart: () => void renderStartScreen(ctx),
  toReading: () => void renderReadingScreen(ctx),
  toEnd: () => void renderEndScreen(ctx),
}

const ctx: AppContext = { root, api: window.api, state, nav }

applyTheme('dark') // v2: 기본 어둡게
nav.toProfile()
