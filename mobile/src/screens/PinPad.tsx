import React, { useEffect, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { COLORS } from '../api'

export function PinPad({
  visible,
  title,
  onCancel,
  onDone,
}: {
  visible: boolean
  title: string
  onCancel: () => void
  onDone: (pin: string) => void
}) {
  const [pin, setPin] = useState('')
  useEffect(() => {
    if (!visible) setPin('')
  }, [visible])

  const press = (k: string) => {
    if (k === '⌫') {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (pin.length < 4) {
      const np = pin + k
      setPin(np)
      if (np.length === 4) setTimeout(() => onDone(np), 120)
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.box}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.dots}>{'●'.repeat(pin.length) + '○'.repeat(4 - pin.length)}</Text>
          <View style={s.pad}>
            {keys.map((k, i) =>
              k === '' ? (
                <View key={i} style={s.key} />
              ) : (
                <TouchableOpacity key={i} style={s.key} onPress={() => press(k)}>
                  <Text style={s.keyT}>{k}</Text>
                </TouchableOpacity>
              ),
            )}
          </View>
          <TouchableOpacity onPress={onCancel}>
            <Text style={s.cancel}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  box: { backgroundColor: COLORS.panel, borderRadius: 20, padding: 24, alignItems: 'center', gap: 16 },
  title: { color: COLORS.fg, fontSize: 20, fontWeight: '700' },
  dots: { color: COLORS.accent, fontSize: 28, letterSpacing: 8 },
  pad: { width: 240, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  key: {
    width: 70,
    height: 60,
    borderRadius: 14,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyT: { color: COLORS.fg, fontSize: 24, fontWeight: '700' },
  cancel: { color: COLORS.muted, fontSize: 16, marginTop: 4 },
})
