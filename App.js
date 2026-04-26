import { useMemo } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

import { GameBoyShell } from './src/components/GameBoyShell';
import { useGameboyEmulator } from './src/emulator/useGameboyEmulator';
import useSettings from './src/os/useSettings';

export default function App() {
  const [fontsLoaded] = useFonts({
    PressStart2P: require('./assets/fonts/PressStart2P-Regular.ttf'),
  });
  const { settings, changeSetting } = useSettings();
  const emulator = useGameboyEmulator(settings);

  const shellProps = useMemo(
    () => ({
      frameUri: emulator.frameUri,
      onPressButton: emulator.setButton,
      loadRomBuffer: emulator.loadRomBuffer,
      buttonState: emulator.buttonState,
      romName: emulator.romName,
      statusText: emulator.statusText,
      isRunning: emulator.isRunning,
      emulatorRef: emulator.emulatorRef,
      settings,
      changeSetting,
    }),
    [emulator, settings, changeSetting],
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading assets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <GameBoyShell {...shellProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#d7d0ca' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d7d0ca' },
  loadingText: { fontFamily: 'PressStart2P', fontSize: 12, color: '#2b2f98' },
});
