import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal } from 'react-native'
import { api, type TextRow, type ReadOpts } from '../api'
import { cue } from '../sound'
import { useColors, type Colors } from '../theme'
import type { Nav } from '../../App'

const countable = (s: string) => [...s].filter((c) => !/\s/.test(c)).length
const SENTENCE = /[.?!…]/

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

// 불러오는 중 프로그레스바(무한 반복)
function LoadingBar({ col }: { col: Colors }) {
  const x = useRef(new Animated.Value(0)).current
  const [w, setW] = useState(0)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 900, useNativeDriver: true }),
    )
    loop.start()
    return () => loop.stop()
  }, [x])
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [-0.45 * w, w] })
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ height: 10, width: '100%', backgroundColor: 'rgba(127,127,127,0.25)', borderRadius: 5, overflow: 'hidden' }}
    >
      <Animated.View
        style={{ height: 10, width: '45%', backgroundColor: col.accent, borderRadius: 5, transform: [{ translateX: tx }] }}
      />
    </View>
  )
}

export function ReadScreen({ nav, text, opts }: { nav: Nav; text: TextRow; opts: ReadOpts }) {
  const col = useColors()
  const s = makeStyles(col)
  const fontSize = opts.fontSize
  const lineH = Math.round(fontSize * (opts.lineSpacing || 1.6))
  const charW = fontSize // 한글 한 글자 폭 근사
  const barW = 2 * charW // 약 2글자
  const msPerChar = 60000 / (400 * opts.speedMult)

  const [cw, setCw] = useState(0)
  const [ch, setCh] = useState(0)
  const [lines, setLines] = useState<string[]>([])
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)

  const barX = useRef(new Animated.Value(0)).current
  const anim = useRef<Animated.CompositeAnimation | null>(null)
  const widths = useRef<number[]>([]) // 줄별 실제 글자폭(px)
  const activeMs = useRef(0)
  const charsRead = useRef(0)
  const startedAt = useRef(new Date().toISOString())

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
      await api.saveProgress({ textId: null })
    } catch {
      /* 오프라인 */
    }
    cue.end()
  }

  const exitSave = async () => {
    try {
      await api.saveProgress({ textId: text.id, charsRead: charsRead.current, title: text.title })
    } catch {
      /* 오프라인 */
    }
    nav.toHome()
  }

  // 줄 계산 — UI(로딩 팝업)를 먼저 띄우고 다음 틱에 무거운 wrap 수행
  useEffect(() => {
    if (cw === 0) return
    setLoading(true)
    setReady(false)
    const maxChars = Math.max(4, Math.floor((cw - 32) / charW))
    const t = setTimeout(() => {
      const ls = wrap(text.body, maxChars)
      let start = 0
      let acc = 0
      const target = opts.resumeChars ?? 0
      if (target > 0 && ls.length) {
        for (let i = 0; i < ls.length; i++) {
          const c = countable(ls[i])
          if (acc + c > target) {
            start = i
            break
          }
          acc += c
          start = Math.min(i + 1, ls.length - 1)
        }
        charsRead.current = acc
      }
      widths.current = []
      setLines(ls)
      setIdx(start)
      setLoading(false)
      setReady(true)
      cue.start()
    }, 40)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cw, charW, text.body])

  // 페이지 단위 렌더(수천 줄을 한 번에 그리지 않음)
  const pageLines = Math.max(1, Math.floor(((ch || 600) - 32) / lineH))
  const pageStart = Math.floor(idx / pageLines) * pageLines
  const visible = lines.slice(pageStart, pageStart + pageLines)

  // 스윕(현재 줄): 실제 글자폭까지, 균일 속도, 문장끝 0.3초 멈춤
  useEffect(() => {
    if (!ready || !playing || done || lines.length === 0) return
    if (idx >= lines.length) {
      void finish()
      return
    }
    const t = setTimeout(() => {
      const line = lines[idx]
      const totalCountable = countable(line)
      const lineW = Math.max(barW + 4, widths.current[idx] ?? cw - 32)
      const maxX = Math.max(0, lineW - barW)
      const segs: { chars: number; ends: boolean }[] = []
      let segChars = 0
      for (const chc of [...line]) {
        if (!/\s/.test(chc)) segChars++
        if (SENTENCE.test(chc)) {
          segs.push({ chars: segChars, ends: true })
          segChars = 0
        }
      }
      if (segChars > 0 || segs.length === 0) segs.push({ chars: segChars, ends: false })

      barX.setValue(0)
      let cum = 0
      let dur = 0
      const anims: Animated.CompositeAnimation[] = []
      segs.forEach((seg, si) => {
        const segPx = totalCountable > 0 ? (seg.chars / totalCountable) * maxX : maxX
        cum = Math.min(maxX, cum + segPx)
        const d = Math.max(1, seg.chars * msPerChar)
        dur += d
        anims.push(Animated.timing(barX, { toValue: cum, duration: d, useNativeDriver: true }))
        if (seg.ends && si < segs.length - 1) {
          anims.push(Animated.delay(300))
          dur += 300
        }
      })
      const seqDur = dur
      anim.current = Animated.sequence(anims)
      anim.current.start(({ finished }) => {
        if (finished) {
          activeMs.current += seqDur
          charsRead.current += totalCountable
          setIdx((i) => i + 1)
        }
      })
    }, 16)
    return () => {
      clearTimeout(t)
      anim.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, playing, ready, done, lines.length])

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

      <View
        style={s.box}
        onLayout={(e) => {
          setCw(e.nativeEvent.layout.width)
          setCh(e.nativeEvent.layout.height)
        }}
      >
        <View style={{ padding: 16 }}>
          {visible.map((ln, k) => {
            const gi = pageStart + k
            const cur = gi === idx
            return (
              <View key={gi} style={[s.lineRow, { height: lineH }, cur && s.lineCur]}>
                <Text
                  onLayout={(e) => {
                    widths.current[gi] = e.nativeEvent.layout.width
                  }}
                  style={{ fontSize, lineHeight: lineH, color: gi <= idx ? col.fg : col.muted }}
                >
                  {ln}
                </Text>
                {cur && (
                  <Animated.View
                    style={[s.bar, { width: barW, height: lineH, transform: [{ translateX: barX }] }]}
                  />
                )}
              </View>
            )
          })}
        </View>
      </View>

      <TouchableOpacity style={[s.btn, s.primary]} onPress={() => setPlaying((p) => !p)}>
        <Text style={[s.btnT, { color: '#fff' }]}>{playing ? '⏸ 잠깐 멈춤' : '▶ 계속'}</Text>
      </TouchableOpacity>

      {/* 불러오는 중 팝업(프로그레스바) */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.loadBox}>
            <Text style={s.loadT}>📖 글을 준비하고 있어요…</Text>
            <LoadingBar col={col} />
          </View>
        </View>
      </Modal>
    </View>
  )
}

const makeStyles = (col: Colors) =>
  StyleSheet.create({
    wrap: { flex: 1, padding: 24, gap: 16 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between' },
    h1: { color: col.fg, fontSize: 26, fontWeight: '800' },
    muted: { color: col.muted, fontSize: 15 },
    box: { flex: 1, backgroundColor: col.panel, borderRadius: 16, borderWidth: 2, borderColor: '#3a4256' },
    lineRow: { position: 'relative', justifyContent: 'center', alignItems: 'flex-start' },
    lineCur: { backgroundColor: 'rgba(127,127,127,0.16)', borderRadius: 8 },
    bar: { position: 'absolute', left: 0, top: 0, backgroundColor: 'rgba(240,198,116,0.5)', borderRadius: 4 },
    btn: { backgroundColor: col.panel, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    btnT: { color: col.fg, fontSize: 17, fontWeight: '800' },
    primary: { backgroundColor: col.accent },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
    loadBox: { backgroundColor: col.panel, borderRadius: 20, padding: 28, width: 320, gap: 18 },
    loadT: { color: col.fg, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  })
