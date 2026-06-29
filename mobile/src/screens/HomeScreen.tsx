import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native'
import { api, COLORS, type CloudUser, type LeaderRow, type TextRow } from '../api'
import type { Nav } from '../../App'

const METRICS = [
  { key: 'streak', label: '연속일 🔥', unit: '일' },
  { key: 'weekMinutes', label: '이번 주', unit: '분' },
  { key: 'totalChars', label: '글자', unit: '자' },
  { key: 'completedCount', label: '완독', unit: '권' },
] as const
type MetricKey = (typeof METRICS)[number]['key']

export function HomeScreen({ nav, user }: { nav: Nav; user: CloudUser }) {
  const [board, setBoard] = useState<LeaderRow[]>([])
  const [texts, setTexts] = useState<TextRow[]>([])
  const [metric, setMetric] = useState<MetricKey>('weekMinutes')
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const load = async () => {
    try {
      setBoard(await api.leaderboard())
    } catch {
      /* ignore */
    }
    try {
      setTexts(await api.texts())
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    load()
  }, [])

  const me = board.find((b) => b.userId === user.id)
  const sorted = [...board].sort((a, b) => b[metric] - a[metric])
  const max = Math.max(1, ...sorted.map((r) => r[metric]))
  const meIdx = sorted.findIndex((r) => r.userId === user.id)
  const unit = METRICS.find((m) => m.key === metric)!.unit
  const medals = ['🥇', '🥈', '🥉']

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <View style={s.headerRow}>
        <Text style={s.h1}>
          {user.avatar ?? '🙂'} {user.name}
        </Text>
        <TouchableOpacity
          style={s.btn}
          onPress={() => {
            api.logout()
            nav.toLogin()
          }}
        >
          <Text style={s.btnT}>나가기</Text>
        </TouchableOpacity>
      </View>

      {/* 내 기록 */}
      <View style={s.statsRow}>
        <Stat n={me?.streak ?? 0} label="🔥 연속" />
        <Stat n={me?.weekMinutes ?? 0} label="이번 주(분)" />
        <Stat n={me?.totalChars ?? 0} label="읽은 글자" />
        <Stat n={me?.completedCount ?? 0} label="완독" />
      </View>

      {/* 친구 랭킹 */}
      <View style={s.panel}>
        <Text style={s.panelT}>🏆 친구들과 비교</Text>
        <View style={s.chips}>
          {METRICS.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[s.chip, metric === m.key && s.chipSel]}
              onPress={() => setMetric(m.key)}
            >
              <Text style={[s.chipT, metric === m.key && { color: '#fff' }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {sorted.map((r, i) => {
          const mine = r.userId === user.id
          return (
            <View key={r.userId} style={[s.lrow, mine && s.lrowMe]}>
              <Text style={s.lrank}>{i < 3 ? medals[i] : i + 1}</Text>
              <Text style={s.lava}>{r.avatar ?? '🙂'}</Text>
              <Text style={s.lname} numberOfLines={1}>
                {r.name}
                {mine ? ' (나)' : ''}
              </Text>
              <View style={s.lbar}>
                <View style={[s.lbarFill, { width: `${Math.round((r[metric] / max) * 100)}%` }]} />
              </View>
              <Text style={s.lval}>{r[metric]}</Text>
            </View>
          )
        })}
        <Text style={s.cheer}>
          {meIdx === 0
            ? '🎉 1등이에요! 멋져요!'
            : meIdx > 0
              ? `한 칸 위 ${sorted[meIdx - 1].name}까지 ${sorted[meIdx - 1][metric] - sorted[meIdx][metric]}${unit} 남았어요!`
              : ''}
        </Text>
      </View>

      {/* 저장된 글 */}
      <View style={s.headerRow}>
        <Text style={s.h2}>저장된 글</Text>
        <TouchableOpacity style={[s.btn, s.primary]} onPress={() => setAdding(true)}>
          <Text style={[s.btnT, { color: '#fff' }]}>＋ 글 저장</Text>
        </TouchableOpacity>
      </View>
      {texts.length === 0 && <Text style={s.muted}>저장된 글이 없어요.</Text>}
      {texts.map((t) => (
        <TouchableOpacity key={t.id} style={s.textRow} onPress={() => nav.toRead(t)}>
          <Text style={s.textTitle}>{t.title || '(제목 없음)'}</Text>
          <Text style={s.muted} numberOfLines={1}>
            {t.body.slice(0, 40)}
          </Text>
        </TouchableOpacity>
      ))}

      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.h2}>글 저장</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="제목 (선택)"
              placeholderTextColor={COLORS.muted}
            />
            <TextInput
              style={[s.input, { height: 160, textAlignVertical: 'top' }]}
              value={body}
              onChangeText={setBody}
              placeholder="여기에 글을 붙여넣어요"
              placeholderTextColor={COLORS.muted}
              multiline
            />
            <View style={s.row}>
              <TouchableOpacity style={s.btn} onPress={() => setAdding(false)}>
                <Text style={s.btnT}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.primary]}
                onPress={async () => {
                  if (!body.trim()) return
                  await api.saveText(title.trim() || body.slice(0, 20), body, null)
                  setTitle('')
                  setBody('')
                  setAdding(false)
                  load()
                }}
              >
                <Text style={[s.btnT, { color: '#fff' }]}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statN}>{n}</Text>
      <Text style={s.statL}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { padding: 24, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { color: COLORS.fg, fontSize: 26, fontWeight: '800' },
  h2: { color: COLORS.fg, fontSize: 20, fontWeight: '800' },
  muted: { color: COLORS.muted, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: COLORS.panel, borderRadius: 14, padding: 12, alignItems: 'center' },
  statN: { color: COLORS.fg, fontSize: 24, fontWeight: '800' },
  statL: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  panel: { backgroundColor: COLORS.panel, borderRadius: 16, padding: 16, gap: 8 },
  panelT: { color: COLORS.fg, fontSize: 18, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 2, borderColor: COLORS.muted, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipSel: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipT: { color: COLORS.fg, fontSize: 13, fontWeight: '700' },
  lrow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  lrowMe: { backgroundColor: 'rgba(96,165,250,0.18)', borderRadius: 8 },
  lrank: { width: 26, textAlign: 'center', color: COLORS.fg, fontSize: 16 },
  lava: { fontSize: 20, width: 26, textAlign: 'center' },
  lname: { flex: 1, color: COLORS.fg, fontWeight: '700' },
  lbar: { width: 90, height: 12, backgroundColor: 'rgba(127,127,127,0.2)', borderRadius: 999, overflow: 'hidden' },
  lbarFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 999 },
  lval: { width: 48, textAlign: 'right', color: COLORS.fg, fontWeight: '800' },
  cheer: { color: COLORS.fg, fontSize: 15, marginTop: 4 },
  textRow: { backgroundColor: COLORS.panel, borderRadius: 12, padding: 14, gap: 2 },
  textTitle: { color: COLORS.fg, fontSize: 16, fontWeight: '700' },
  btn: { backgroundColor: COLORS.panel, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  btnT: { color: COLORS.fg, fontSize: 15, fontWeight: '700' },
  primary: { backgroundColor: COLORS.accent },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: COLORS.panel, borderRadius: 20, padding: 24, gap: 14, width: 380 },
  input: { backgroundColor: COLORS.bg, color: COLORS.fg, borderRadius: 12, padding: 14, fontSize: 16 },
})
