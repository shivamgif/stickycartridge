// MODULE: HomeScreen | ROLE: Main menu — clock, last ROM shortcut, Library, Store | API: HomeScreen

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SCREENS } from '../useGameBoyOS';

const ITEMS = [
  { id: 'play', label: 'PLAY' },
  { id: 'library', label: 'LIBRARY' },
  { id: 'store', label: 'STORE' },
];

function pad(n) { return String(n).padStart(2, '0'); }

export default function HomeScreen({ onButton, navigate, lastRom }) {
  const [cursor, setCursor] = useState(0);
  const [time, setTime] = useState('');
  const cursorRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    onButton.current = (button, isPressed) => {
      if (!isPressed) return;
      if (button === 'up') {
        cursorRef.current = (cursorRef.current - 1 + ITEMS.length) % ITEMS.length;
        setCursor(cursorRef.current);
      } else if (button === 'down') {
        cursorRef.current = (cursorRef.current + 1) % ITEMS.length;
        setCursor(cursorRef.current);
      } else if (button === 'a') {
        const selected = ITEMS[cursorRef.current];
        if (selected.id === 'play' || selected.id === 'library') navigate(SCREENS.ROM_LIBRARY);
        else if (selected.id === 'store') navigate(SCREENS.STORE);
      }
    };
  }, [navigate]);

  const playLabel = lastRom ? `▶ ${lastRom.name.replace(/\.(gb|gbc)$/i, '').slice(0, 12)}` : '▶ NO ROM';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.title}>GB EMU</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.menu}>
        {ITEMS.map((item, i) => (
          <Text key={item.id} style={[styles.item, cursor === i && styles.itemActive]}>
            {cursor === i ? '▶ ' : '  '}
            {item.id === 'play' ? playLabel : item.label}
          </Text>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.hint}>A:SELECT  B:BACK</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#4C5800', paddingHorizontal: 8, paddingVertical: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  time: { fontFamily: 'PressStart2P', fontSize: 8, color: '#000000' },
  title: { fontFamily: 'PressStart2P', fontSize: 10, color: '#000000' },
  divider: { height: 1, backgroundColor: '#000000', marginBottom: 8 },
  menu: { flex: 1, justifyContent: 'center', gap: 10 },
  item: { fontFamily: 'PressStart2P', fontSize: 11, color: '#222222' },
  itemActive: { color: '#000000' },
  footer: { alignItems: 'center' },
  hint: { fontFamily: 'PressStart2P', fontSize: 7, color: '#111111' },
});
