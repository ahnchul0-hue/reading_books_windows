import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { api, COLORS } from '../api'
import type { Nav } from '../../App'

export function ServerScreen({ nav }: { nav: Nav }) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    api.getUrl().then(setUrl)
  }, [])

  const test = async () => {
    setStatus('확인 중…')
    await api.setUrl(url.trim())
    try {
      await api.health()
      setStatus('🟢 연결됨')
    } catch {
      setStatus('🔴 연결 안 됨')
    }
  }
  const save = async () => {
    await api.setUrl(url.trim())
    nav.toLogin()
  }

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>⚙ 서버 설정</Text>
      <Text style={s.muted}>같은 와이파이에 있는 컴퓨터(서버) 주소를 넣어요.</Text>
      <TextInput
        style={s.input}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="http://192.168.0.10:4000"
        placeholderTextColor={COLORS.muted}
      />
      <View style={s.row}>
        <TouchableOpacity style={s.btn} onPress={test}>
          <Text style={s.btnT}>연결 테스트</Text>
        </TouchableOpacity>
        <Text style={s.muted}>{status}</Text>
      </View>
      <View style={s.row}>
        <TouchableOpacity style={s.btn} onPress={() => nav.toLogin()}>
          <Text style={s.btnT}>← 뒤로</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.primary]} onPress={save}>
          <Text style={[s.btnT, { color: '#fff' }]}>저장</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 24, gap: 16 },
  h1: { color: COLORS.fg, fontSize: 28, fontWeight: '800' },
  muted: { color: COLORS.muted, fontSize: 15 },
  input: {
    backgroundColor: COLORS.panel,
    color: COLORS.fg,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: { backgroundColor: COLORS.panel, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18 },
  btnT: { color: COLORS.fg, fontSize: 16, fontWeight: '700' },
  primary: { backgroundColor: COLORS.accent },
})
