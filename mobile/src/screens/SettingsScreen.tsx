import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { api, type Settings } from '../api'
import { useColors, type Colors } from '../theme'
import { cue, setSoundPrefs } from '../sound'
import type { Nav } from '../../App'

const SPACINGS = [1.4, 1.6, 1.8, 2.0, 2.2]
const stepIn = (arr: number[], cur: number, dir: number) =>
  arr[Math.max(0, Math.min(arr.length - 1, arr.indexOf(cur) + dir))] ?? cur

export function SettingsScreen({
  nav,
  setTheme,
}: {
  nav: Nav
  theme: string
  setTheme: (t: string) => void
}) {
  const c = useColors()
  const s = makeStyles(c)
  const [st, setSt] = useState<Settings | null>(null)
  useEffect(() => {
    api.getSettings().then(setSt).catch(() => {})
  }, [])

  if (!st) {
    return (
      <View style={s.wrap}>
        <Text style={s.muted}>불러오는 중…</Text>
      </View>
    )
  }

  const update = (patch: Partial<Settings>) => {
    const next = { ...st, ...patch }
    setSt(next)
    setSoundPrefs(next.soundOn, next.hapticOn)
    if (patch.theme) setTheme(patch.theme)
    cue.select()
    void api.saveSettings(next).catch(() => {})
  }

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <View style={s.headerRow}>
        <Text style={s.h1}>⚙ 기본 설정</Text>
        <TouchableOpacity style={s.btn} onPress={() => nav.toHome()}>
          <Text style={s.btnT}>← 대시보드</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.muted}>여기서 정한 값이 기본으로 적용돼요. (읽기 시작할 때 또 바꿀 수 있어요.)</Text>

      <View style={s.row}>
        <Text style={s.label}>테마</Text>
        <TouchableOpacity style={[s.btn, s.val]} onPress={() => update({ theme: st.theme === 'dark' ? 'light' : 'dark' })}>
          <Text style={s.btnT}>{st.theme === 'dark' ? '🌙 어둡게' : '☀ 밝게'}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.row}>
        <Text style={s.label}>글자 크기</Text>
        <View style={s.stepper}>
          <TouchableOpacity style={s.btn} onPress={() => update({ fontPt: Math.max(20, st.fontPt - 2) })}>
            <Text style={s.btnT}>－</Text>
          </TouchableOpacity>
          <Text style={s.num}>{st.fontPt}pt</Text>
          <TouchableOpacity style={s.btn} onPress={() => update({ fontPt: Math.min(44, st.fontPt + 2) })}>
            <Text style={s.btnT}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.row}>
        <Text style={s.label}>줄 간격</Text>
        <View style={s.stepper}>
          <TouchableOpacity style={s.btn} onPress={() => update({ lineSpacing: stepIn(SPACINGS, st.lineSpacing, -1) })}>
            <Text style={s.btnT}>－</Text>
          </TouchableOpacity>
          <Text style={s.num}>{st.lineSpacing.toFixed(1)}</Text>
          <TouchableOpacity style={s.btn} onPress={() => update({ lineSpacing: stepIn(SPACINGS, st.lineSpacing, +1) })}>
            <Text style={s.btnT}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.row}>
        <Text style={s.label}>효과음</Text>
        <TouchableOpacity style={[s.btn, s.val]} onPress={() => update({ soundOn: !st.soundOn })}>
          <Text style={s.btnT}>{st.soundOn ? '🔔 켜짐' : '🔕 꺼짐'}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.row}>
        <Text style={s.label}>진동</Text>
        <TouchableOpacity style={[s.btn, s.val]} onPress={() => update({ hapticOn: !st.hapticOn })}>
          <Text style={s.btnT}>{st.hapticOn ? '📳 켜짐' : '꺼짐'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    wrap: { padding: 24, gap: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    h1: { color: c.fg, fontSize: 26, fontWeight: '800' },
    muted: { color: c.muted, fontSize: 14 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.panel,
      borderRadius: 14,
      padding: 16,
    },
    label: { color: c.fg, fontSize: 17, fontWeight: '700' },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    num: { color: c.fg, fontSize: 18, fontWeight: '800', minWidth: 56, textAlign: 'center' },
    val: { minWidth: 110, alignItems: 'center' },
    btn: { backgroundColor: c.bg, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
    btnT: { color: c.fg, fontSize: 16, fontWeight: '700' },
  })
