import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { api, COLORS, type TextRow } from '../api'
import type { Nav } from '../../App'

const countable = (s: string) => [...s].filter((c) => !/\s/.test(c)).length
const MS_PER_CHAR = 150 // 1.0배 = 분당 400자

export function ReadScreen({ nav, text }: { nav: Nav; text: TextRow }) {
  const chunks = text.body.split(/(?<=[.?!…])\s+/).filter((c) => c.trim().length > 0)
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [done, setDone] = useState(false)
  const startedAt = useRef(new Date().toISOString())
  const activeMs = useRef(0)
  const charsRead = useRef(0)

  const finish = async () => {
    setDone(true)
    try {
      await api.uploadSession({
        activeMs: activeMs.current,
        charsRead: charsRead.current,
        completed: true,
        startedAt: startedAt.current,
      })
    } catch {
      /* 오프라인 */
    }
  }

  useEffect(() => {
    if (!playing || done) return
    if (idx >= chunks.length) {
      void finish()
      return
    }
    const dur = countable(chunks[idx]) * MS_PER_CHAR + 300
    const t = setTimeout(() => {
      activeMs.current += dur
      charsRead.current += countable(chunks[idx])
      setIdx((i) => i + 1)
    }, dur)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, playing, done])

  if (done) {
    return (
      <View style={s.wrap}>
        <Text style={s.h1}>다 읽었어요! 👏</Text>
        <Text style={s.muted}>
          읽은 글자 {charsRead.current}자 · {Math.round(activeMs.current / 60000)}분
        </Text>
        <TouchableOpacity style={[s.btn, s.primary]} onPress={() => nav.toHome()}>
          <Text style={[s.btnT, { color: '#fff' }]}>대시보드로</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={s.wrap}>
      <View style={s.topRow}>
        <Text style={s.muted}>
          {Math.min(idx + 1, chunks.length)} / {chunks.length}
        </Text>
        <TouchableOpacity onPress={() => nav.toHome()}>
          <Text style={s.muted}>끝내기</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={s.box} contentContainerStyle={{ padding: 16 }}>
        <Text style={s.bodyText}>
          {chunks.map((c, i) => (
            <Text key={i} style={i === idx ? s.cur : s.dim}>
              {c}{' '}
            </Text>
          ))}
        </Text>
      </ScrollView>
      <TouchableOpacity style={[s.btn, s.primary]} onPress={() => setPlaying((p) => !p)}>
        <Text style={[s.btnT, { color: '#fff' }]}>{playing ? '⏸ 잠깐 멈춤' : '▶ 계속'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 24, gap: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  h1: { color: COLORS.fg, fontSize: 26, fontWeight: '800' },
  muted: { color: COLORS.muted, fontSize: 15 },
  box: { flex: 1, backgroundColor: COLORS.panel, borderRadius: 16 },
  bodyText: { fontSize: 26, lineHeight: 44 },
  cur: { color: COLORS.fg, backgroundColor: 'rgba(240,198,116,0.35)' },
  dim: { color: COLORS.muted },
  btn: { backgroundColor: COLORS.panel, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnT: { color: COLORS.fg, fontSize: 17, fontWeight: '800' },
  primary: { backgroundColor: COLORS.accent },
})
