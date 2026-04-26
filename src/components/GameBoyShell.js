import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Buffer } from 'buffer';
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Image, PixelRatio, Pressable, StyleSheet, Text, View } from 'react-native';

import { Sprites } from '../assets';
import { FrameDisplay } from './FrameDisplay';
import ScanlinesOverlay from './ScanlinesOverlay';
import ScreenPowerOnFlash from './ScreenPowerOnFlash';
import useGameBoyOS, { SCREENS } from '../os/useGameBoyOS';
import useRomLibrary from '../os/useRomLibrary';
import useSaveStates from '../os/useSaveStates';
import BootScreen from '../os/screens/BootScreen';
import HomeScreen from '../os/screens/HomeScreen';
import RomLibraryScreen from '../os/screens/RomLibraryScreen';
import PauseMenuScreen from '../os/screens/PauseMenuScreen';
import SettingsScreen from '../os/screens/SettingsScreen';
import StoreScreen from '../os/screens/StoreScreen';
import RomUploadScreen from '../os/screens/RomUploadScreen';
import SaveStateScreen from '../os/screens/SaveStateScreen';

// Set to true to render semi-transparent button hitbox overlays for alignment audit
const DEBUG_LAYOUT = false;

const DESIGN_WIDTH = 750;
const DESIGN_HEIGHT = 1624;
const COMBO_WINDOW_MS = 260;

function buildSquareWaveWavBase64({
  sampleRate = 22050,
  frequency = 740,
  durationSec = 0.055,
  amplitude = 0.28,
} = {}) {
  const sampleCount = Math.floor(sampleRate * durationSec);
  const bytesPerSample = 2;
  const channelCount = 1;
  const dataSize = sampleCount * bytesPerSample * channelCount;
  const fileSize = 44 + dataSize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  const period = sampleRate / frequency;
  for (let i = 0; i < sampleCount; i += 1) {
    const phase = i % period;
    const gate = phase < period / 2 ? 1 : -1;
    const envelope = Math.max(0, 1 - i / sampleCount);
    const sample = gate * amplitude * envelope;
    const pcm = Math.max(-1, Math.min(1, sample)) * 32767;
    view.setInt16(offset, pcm, true);
    offset += 2;
  }
  return Buffer.from(new Uint8Array(buffer)).toString('base64');
}

const ShellButton = React.memo(({ style, onPressIn, onPressOut, onLongPress, pressed }) => {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLongPress={onLongPress}
      delayLongPress={450}
      style={[styles.shellButton, style, pressed && styles.shellButtonPressed]}
    />
  );
});

const SpriteButton = React.memo(({ source, pressedSource, style, onPressIn, onPressOut, onLongPress, pressed, accessibilityLabel }) => {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLongPress={onLongPress}
      delayLongPress={450}
      style={[styles.spriteButton, style, pressed && styles.spriteButtonPressed]}
    >
      <Image source={pressed ? pressedSource : source} style={styles.spriteImage} resizeMode="stretch" />
      {/* Dark tint overlay — gives pressed feedback when source === pressedSource */}
      {pressed && <View style={styles.spritePressTint} pointerEvents="none" />}
    </Pressable>
  );
});

