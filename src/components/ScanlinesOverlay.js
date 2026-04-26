// MODULE: ScanlinesOverlay | ROLE: Visual scanlines effect over the GB screen | API: ScanlinesOverlay

import { StyleSheet, View } from 'react-native';

const LINE_COUNT = 72; // Game Boy is 144px tall → one dark line per 2 native pixels

const lines = Array.from({ length: LINE_COUNT }, (_, i) => i);

/**
 * Renders a fixed grid of semi-transparent horizontal bars that simulate
 * the CRT scanline look of the original Game Boy LCD.
 *
 * Must be placed *after* screen content inside the screenWrap so it renders on top.
 */
export default function ScanlinesOverlay({ visible }) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {lines.map((i) => (
        <View
          key={i}
          style={[
            styles.line,
            { top: `${(i / LINE_COUNT) * 100}%`, height: `${100 / LINE_COUNT / 2}%` },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
});
