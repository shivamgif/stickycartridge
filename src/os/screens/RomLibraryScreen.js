// MODULE: RomLibraryScreen | ROLE: Scrollable ROM list — play, load new, delete | API: RomLibraryScreen

import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SCREENS } from '../useGameBoyOS';

const VISIBLE_ROWS = 5;

export default function RomLibraryScreen({ onButton, navigate, goBack, roms, onPickRom, onLoadRom }) {
  const [cursor, setCursor] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null); // rom id to confirm
  const cursorRef = useRef(0);
  const scrollRef = useRef(null);

  const allItems = [{ id: '__pick__', name: '+ LOAD NEW ROM', isAction: true }, ...roms];

  useEffect(() => {
    cursorRef.current = 0;
    setCursor(0);
  }, [roms.length]);

  useEffect(() => {
    const handler = (button, isPressed) => {
      if (!isPressed) return;

      if (confirmDelete !== null) {
        if (button === 'a') { onPickRom.deleteRom(confirmDelete); setConfirmDelete(null); }
        else if (button === 'b') setConfirmDelete(null);
        return;
      }

      if (button === 'up') {
        cursorRef.current = Math.max(0, cursorRef.current - 1);
        setCursor(cursorRef.current);
      } else if (button === 'down') {
        cursorRef.current = Math.min(allItems.length - 1, cursorRef.current + 1);
        setCursor(cursorRef.current);
      } else if (button === 'a') {
        const item = allItems[cursorRef.current];
        if (item?.id === '__pick__') {
          onPickRom.pickNew();
        } else if (item) {
          onLoadRom(item);
        }
      } else if (button === 'select') {
        const item = allItems[cursorRef.current];
        if (item && !item.isAction) setConfirmDelete(item.id);
      } else if (button === 'b') {
        goBack();
      }
    };
    onButton.current = handler;
  }, [roms, confirmDelete, goBack]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>LIBRARY</Text>
        <Text style={styles.count}>{roms.length} ROM{roms.length !== 1 ? 'S' : ''}</Text>
      </View>
      <View style={styles.divider} />

      {confirmDelete !== null ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>DELETE ROM?</Text>
          <Text style={styles.confirmHint}>A:YES  B:NO</Text>
        </View>
      ) : (
        <ScrollView ref={scrollRef} style={styles.list} showsVerticalScrollIndicator={false}>
          {allItems.map((item, i) => (
            <Text
              key={item.id}
              style={[styles.item, cursor === i && styles.itemActive, item.isAction && styles.itemAction]}
            >
              {cursor === i ? '▶ ' : '  '}
              {item.name.replace(/\.(gb|gbc)$/i, '').slice(0, 16)}
            </Text>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Text style={styles.hint}>A:PLAY  SEL:DEL  B:BACK</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#4C5800', paddingHorizontal: 8, paddingVertical: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontFamily: 'PressStart2P', fontSize: 10, color: '#000000' },
  count: { fontFamily: 'PressStart2P', fontSize: 8, color: '#111111' },
  divider: { height: 1, backgroundColor: '#000000', marginBottom: 6 },
  list: { flex: 1 },
  item: { fontFamily: 'PressStart2P', fontSize: 9, color: '#222222', paddingVertical: 4 },
  itemActive: { color: '#000000' },
  itemAction: { color: '#000000' },
  confirm: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  confirmText: { fontFamily: 'PressStart2P', fontSize: 11, color: '#000000' },
  confirmHint: { fontFamily: 'PressStart2P', fontSize: 8, color: '#111111' },
  footer: { alignItems: 'center', marginTop: 4 },
  hint: { fontFamily: 'PressStart2P', fontSize: 7, color: '#111111' },
});
