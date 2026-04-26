// MODULE: ScreenPowerOnFlash | ROLE: White flash overlay on first screen power-on | API: ScreenPowerOnFlash

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

/**
 * Mounts as a bright white overlay and fades to transparent in ~280ms.
 * Re-mounts (via key prop change in parent) on each screen transition.
 * Pass `enabled={false}` to skip the flash (e.g. while BOOT screen is active).
 */
export default function ScreenPowerOnFlash({ enabled = true }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [enabled]);

  if (!enabled) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.flash, { opacity }]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  flash: {
    backgroundColor: '#c8e070', // warm DMG-green white — not pure white
    zIndex: 99,
  },
});
