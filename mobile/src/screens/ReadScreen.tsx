import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native'
import { api, COLORS, type TextRow, type ReadOpts } from '../api'
import { cue } from '../sound'
import type { Nav } from '../../App'

const countable = (s: string) => [...s].filter((c) => !/\s/.test(c)).length

// 글을 화면 폭에 맞춰 줄로 나눔(어절 경계, 공백 제외 글자수 기준)
function wrap(text: string, maxChars: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    if (!words.length) continue
    let cur: string[] = []
    let n = 0
    for (const w of words) {
      const wl = countable(w)
      if (cur.length && n + wl > maxChars) {
        out.push(cur.join(' '))
        cur = []
        n = 0
      }
      cur.push(w)
      n += wl
    }
    if (cur.length) out.push(cur.join(' '))
  }
  return out
}

export function ReadScreen({ nav, text, opts }: { nav: Nav; text: TextRow; opts: ReadOpts }) {
  const fontSize = opts.fontSize
  const lineH = Math.round(fontSize * (opts.lineSpacing || 1.6))
  const charW = fontSize // 한글 한 글자 폭 근사
  const barW = 2 * charW // 약 2글자
  const msPerChar = 60000 / (400 * opts.speedMult)

  const [cw, setCw] = useState(0)
  const lines = useMemo(
    () => (cw ? wrap(text.body, Math.max(4, Math.floor((cw - 32) / charW))) : []),
    [cw, charW, text.body],
  )
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)
  const resumedRef = useRef(false)

  const barX = useRef(new Animated.Value(0)).current
  const anim = useRef<Animated.CompositeAnimation | null>(null)
  const activeMs = useRef(0)
  const charsRead = useRef(0)
  const startedAt = useRef(new Date().toISOString())
  const scrollRef = useRef<ScrollView>(null)

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
    try {
      await api.saveProgress({ textId: null }) // 완독 → 이어읽기 비움
    } catch {
      /* 오프라인 */
    }
    cue.end() // 끝(완독) 효과음
  }

  const exitSave = async () => {
    try {
      await api.saveProgress({ textId: text.id, charsRead: charsRead.current, title: text.title })
    } catch {
      /* 오프라인 */
    }
    nav.toHome()
  }

  // 이어읽기: 저장된 글자수까지 건너뛰고 시작
  useEffect(() => {
    if (resumedRef.current || lines.length === 0) return
    resumedRef.current = true
    const target = opts.resumeChars ?? 0
    if (target > 0) {
      let acc = 0
      let start = 0
      for (let i = 0; i < lines.length; i++) {
        const c = countable(lines[i])
        if (acc + c > target) {
          start = i
          break
        }
        acc += c
        start = Math.min(i + 1, lines.length - 1)
      }
      charsRead.current = acc
      setIdx(start)
    }
    setReady(true)
    cue.start() // 시작 효과음

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length])

  useEffect(() => {
    if (!ready || !playing || done || lines.length === 0 || cw === 0) return
    if (idx >= lines.length) {
      void finish()
      return
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, idx * lineH - lineH), animated: true })
    barX.setValue(0)
    const dur = Math.max(400, countable(lines[idx]) * msPerChar)
    const range = Math.max(0, cw - 32 - barW)
    anim.current = Animated.timing(barX, { toValue: range, duration: dur, useNativeDriver: true })
    anim.current.start(({ finished }) => {
      if (finished) {
        activeMs.current += dur
        charsRead.current += countable(lines[idx])
        setIdx((i) => i + 1)
      }
    })
    return () => anim.current?.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, playing, lines.length, cw])

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
          {Math.min(idx + 1, lines.length || 1)} / {lines.length || '…'} 줄
        </Text>
        <TouchableOpacity onPress={() => void exitSave()}>
          <Text style={s.muted}>끝내기</Text>
        </TouchableOpacity>
      </View>

      <View style={s.box} onLayout={(e) => setCw(e.nativeEvent.layout.width)}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16 }}>
          {lines.map((ln, i) => (
            <View key={i} style={[s.lineRow, { height: lineH }, i === idx && s.lineCur]}>
              <Text style={{ fontSize, lineHeight: lineH, color: i <= idx ? COLORS.fg : COLORS.muted }}>
                {ln}
              </Text>
              {i === idx && (
                <Animated.View
                  style={[
                    s.bar,
                    { width: barW, height: lineH, transform: [{ translateX: barX }] },
                  ]}
                />
              )}
            </View>
          ))}
        </ScrollView>
      </View>

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
  box: { flex: 1, backgroundColor: COLORS.panel, borderRadius: 16, borderWidth: 2, borderColor: '#3a4256' },
  lineRow: { position: 'relative', justifyContent: 'center' },
  lineCur: { backgroundColor: 'rgba(127,127,127,0.16)', borderRadius: 8 }, // 현재 줄 배경(은은)
  bar: { position: 'absolute', left: 0, top: 0, backgroundColor: 'rgba(240,198,116,0.5)', borderRadius: 4 },
  btn: { backgroundColor: COLORS.panel, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnT: { color: COLORS.fg, fontSize: 17, fontWeight: '800' },
  primary: { backgroundColor: COLORS.accent },
})
