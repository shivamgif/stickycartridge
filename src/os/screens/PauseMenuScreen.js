// MODULE: PauseMenuScreen | ROLE: In-game pause overlay — Resume, Library, Settings, Exit | API: PauseMenuScreen

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SCREENS } from '../useGameBoyOS';

const ITEMS = [
  { id: 'resume', label: 'RESUME' },
  { id: 'save', label: 'SAVE STATE' },
  { id: 'library', label: 'LOAD ROM' },
  { id: 'settings', label: 'SETTINGS' },
  { id: 'exit', label: 'EXIT' },
];

export default function PauseMenuScreen({ onButton, navigate, goBack, romName }) {
  const [cursor, setCursor] = useState(0);
  const cursorRef = useRef(0);

  useEffect(() => {
    const handler = (button, isPressed) => {
      if (!isPressed) return;
      if (button === 'up') {
        cursorRef.current = (cursorRef.current - 1 + ITEMS.length) % ITEMS.length;
        setCursor(cursorRef.current);
      } else if (button === 'down') {
        cursorRef.current = (cursorRef.current + 1) % ITEMS.length;
        setCursor(cursorRef.current);
      } else if (button === 'a') {
        const item = ITEMS[cursorRef.current];
        if (item.id === 'resume') goBack();
        else if (item.id === 'save') navigate(SCREENS.SAVE_STATES);
        else if (item.id === 'library') navigate(SCREENS.ROM_LIBRARY);
        else if (item.id === 'settings') navigate(SCREENS.SETTINGS);
        else if (item.id === 'exit') navigate(SCREENS.HOME);
      } else if (button === 'b') {
        goBack(); // resume
      }
    };
    onButton.current = handler;
  }, [navigate, goBack]);

  const displayName = romName ? romName.replace(/\.(gb|gbc)$/i, '').slice(0, 14) : '';

  return (
    <View style={styles.root}>
      <Text style={styles.title}>PAUSED</Text>
      {displayName ? <Text style={styles.rom}>{displayName}</Text> : null}
      <View style={styles.divider} />
      <View style={styles.menu}>
        {ITEMS.map((item, i) => (
          <Text key={item.id} style={[styles.item, cursor === i && styles.itemActive]}>
            {cursor === i ? '▶ ' : '  '}{item.label}
          </Text>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.hint}>A:SELECT  B:RESUME</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#4C5800', paddingHorizontal: 10, paddingVertical: 8 },
  title: { fontFamily: 'PressStart2P', fontSize: 12, color: '#000000', textAlign: 'center', marginBottom: 4 },
  rom: { fontFamily: 'PressStart2P', fontSize: 8, color: '#111111', textAlign: 'center', marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#000000', marginBottom: 10 },
  menu: { flex: 1, justifyContent: 'center', gap: 12 },
  item: { fontFamily: 'PressStart2P', fontSize: 11, color: '#222222' },
  itemActive: { color: '#000000' },
  footer: { alignItems: 'center' },
  hint: { fontFamily: 'PressStart2P', fontSize: 7, color: '#111111' },
});
