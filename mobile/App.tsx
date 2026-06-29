import React, { useState } from 'react'
import { SafeAreaView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { COLORS, type CloudUser, type TextRow } from './src/api'
import { LoginScreen } from './src/screens/LoginScreen'
import { ServerScreen } from './src/screens/ServerScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { ReadScreen } from './src/screens/ReadScreen'

export type Nav = {
  toLogin: () => void
  toServer: () => void
  toHome: () => void
  toRead: (t: TextRow) => void
}

export default function App() {
  const [screen, setScreen] = useState<'login' | 'server' | 'home' | 'read'>('login')
  const [user, setUser] = useState<CloudUser | null>(null)
  const [text, setText] = useState<TextRow | null>(null)

  const nav: Nav = {
    toLogin: () => setScreen('login'),
    toServer: () => setScreen('server'),
    toHome: () => setScreen('home'),
    toRead: (t) => {
      setText(t)
      setScreen('read')
    },
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar style="light" />
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
      {screen === 'home' && user && <HomeScreen nav={nav} user={user} />}
      {screen === 'read' && text && <ReadScreen nav={nav} text={text} />}
    </SafeAreaView>
  )
}