const ScreenArea = React.memo(({
  currentScreen,
  frameUri,
  romName,
  statusText,
  isRunning,
  osProps,
  settings,
  romLibrary,
  saveStates,
  loadRomBuffer,
  navigate,
}) => {
  switch (currentScreen) {
    case SCREENS.BOOT:
      return <BootScreen {...osProps} onBootComplete={() => navigate(SCREENS.HOME)} />;

    case SCREENS.HOME:
      return <HomeScreen {...osProps} lastRom={romLibrary.getLastPlayed()} />;

    case SCREENS.ROM_LIBRARY:
      return (
        <RomLibraryScreen
          {...osProps}
          roms={romLibrary.roms}
          onPickRom={{
            pickNew: () => navigate(SCREENS.ROM_UPLOAD),
            deleteRom: romLibrary.deleteRom,
          }}
          onLoadRom={async (entry) => {
            romLibrary.markPlayed(entry.id);
            const data = await romLibrary.loadRomData(entry);
            const ok = await loadRomBuffer(data, entry.name);
            if (ok) saveStates.onRomLoaded(entry.id);
          }}
        />
      );

    case SCREENS.ROM_UPLOAD:
      return (
        <RomUploadScreen
          {...osProps}
          pickNew={async () => {
            const result = await romLibrary.pickNew();
            if (result) {
              romLibrary.markPlayed(result.entry.id);
              saveStates.onRomLoaded(result.entry.id);
            }
            return result;
          }}
          loadRomBuffer={loadRomBuffer}
        />
      );

    case SCREENS.PAUSE_MENU:
      return <PauseMenuScreen {...osProps} romName={romName} />;

    case SCREENS.SAVE_STATES:
      return (
        <SaveStateScreen
          {...osProps}
          slots={saveStates.slots}
          maxSlots={saveStates.MAX_SLOTS}
          onSave={saveStates.saveState}
          onLoad={saveStates.loadState}
          onDelete={saveStates.deleteState}
        />
      );

    case SCREENS.SETTINGS:
      return <SettingsScreen {...osProps} settings={settings} onChangeSetting={osProps.changeSetting} />;

    case SCREENS.STORE:
      return (
        <StoreScreen
          {...osProps}
          onUploadRomPick={{
            call: (callback) => {
              romLibrary.pickNew().then((result) => {
                if (result) {
                  romLibrary.markPlayed(result.entry.id);
                  callback({ romData: result.romData, entry: result.entry });
                } else {
                  callback(null);
                }
              });
            },
            onDownload: async (romData, title) => {
              await loadRomBuffer(romData, title);
            },
          }}
        />
      );

    case SCREENS.IN_GAME:
      return <FrameDisplay frameUri={frameUri} romName={romName} statusText={statusText} isRunning={isRunning} />;

    default:
      return null;
  }
});


