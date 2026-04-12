import { useMemo } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

import { GameBoyShell } from './src/components/GameBoyShell';
import { useGameboyEmulator } from './src/emulator/useGameboyEmulator';

export default function App() {
  const [fontsLoaded] = useFonts({
    PressStart2P: require('./assets/fonts/PressStart2P-Regular.ttf'),
  });
  const emulator = useGameboyEmulator();

  const shellProps = useMemo(
    () => ({
      frameUri: emulator.frameUri,
      onPickRom: emulator.pickRom,
      onReset: emulator.reset,
      onPressButton: emulator.setButton,
      buttonState: emulator.buttonState,
      romName: emulator.romName,
      statusText: emulator.statusText,
      isRunning: emulator.isRunning,
    }),
    [emulator],
  );

  if (!fontsLoaded) {
    return <View style={styles.loading}><Text style={styles.loadingText}>Loading assets...</Text></View>;
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.container}>
        <GameBoyShell {...shellProps} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#d7d0ca',
  },
  container: {
    flex: 1,
    backgroundColor: '#d7d0ca',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d7d0ca',
  },
  loadingText: {
    fontFamily: 'PressStart2P',
    fontSize: 12,
    color: '#2b2f98',
  },
});
