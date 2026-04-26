// MODULE: BootScreen | ROLE: Animated boot logo, auto-advances to HOME | API: BootScreen

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

const LOGO_START_Y = -60; // drops from this offset above centre

export default function BootScreen({ onBootComplete }) {
  // Logo drop
  const logoY       = useRef(new Animated.Value(LOGO_START_Y)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Subtitle slide-in from below
  const subY       = useRef(new Animated.Value(10)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;

  // "PRESS START" blink
  const blink = useRef(new Animated.Value(1)).current;

  // Copyright fade-in
  const copyOpacity = useRef(new Animated.Value(0)).current;

  // Whole-screen fade out at the end
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // No-op handler so buttons don't crash during boot
    // (GameBoyShell's osButtonHandlerRef stays null; that's fine)

    Animated.sequence([
      // 1. Logo drops with spring bounce (~500ms)
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 120, useNativeDriver: true,
        }),
        Animated.spring(logoY, {
          toValue: 0,
          speed: 10,
          bounciness: 10,
          useNativeDriver: true,
        }),
      ]),

      // 2. Subtitle rises in (200ms after logo lands)
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(subOpacity, {
          toValue: 1, duration: 250, useNativeDriver: true,
        }),
        Animated.timing(subY, {
          toValue: 0, duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),

      // 3. Copyright fades in
      Animated.timing(copyOpacity, {
        toValue: 1, duration: 300, useNativeDriver: true,
      }),

      // 4. Hold + blink "PRESS START" 3 times (each blink = 300ms)
      Animated.delay(200),
      Animated.loop(
        Animated.sequence([
          Animated.timing(blink, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(blink, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      ),
      Animated.delay(300),

      // 5. Fade entire screen to black and advance
      Animated.timing(screenOpacity, {
        toValue: 0, duration: 350, useNativeDriver: true,
      }),
    ]).start(() => onBootComplete?.());
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      {/* Logo drop */}
      <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoY }] }}>
        <Text style={styles.logo}>GB</Text>
      </Animated.View>

      {/* Subtitle slide */}
      <Animated.View style={{ opacity: subOpacity, transform: [{ translateY: subY }] }}>
        <Text style={styles.sub}>EMU</Text>
        <Text style={styles.tagline}>GAME BOY EMULATOR</Text>
      </Animated.View>

      {/* Blink prompt */}
      <Animated.Text style={[styles.prompt, { opacity: blink }]}>
        PRESS START
      </Animated.Text>

      {/* Copyright */}
      <Animated.Text style={[styles.copy, { opacity: copyOpacity }]}>
        © 2025 GB EMU PROJECT
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#4C5800',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  logo: {
    fontFamily: 'PressStart2P',
    fontSize: 34,
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 6,
  },
  sub: {
    fontFamily: 'PressStart2P',
    fontSize: 14,
    color: '#111111',
    textAlign: 'center',
    letterSpacing: 8,
    marginTop: 2,
  },
  tagline: {
    fontFamily: 'PressStart2P',
    fontSize: 7,
    color: '#222222',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 1,
  },
  prompt: {
    fontFamily: 'PressStart2P',
    fontSize: 8,
    color: '#000000',
    marginTop: 18,
    letterSpacing: 1,
  },
  copy: {
    fontFamily: 'PressStart2P',
    fontSize: 7,
    color: '#111111',
    position: 'absolute',
    bottom: 8,
    letterSpacing: 0,
  },
});
