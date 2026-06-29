import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native'
import { api, COLORS, type CloudUser } from '../api'
import type { Nav } from '../../App'
import { PinPad } from './PinPad'

const AVATARS = ['🐰', '🦊', '🐼', '🐯', '🐸', '🐧', '🐬', '🦉', '🐱', '🐶']

export function LoginScreen({ nav, onLogin }: { nav: Nav; onLogin: (u: CloudUser) => void }) {
  const [online, setOnline] = useState<boolean | null>(null)
  const [users, setUsers] = useState<CloudUser[]>([])
  const [pinFor, setPinFor] = useState<CloudUser | null>(null)

  // 새 사용자
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAvatar, setNewAvatar] = useState(AVATARS[0])
  const [regPin, setRegPin] = useState(false)

  const load = async () => {
    try {
      await api.health()
      setOnline(true)
      setUsers(await api.users())
    } catch {
      setOnline(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  if (online === null) return <View style={s.wrap}><Text style={s.muted}>연결 중…</Text></View>

  if (online === false) {
    return (
      <View style={s.wrap}>
        <Text style={s.h1}>📖 읽기 친구들</Text>
        <Text style={s.muted}>🔴 서버에 연결되지 않았어요. 같은 와이파이의 서버 주소를 확인해 주세요.</Text>
        <View style={s.row}>
          <TouchableOpacity style={[s.btn, s.primary]} onPress={() => nav.toServer()}>
            <Text style={[s.btnT, { color: '#fff' }]}>⚙ 서버 설정</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btn} onPress={load}>
            <Text style={s.btnT}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <View style={s.headerRow}>
        <Text style={s.h1}>📖 읽기 친구들</Text>
        <View style={s.row}>
          <TouchableOpacity style={s.btn} onPress={() => nav.toServer()}>
            <Text style={s.btnT}>⚙ 서버</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.primary]} onPress={() => setCreating(true)}>
            <Text style={[s.btnT, { color: '#fff' }]}>＋ 새 사용자</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={s.muted}>친구를 고르고 비밀번호(4자리)를 눌러요. 🟢 서버 연결됨</Text>

      <View style={s.cards}>
        {users.map((u) => (
          <TouchableOpacity key={u.id} style={s.card} onPress={() => setPinFor(u)}>
            <Text style={s.avatar}>{u.avatar ?? '🙂'}</Text>
            <Text style={s.name}>{u.name}</Text>
          </TouchableOpacity>
        ))}
        {users.length === 0 && <Text style={s.muted}>“＋ 새 사용자”로 첫 친구를 만들어요.</Text>}
      </View>

      {/* 로그인 PIN */}
      <PinPad
        visible={!!pinFor}
        title={`${pinFor?.name ?? ''}의 비밀번호`}
        onCancel={() => setPinFor(null)}
        onDone={async (pin) => {
          const u = pinFor!
          setPinFor(null)
          try {
            const r = await api.login(u.id, pin)
            onLogin(r.user)
          } catch {
            Alert.alert('비밀번호가 달라요', '다시 해 볼까요?')
          }
        }}
      />

      {/* 새 사용자 모달 */}
      <Modal visible={creating} transparent animationType="slide" onRequestClose={() => setCreating(false)}>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.h2}>새 친구 만들기</Text>
            <TextInput
              style={s.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="별명"
              placeholderTextColor={COLORS.muted}
              maxLength={12}
            />
            <View style={s.avatarRow}>
              {AVATARS.map((a) => (
                <TouchableOpacity key={a} onPress={() => setNewAvatar(a)}>
                  <Text style={[s.avatarPick, a === newAvatar && s.avatarSel]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.row}>
              <TouchableOpacity style={s.btn} onPress={() => setCreating(false)}>
                <Text style={s.btnT}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.primary]}
                onPress={() => {
                  if (!newName.trim()) return
                  setRegPin(true)
                }}
              >
                <Text style={[s.btnT, { color: '#fff' }]}>다음 (비밀번호)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 등록 PIN */}
      <PinPad
        visible={regPin}
        title="새 비밀번호 4자리"
        onCancel={() => setRegPin(false)}
        onDone={async (pin) => {
          setRegPin(false)
          try {
            const r = await api.register(newName.trim(), newAvatar, pin)
            setCreating(false)
            onLogin(r.user)
          } catch {
            Alert.alert('만들기 실패', '잠시 후 다시 해 주세요.')
          }
        }}
      />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  wrap: { padding: 24, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { color: COLORS.fg, fontSize: 28, fontWeight: '800' },
  h2: { color: COLORS.fg, fontSize: 22, fontWeight: '800' },
  muted: { color: COLORS.muted, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    width: 150,
    height: 160,
    borderRadius: 20,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  avatar: { fontSize: 56 },
  name: { color: COLORS.fg, fontSize: 18, fontWeight: '700' },
  btn: { backgroundColor: COLORS.panel, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  btnT: { color: COLORS.fg, fontSize: 15, fontWeight: '700' },
  primary: { backgroundColor: COLORS.accent },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: COLORS.panel, borderRadius: 20, padding: 24, gap: 16, width: 360 },
  input: { backgroundColor: COLORS.bg, color: COLORS.fg, borderRadius: 12, padding: 14, fontSize: 18 },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatarPick: { fontSize: 30, padding: 4 },
  avatarSel: { backgroundColor: COLORS.accent, borderRadius: 8 },
})
