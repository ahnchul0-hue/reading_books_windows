import React, { useState } from 'react'
import { SafeAreaView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { type CloudUser, type TextRow, type ReadOpts } from './src/api'
import { ThemeCtx, colorsFor } from './src/theme'
import { LoginScreen } from './src/screens/LoginScreen'
import { ServerScreen } from './src/screens/ServerScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { ReadScreen } from './src/screens/ReadScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'

const DEFAULT_OPTS: ReadOpts = { speedMult: 1.0, fontSize: 28, lineSpacing: 1.6 }

export type Nav = {
  toLogin: () => void
  toServer: () => void
  toHome: () => void
  toSettings: () => void
  toRead: (t: TextRow, opts: ReadOpts) => void
}

export default function App() {
  const [screen, setScreen] = useState<'login' | 'server' | 'home' | 'read' | 'settings'>('login')
  const [user, setUser] = useState<CloudUser | null>(null)
  const [text, setText] = useState<TextRow | null>(null)
  const [opts, setOpts] = useState<ReadOpts>(DEFAULT_OPTS)
  const [theme, setTheme] = useState<string>('dark')

  const nav: Nav = {
    toLogin: () => setScreen('login'),
    toServer: () => setScreen('server'),
    toHome: () => setScreen('home'),
    toSettings: () => setScreen('settings'),
    toRead: (t, o) => {
      setText(t)
      setOpts(o)
      setScreen('read')
    },
  }

  const colors = colorsFor(theme)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      <ThemeCtx.Provider value={colors}>
        {screen === 'login' && (
          <LoginScreen
            nav={nav}
            onLogin={(u) => {
              setUser(u)
              nav.toHome()
            }}
          />
        )}
        {screen === 'server' && <ServerScreen nav={nav} />}
        {screen === 'home' && user && <HomeScreen nav={nav} user={user} onTheme={setTheme} />}
        {screen === 'settings' && user && <SettingsScreen nav={nav} theme={theme} setTheme={setTheme} />}
        {screen === 'read' && text && <ReadScreen nav={nav} text={text} opts={opts} />}
      </ThemeCtx.Provider>
    </SafeAreaView>
  )
}