export function GameBoyShell({
  frameUri,
  onPressButton,   // routes to emulator
  loadRomBuffer,   // loads ArrayBuffer into emulator
  buttonState,
  romName,
  statusText,
  isRunning,
  emulatorRef,     // raw gameboy ref for save states
  settings,        // from App.js (shared with emulator)
  changeSetting,   // from App.js
}) {
  const [shellLayout, setShellLayout] = useState({ width: 1, height: 1 });
  const [localPressed, setLocalPressed] = useState({});
  // Increments every time currentScreen changes, used as `key` for ScreenPowerOnFlash
  const [flashKey, setFlashKey] = useState(0);
  const buttonSfxRef = useRef(null);
  const buttonSfxUriRef = useRef(null);
  const pressedRef = useRef({});
  const lastMetaPressAtRef = useRef({ start: 0, select: 0 });

  // OS state machine
  const { currentScreen, navigate, goBack, resetToHome } = useGameBoyOS();
  // ROM library
  const romLibrary = useRomLibrary();
  // Save states (SRAM auto-save + 3-slot snapshots)
  const saveStates = useSaveStates(emulatorRef);

  // Ref that each OS screen writes its button handler into.
  // This avoids prop-drilling a new callback on every render.
  const osButtonHandlerRef = useRef(null);

  // Bump flashKey every time the screen changes (re-mounts ScreenPowerOnFlash)
  const prevScreenRef = useRef(currentScreen);
  useEffect(() => {
    if (prevScreenRef.current !== currentScreen) {
      prevScreenRef.current = currentScreen;
      setFlashKey((k) => k + 1);
    }
  }, [currentScreen]);

  // When the emulator starts running (ROM loaded), switch to IN_GAME.
  useEffect(() => {
    if (isRunning && currentScreen !== SCREENS.IN_GAME && currentScreen !== SCREENS.PAUSE_MENU && currentScreen !== SCREENS.SAVE_STATES) {
      navigate(SCREENS.IN_GAME);
    }
  }, [isRunning]);

  const snap = (value) => Math.round(PixelRatio.roundToNearestPixel(value));

  const effectivePressed = useMemo(
    () => ({ ...buttonState, ...localPressed }),
    [buttonState, localPressed],
  );

  // Audio setup
  useEffect(() => {
    let mounted = true;
    async function prepareButtonSfx() {
      try {
        await setIsAudioActiveAsync(true);
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
        const base64 = buildSquareWaveWavBase64({ sampleRate: 44100, frequency: 820, durationSec: 0.07, amplitude: 0.55 });
        const fileUri = `${FileSystem.cacheDirectory}btn-8bit.wav`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        buttonSfxUriRef.current = fileUri;
        if (mounted) {
          const player = createAudioPlayer({ uri: fileUri }, { keepAudioSessionActive: true });
          player.volume = 1;
          buttonSfxRef.current = player;
        }
      } catch {}
    }
    prepareButtonSfx();
    return () => {
      mounted = false;
      buttonSfxRef.current?.remove();
    };
  }, []);

  const playFeedback = useCallback(async () => {
    if (settings.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
    if (!settings.sfx) return;
    if (buttonSfxRef.current) {
      try { await buttonSfxRef.current.seekTo(0); buttonSfxRef.current.play(); } catch {}
      return;
    }
    if (buttonSfxUriRef.current) {
      try {
        const p = createAudioPlayer({ uri: buttonSfxUriRef.current }, { keepAudioSessionActive: true });
        p.volume = 1; p.play();
        setTimeout(() => p.remove(), 1200);
      } catch {}
    }
  }, [settings.haptics, settings.sfx]);

  const onButtonPressIn = useCallback((button) => {
    const now = Date.now();
    pressedRef.current[button] = true;
    setLocalPressed((prev) => ({ ...prev, [button]: true }));
    playFeedback();

    // Start+Select: force-quit to HOME from anywhere.
    if (button === 'start' || button === 'select') {
      const partner = button === 'start' ? 'select' : 'start';
      const partnerHeld = Boolean(pressedRef.current[partner]);
      const partnerRecent = now - (lastMetaPressAtRef.current[partner] ?? 0) <= COMBO_WINDOW_MS;
      lastMetaPressAtRef.current[button] = now;

      if (partnerHeld || partnerRecent) {
        pressedRef.current.start = false;
        pressedRef.current.select = false;
        setLocalPressed((prev) => ({ ...prev, start: false, select: false }));
        onPressButton('start', false);
        onPressButton('select', false);
        saveStates.onRomUnloaded();
        resetToHome();
        return;
      }
    }

    // IN_GAME: forward all buttons to emulator.
    // Start long-press will trigger the Pause Menu (handled via onLongPress).
    if (currentScreen === SCREENS.IN_GAME) {
      onPressButton(button, true);
      return;
    }

    // OS screens: dispatch to whichever screen registered its handler.
    osButtonHandlerRef.current?.(button, true);
  }, [currentScreen, navigate, resetToHome, onPressButton, playFeedback]);

  const onButtonPressOut = useCallback((button) => {
    pressedRef.current[button] = false;
    setLocalPressed((prev) => ({ ...prev, [button]: false }));
    if (currentScreen === SCREENS.IN_GAME) {
      onPressButton(button, false);
    } else {
      osButtonHandlerRef.current?.(button, false);
    }
  }, [currentScreen, onPressButton]);

  const onStartLongPress = useCallback(() => {
    if (currentScreen === SCREENS.IN_GAME) {
      // Release Start in core so it doesn't get stuck held down while menu is open
      onPressButton('start', false);
      navigate(SCREENS.PAUSE_MENU);
    }
  }, [currentScreen, navigate, onPressButton]);

  // Shared props passed to every OS screen.
  const osProps = useMemo(() => ({
    onButton: osButtonHandlerRef,
    navigate,
    goBack,
    changeSetting,
  }), [navigate, goBack, changeSetting]);

  const artFrame = useMemo(() => ({
    x: 0, y: 0,
    width: snap(shellLayout.width),
    height: snap(shellLayout.height),
  }), [shellLayout]);

  const fromDesignRect = (x, y, width, height) => ({
    position: 'absolute',
    left: snap(artFrame.x + (x / DESIGN_WIDTH) * artFrame.width),
    top: snap(artFrame.y + (y / DESIGN_HEIGHT) * artFrame.height),
    width: snap((width / DESIGN_WIDTH) * artFrame.width),
    height: snap((height / DESIGN_HEIGHT) * artFrame.height),
  });

  const dpadSprite = effectivePressed.left ? Sprites.dpadLeft
    : effectivePressed.right ? Sprites.dpadRight
    : effectivePressed.up ? Sprites.dpadUp
    : effectivePressed.down ? Sprites.dpadDown
    : Sprites.dpadNeutral;

  const batterySource = !isRunning
    ? Sprites.batteryLow
    : Object.values(effectivePressed).some(Boolean)
      ? Sprites.batteryCharging
      : Sprites.batteryCharged;

  return (
    <View style={styles.screenRoot}>
      <View style={styles.shell} onLayout={(e) => setShellLayout(e.nativeEvent.layout)}>
        <View style={styles.artboard}>
          <Image source={Sprites.background} style={[styles.backgroundImage, styles.backgroundFill]} resizeMode="stretch" pointerEvents="none" />

          {/* Screen area — renders current OS screen */}
          <View style={[styles.screenWrap, fromDesignRect(130, 220, 500, 450)]}>
            <Image source={Sprites.screen} style={styles.screenBackdrop} resizeMode="stretch" pointerEvents="none" />
            <ScreenArea
              currentScreen={currentScreen}
              frameUri={frameUri}
              romName={romName}
              statusText={statusText}
              isRunning={isRunning}
              osProps={osProps}
              settings={settings}
              romLibrary={romLibrary}
              saveStates={saveStates}
              loadRomBuffer={loadRomBuffer}
              navigate={navigate}
            />
            <ScanlinesOverlay visible={settings?.scanlines} />
            {/* Power-on flash: re-mounts (via key) on every screen transition */}
            <ScreenPowerOnFlash key={flashKey} enabled={currentScreen !== SCREENS.BOOT} />
          </View>

          <Image
            source={batterySource}
            style={[styles.battery, fromDesignRect(70, 374, 24, 24)]}
            resizeMode="contain"
            pointerEvents="none"
          />

          {/* D-Pad */}
          <View style={[styles.dPadWrap, fromDesignRect(42, 910, 300, 300)]} pointerEvents="box-none">
            <Image source={dpadSprite} style={styles.dPadCenter} resizeMode="contain" pointerEvents="none" />
            <ShellButton style={styles.dPadLeft} onPressIn={() => onButtonPressIn('left')} onPressOut={() => onButtonPressOut('left')} pressed={effectivePressed.left} />
            <ShellButton style={styles.dPadRight} onPressIn={() => onButtonPressIn('right')} onPressOut={() => onButtonPressOut('right')} pressed={effectivePressed.right} />
            <ShellButton style={styles.dPadUp} onPressIn={() => onButtonPressIn('up')} onPressOut={() => onButtonPressOut('up')} pressed={effectivePressed.up} />
            <ShellButton style={styles.dPadDown} onPressIn={() => onButtonPressIn('down')} onPressOut={() => onButtonPressOut('down')} pressed={effectivePressed.down} />
            {DEBUG_LAYOUT && <View style={[styles.debugHitbox, styles.dPadLeft, { backgroundColor: 'rgba(255,0,0,0.25)' }]} pointerEvents="none" />}
            {DEBUG_LAYOUT && <View style={[styles.debugHitbox, styles.dPadRight, { backgroundColor: 'rgba(255,0,0,0.25)' }]} pointerEvents="none" />}
            {DEBUG_LAYOUT && <View style={[styles.debugHitbox, styles.dPadUp, { backgroundColor: 'rgba(255,0,0,0.25)' }]} pointerEvents="none" />}
            {DEBUG_LAYOUT && <View style={[styles.debugHitbox, styles.dPadDown, { backgroundColor: 'rgba(255,0,0,0.25)' }]} pointerEvents="none" />}
          </View>

          {/* A / B buttons */}
          <View style={styles.actionWrap} pointerEvents="box-none">
            <SpriteButton
              accessibilityLabel="A button"
              source={Sprites.faceAUp}
              pressedSource={Sprites.faceAPressed}
              style={[styles.actionA, fromDesignRect(588, 964, 109, 109)]}
              onPressIn={() => onButtonPressIn('a')}
              onPressOut={() => onButtonPressOut('a')}
              pressed={effectivePressed.a}
            />
            {DEBUG_LAYOUT && <View style={[styles.debugHitbox, fromDesignRect(588, 964, 109, 109), { backgroundColor: 'rgba(0,0,255,0.25)' }]} pointerEvents="none" />}
            <SpriteButton
              accessibilityLabel="B button"
              source={Sprites.faceBUp}
              pressedSource={Sprites.faceBAltUp}
              style={[styles.actionB, fromDesignRect(452, 1030, 109, 109)]}
              onPressIn={() => onButtonPressIn('b')}
              onPressOut={() => onButtonPressOut('b')}
              pressed={effectivePressed.b}
            />
            {DEBUG_LAYOUT && <View style={[styles.debugHitbox, fromDesignRect(452, 1030, 109, 109), { backgroundColor: 'rgba(0,0,255,0.25)' }]} pointerEvents="none" />}
          </View>

          {/* Select / Start */}
          <View style={styles.metaRow} pointerEvents="box-none">
            <SpriteButton
              accessibilityLabel="Select button"
              source={Sprites.selectUp}
              pressedSource={Sprites.selectUp}
              style={[styles.metaButton, fromDesignRect(215, 1326, 101, 65)]}
              onPressIn={() => onButtonPressIn('select')}
              onPressOut={() => onButtonPressOut('select')}
              pressed={effectivePressed.select}
            />
            {DEBUG_LAYOUT && <View style={[styles.debugHitbox, fromDesignRect(215, 1326, 101, 65), { backgroundColor: 'rgba(0,255,0,0.25)' }]} pointerEvents="none" />}
            <SpriteButton
              accessibilityLabel="Start button"
              source={Sprites.startUp}
              pressedSource={Sprites.startUp}
              style={[styles.metaButton, fromDesignRect(372, 1326, 101, 65)]}
              onPressIn={() => onButtonPressIn('start')}
              onPressOut={() => onButtonPressOut('start')}
              onLongPress={onStartLongPress}
              pressed={effectivePressed.start}
            />
            {DEBUG_LAYOUT && <View style={[styles.debugHitbox, fromDesignRect(372, 1326, 101, 65), { backgroundColor: 'rgba(0,255,0,0.25)' }]} pointerEvents="none" />}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: '#d7d0ca' },
  shell: { flex: 1, width: '100%', position: 'relative' },
  artboard: { flex: 1, position: 'relative' },
  backgroundImage: { position: 'absolute' },
  backgroundFill: { left: 0, top: 0, width: '100%', height: '100%' },
  screenWrap: {
    position: 'absolute',
    borderRadius: 10,
    overflow: 'hidden',
  },
  screenBackdrop: { ...StyleSheet.absoluteFillObject },
  battery: { position: 'absolute' },
  dPadWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  dPadCenter: { position: 'absolute', width: '100%', height: '100%' },
  dPadLeft: { position: 'absolute', left: 0, top: '50%', width: '42%', height: '28%', marginTop: '-14%' },
  dPadRight: { position: 'absolute', right: 0, top: '50%', width: '42%', height: '28%', marginTop: '-14%' },
  dPadUp: { position: 'absolute', top: 0, left: '50%', width: '28%', height: '42%', marginLeft: '-14%' },
  dPadDown: { position: 'absolute', bottom: 0, left: '50%', width: '28%', height: '42%', marginLeft: '-14%' },
  actionWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  actionA: { position: 'absolute' },
  actionB: { position: 'absolute' },
  metaRow: { ...StyleSheet.absoluteFillObject },
  metaButton: { position: 'absolute' },
  shellButton: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shellButtonPressed: { transform: [{ scale: 0.96 }] },
  spriteButton: { alignItems: 'center', justifyContent: 'center' },
  spriteButtonPressed: { transform: [{ scale: 0.97 }] },
  spriteImage: { width: '100%', height: '100%' },
  // Dark tint overlay shown on B/Start/Select when pressed (no dedicated pressed sprite)
  spritePressTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 4,
  },
  // Debug hitbox overlay — visible only when DEBUG_LAYOUT = true
  debugHitbox: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
});
