import { useEffect, useMemo, useRef, useState } from 'react';
import { Buffer } from 'buffer';
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Image, PixelRatio, Pressable, StyleSheet, Text, View } from 'react-native';

import { Sprites } from '../assets';
import { FrameDisplay } from './FrameDisplay';

const DESIGN_WIDTH = 750;
const DESIGN_HEIGHT = 1624;

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
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
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

function ShellButton({ label, style, onPressIn, onPressOut, pressed }) {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed: isPressed }) => [
        styles.shellButton,
        style,
        (pressed || isPressed) && styles.shellButtonPressed,
      ]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

function SpriteButton({ source, pressedSource, style, onPressIn, onPressOut, pressed, accessibilityLabel }) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed: isPressed }) => [styles.spriteButton, style, (pressed || isPressed) && styles.spriteButtonPressed]}
    >
      <Image source={pressed || false ? pressedSource : source} style={styles.spriteImage} resizeMode="stretch" />
    </Pressable>
  );
}

export function GameBoyShell({
  frameUri,
  onPickRom,
  onReset,
  onPressButton,
  buttonState,
  romName,
  statusText,
  isRunning,
}) {
  const [shellLayout, setShellLayout] = useState({ width: 1, height: 1 });
  const [localPressed, setLocalPressed] = useState({});
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const buttonSfxRef = useRef(null);
  const buttonSfxUriRef = useRef(null);
  const pressedRef = useRef({});
  const lastMetaPressAtRef = useRef({ start: 0, select: 0 });
  const comboWindowMs = 260;
  const snap = (value) => Math.round(PixelRatio.roundToNearestPixel(value));

  const closeMenu = () => {
    setMenuVisible(false);
  };

  const effectivePressed = useMemo(
    () => ({ ...buttonState, ...localPressed }),
    [buttonState, localPressed],
  );

  const menuItems = useMemo(
    () => [
      { label: 'Resume', action: () => closeMenu() },
      { label: 'Load ROM', action: () => { closeMenu(); onPickRom(); } },
      { label: 'Reset', action: () => { closeMenu(); onReset(); } },
    ],
    [onPickRom, onReset],
  );

  useEffect(() => {
    let mounted = true;

    async function prepareButtonSfx() {
      try {
        await setIsAudioActiveAsync(true);
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });

        const base64 = buildSquareWaveWavBase64({
          sampleRate: 44100,
          frequency: 820,
          durationSec: 0.07,
          amplitude: 0.55,
        });
        const fileUri = `${FileSystem.cacheDirectory}btn-8bit.wav`;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        buttonSfxUriRef.current = fileUri;

        if (mounted) {
          const player = createAudioPlayer({ uri: fileUri }, { keepAudioSessionActive: true });
          player.volume = 1;
          buttonSfxRef.current = player;
        } else {
          const tmpPlayer = createAudioPlayer({ uri: fileUri }, { keepAudioSessionActive: true });
          tmpPlayer.remove();
        }
      } catch (error) {
        // Audio feedback is optional for unsupported runtime paths.
      }
    }

    prepareButtonSfx();

    return () => {
      mounted = false;
      if (buttonSfxRef.current) {
        buttonSfxRef.current.remove();
      }
    };
  }, []);

  const playFeedback = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
    if (buttonSfxRef.current) {
      try {
        await buttonSfxRef.current.seekTo(0);
        buttonSfxRef.current.play();
      } catch (error) {
        // Keep UI responsive if audio backend fails.
      }
      return;
    }

    if (buttonSfxUriRef.current) {
      try {
        const fallbackPlayer = createAudioPlayer({ uri: buttonSfxUriRef.current }, { keepAudioSessionActive: true });
        fallbackPlayer.volume = 1;
        fallbackPlayer.play();
        setTimeout(() => fallbackPlayer.remove(), 1200);
      } catch (error) {
        // Audio fallback failed; continue without sound.
      }
    }
  };

  const onButtonPressIn = (button) => {
    const now = Date.now();
    pressedRef.current[button] = true;
    setLocalPressed((prev) => ({ ...prev, [button]: true }));
    playFeedback();

    if (menuVisible) {
      if (button === 'up') {
        setMenuIndex((value) => (value - 1 + menuItems.length) % menuItems.length);
        return;
      }
      if (button === 'down') {
        setMenuIndex((value) => (value + 1) % menuItems.length);
        return;
      }
      if (button === 'a') {
        menuItems[menuIndex].action();
        return;
      }
      if (button === 'b' || button === 'start') {
        closeMenu();
        return;
      }
      return;
    }

    if (button === 'start' || button === 'select') {
      const partnerButton = button === 'start' ? 'select' : 'start';
      const partnerPressed = Boolean(pressedRef.current[partnerButton]);
      const recentPartnerPress = now - (lastMetaPressAtRef.current[partnerButton] || 0) <= comboWindowMs;

      lastMetaPressAtRef.current[button] = now;

      if (partnerPressed || recentPartnerPress) {
        setMenuIndex(0);
        setMenuVisible(true);
        pressedRef.current.start = false;
        pressedRef.current.select = false;
        setLocalPressed((prev) => ({ ...prev, start: false, select: false }));
        onPressButton('start', false);
        onPressButton('select', false);
        return;
      }
    }

    onPressButton(button, true);
  };

  const onButtonPressOut = (button) => {
    pressedRef.current[button] = false;
    setLocalPressed((prev) => ({ ...prev, [button]: false }));
    if (!menuVisible) {
      onPressButton(button, false);
    }
  };

  const dpadSprite = effectivePressed.left
    ? Sprites.dpadLeft
    : effectivePressed.right
      ? Sprites.dpadRight
      : effectivePressed.up
        ? Sprites.dpadUp
        : effectivePressed.down
          ? Sprites.dpadDown
          : Sprites.dpadNeutral;

  const artFrame = useMemo(() => {
    return {
      x: 0,
      y: 0,
      width: snap(shellLayout.width),
      height: snap(shellLayout.height),
    };
  }, [shellLayout]);

  const fromDesignRect = (x, y, width, height) => ({
    position: 'absolute',
    left: snap(artFrame.x + (x / DESIGN_WIDTH) * artFrame.width),
    top: snap(artFrame.y + (y / DESIGN_HEIGHT) * artFrame.height),
    width: snap((width / DESIGN_WIDTH) * artFrame.width),
    height: snap((height / DESIGN_HEIGHT) * artFrame.height),
  });

  const batterySource = !isRunning
    ? Sprites.batteryLow
    : Object.values(effectivePressed).some(Boolean)
      ? Sprites.batteryCharging
      : Sprites.batteryCharged;

  return (
    <View style={styles.screenRoot}>
      <View style={styles.shell} onLayout={(event) => setShellLayout(event.nativeEvent.layout)}>
        <View style={styles.artboard}>
          <Image source={Sprites.background} style={[styles.backgroundImage, styles.backgroundFill]} resizeMode="stretch" pointerEvents="none" />

          <View style={[styles.screenWrap, fromDesignRect(130, 220, 500, 450)]}>
            <Image source={Sprites.screen} style={styles.screenBackdrop} resizeMode="stretch" pointerEvents="none" />
            <FrameDisplay
              frameUri={frameUri}
              romName={romName}
              statusText={statusText}
              isRunning={isRunning}
            />

            {menuVisible ? (
              <View style={styles.menuOverlay} pointerEvents="none">
                <Text style={styles.menuTitle}>MENU</Text>
                {menuItems.map((item, index) => (
                  <Text
                    key={item.label}
                    style={[styles.menuItem, index === menuIndex && styles.menuItemActive]}
                  >
                    {index === menuIndex ? `> ${item.label}` : `  ${item.label}`}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>

          <Image
            source={batterySource}
            style={[styles.battery, fromDesignRect(70, 374, 24, 24)]}
            resizeMode="contain"
            pointerEvents="none"
          />

          <View style={[styles.dPadWrap, fromDesignRect(42, 910, 300, 300)]} pointerEvents="box-none">
            <Image
              source={dpadSprite}
              style={styles.dPadCenter}
              resizeMode="contain"
              pointerEvents="none"
            />
            <ShellButton label="" style={styles.dPadLeft} onPressIn={() => onButtonPressIn('left')} onPressOut={() => onButtonPressOut('left')} pressed={effectivePressed.left} />
            <ShellButton label="" style={styles.dPadRight} onPressIn={() => onButtonPressIn('right')} onPressOut={() => onButtonPressOut('right')} pressed={effectivePressed.right} />
            <ShellButton label="" style={styles.dPadUp} onPressIn={() => onButtonPressIn('up')} onPressOut={() => onButtonPressOut('up')} pressed={effectivePressed.up} />
            <ShellButton label="" style={styles.dPadDown} onPressIn={() => onButtonPressIn('down')} onPressOut={() => onButtonPressOut('down')} pressed={effectivePressed.down} />
          </View>

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
            <SpriteButton
              accessibilityLabel="B button"
              source={Sprites.faceAUp}
              pressedSource={Sprites.faceAPressed}
              style={[styles.actionB, fromDesignRect(452, 1030, 109, 109)]}
              onPressIn={() => onButtonPressIn('b')}
              onPressOut={() => onButtonPressOut('b')}
              pressed={effectivePressed.b}
            />
          </View>

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
            <SpriteButton
              accessibilityLabel="Start button"
              source={Sprites.startUp}
              pressedSource={Sprites.startUp}
              style={[styles.metaButton, fromDesignRect(372, 1326, 101, 65)]}
              onPressIn={() => onButtonPressIn('start')}
              onPressOut={() => onButtonPressOut('start')}
              pressed={effectivePressed.start}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#d7d0ca',
  },
  shell: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  artboard: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
  },
  backgroundFill: {
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  screenWrap: {
    position: 'absolute',
    left: '13%',
    right: '13%',
    top: '6%',
    height: '31%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  screenBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 24, 8, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  menuTitle: {
    color: '#d9f57d',
    fontFamily: 'PressStart2P',
    fontSize: 11,
    marginBottom: 12,
  },
  menuItem: {
    color: '#dce7c5',
    fontFamily: 'PressStart2P',
    fontSize: 9,
    marginBottom: 8,
  },
  menuItemActive: {
    color: '#fff34c',
  },
  battery: {
    position: 'absolute',
  },
  dPadWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dPadCenter: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  dPadLeft: {
    position: 'absolute',
    left: 0,
    top: '50%',
    width: '42%',
    height: '28%',
    marginTop: '-14%',
  },
  dPadRight: {
    position: 'absolute',
    right: 0,
    top: '50%',
    width: '42%',
    height: '28%',
    marginTop: '-14%',
  },
  dPadUp: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: '28%',
    height: '42%',
    marginLeft: '-14%',
  },
  dPadDown: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    width: '28%',
    height: '42%',
    marginLeft: '-14%',
  },
  actionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  actionA: {
    position: 'absolute',
  },
  actionB: {
    position: 'absolute',
  },
  metaRow: {
    ...StyleSheet.absoluteFillObject,
  },
  metaButton: {
    position: 'absolute',
  },

  shellButton: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shellButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  buttonLabel: {
    color: '#202020',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  spriteButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spriteButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  spriteImage: {
    width: '100%',
    height: '100%',
  },
});