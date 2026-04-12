import { Image, StyleSheet, Text, View } from 'react-native';

import { Sprites } from '../assets';

export function FrameDisplay({ frameUri, romName, statusText, isRunning }) {
  if (frameUri) {
    return (
      <Image
        source={{ uri: frameUri }}
        style={styles.frame}
        resizeMode="stretch"
      />
    );
  }

  return (
    <View style={styles.placeholder}>
      <Image source={Sprites.screen} style={styles.screenSprite} resizeMode="contain" />
      <Text style={styles.title}>{romName}</Text>
      <Text style={styles.subtitle}>{statusText}</Text>
      <Text style={styles.body}>
        {isRunning ? 'Waiting for the first frame' : 'Choose a ROM to start emulation'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    height: '100%',
    backgroundColor: '#7b7d1b',
  },
  placeholder: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  screenSprite: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.2,
  },
  title: {
    color: '#f1efdf',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: '#efe9b8',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    color: '#f7f0c3',
    fontSize: 12,
    textAlign: 'center',
  },
});