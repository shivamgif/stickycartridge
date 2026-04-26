// MODULE: SettingsScreen | ROLE: Gameplay options — palette, FPS, haptics, SFX, scanlines | API: SettingsScreen

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const buildItems = (s) => [
  { id: 'palette', label: 'PALETTE', value: s.palette, values: ['DMG', 'POCKET', 'GREY'] },
  { id: 'fps', label: 'FRAME RATE', value: s.fps, values: ['30', '60'] },
  { id: 'haptics', label: 'HAPTICS', value: s.haptics ? 'ON' : 'OFF', values: ['ON', 'OFF'] },
  { id: 'sfx', label: 'BUTTON SFX', value: s.sfx ? 'ON' : 'OFF', values: ['ON', 'OFF'] },
  { id: 'scanlines', label: 'SCANLINES', value: s.scanlines ? 'ON' : 'OFF', values: ['ON', 'OFF'] },
];

export default function SettingsScreen({ onButton, goBack, settings, onChangeSetting }) {
  const [cursor, setCursor] = useState(0);
  const cursorRef = useRef(0);
  const items = buildItems(settings);

  useEffect(() => {
    const handler = (button, isPressed) => {
      if (!isPressed) return;
      if (button === 'up') {
        cursorRef.current = (cursorRef.current - 1 + items.length) % items.length;
        setCursor(cursorRef.current);
      } else if (button === 'down') {
        cursorRef.current = (cursorRef.current + 1) % items.length;
        setCursor(cursorRef.current);
      } else if (button === 'a' || button === 'right' || button === 'left') {
        const item = items[cursorRef.current];
        const dir = button === 'left' ? -1 : 1;
        const idx = item.values.indexOf(item.value);
        const next = item.values[(idx + dir + item.values.length) % item.values.length];
        const boolVal = next === 'ON' ? true : next === 'OFF' ? false : next;
        onChangeSetting(item.id, boolVal);
      } else if (button === 'b') {
        goBack();
      }
    };
    onButton.current = handler;
  }, [settings, goBack, onChangeSetting]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>SETTINGS</Text>
      <View style={styles.divider} />
      <View style={styles.list}>
        {items.map((item, i) => (
          <View key={item.id} style={styles.row}>
            <Text style={[styles.label, cursor === i && styles.labelActive]}>
              {cursor === i ? '▶ ' : '  '}{item.label}
            </Text>
            <Text style={[styles.value, cursor === i && styles.valueActive]}>{item.value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.hint}>A/◄►:CHANGE  B:BACK</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#4C5800', paddingHorizontal: 8, paddingVertical: 6 },
  title: { fontFamily: 'PressStart2P', fontSize: 10, color: '#000000', textAlign: 'center', marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#000000', marginBottom: 8 },
  list: { flex: 1, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: 'PressStart2P', fontSize: 8, color: '#222222', flex: 1 },
  labelActive: { color: '#000000' },
  value: { fontFamily: 'PressStart2P', fontSize: 8, color: '#111111' },
  valueActive: { color: '#000000' },
  footer: { alignItems: 'center' },
  hint: { fontFamily: 'PressStart2P', fontSize: 7, color: '#111111' },
});
