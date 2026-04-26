// MODULE: RomUploadScreen | ROLE: Transient screen that owns the file-picker flow | API: RomUploadScreen

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Props:
 *   pickNew       — async () => { entry, romData } | null (from useRomLibrary)
 *   loadRomBuffer — async (ArrayBuffer, name) => bool (from useGameboyEmulator)
 *   navigate      — OS navigate fn
 *   goBack        — OS goBack fn
 *   onButton      — shared button handler ref (not used here; picker blocks input)
 *
 * This screen exists only to keep the OS state machine in a known state while
 * the native file picker is open. It auto-fires the picker on mount, then
 * transitions to IN_GAME on success or calls goBack() on cancel/error.
 */
export default function RomUploadScreen({ pickNew, loadRomBuffer, navigate, goBack, onButton }) {
  const [status, setStatus] = useState('OPENING PICKER...');
  const didRun = useRef(false);

  // Block all buttons while picker is open (no-op handler).
  useEffect(() => {
    onButton.current = () => { };
  }, []);

  useEffect(() => {
    // Guard: only run once — React Strict Mode double-invokes effects in dev.
    if (didRun.current) return;
    didRun.current = true;

    async function run() {
      try {
        setStatus('SELECT ROM FILE');
        const result = await pickNew();

        if (!result) {
          // User cancelled the picker.
          goBack();
          return;
        }

        setStatus('LOADING ROM...');
        const ok = await loadRomBuffer(result.romData, result.entry.name);
        if (!ok) {
          setStatus('UNSUPPORTED ROM');
          // Give the user a moment to read the error before going back.
          await new Promise((r) => setTimeout(r, 1800));
          goBack();
          return;
        }

        // useGameboyEmulator sets isRunning → GameBoyShell navigates to IN_GAME automatically.
        // Nothing more to do here.
      } catch (err) {
        setStatus('ERROR — GOING BACK');
        await new Promise((r) => setTimeout(r, 1400));
        goBack();
      }
    }

    run();
  }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>LOAD ROM</Text>
      <View style={styles.divider} />
      <View style={styles.body}>
        <Text style={styles.icon}>📂</Text>
        <Text style={styles.status}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#4C5800', paddingHorizontal: 8, paddingVertical: 6 },
  title: { fontFamily: 'PressStart2P', fontSize: 10, color: '#000000', textAlign: 'center', marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#000000', marginBottom: 8 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  icon: { fontSize: 24 },
  status: { fontFamily: 'PressStart2P', fontSize: 8, color: '#111111', textAlign: 'center' },
});
