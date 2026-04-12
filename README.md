# GB Expo Emu

Expo-based Game Boy shell prototype with a JavaScript emulator core.

The shell uses the imported artwork from `/Users/shivam/Documents/GBSkinEmu/Sprites`, including the handheld background, screen frame, D-pad, A/B, Start/Select, battery icons, and the Press Start 2P font.

## Setup

```bash
npm install
npx expo start
```

## Notes

- The app is structured for both iOS and Android.
- ROM loading uses the Expo document picker.
- The shell keeps the controls positioned relative to the handheld background so the layout scales with the device.