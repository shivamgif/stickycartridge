# GB Expo Emu

GB Expo Emu is a React Native + Expo Game Boy shell app that embeds a JavaScript Game Boy core and custom handheld UI artwork.

The project focuses on:
- A sprite-accurate handheld shell UI
- On-screen touch controls (D-pad, A/B, Start/Select)
- ROM picker flow for `.gb` and `.gbc`
- Web + iOS/Android runtime support (with runtime-specific limitations)

## Tech Stack

- Expo SDK 54
- React Native 0.81 / React 19
- Emulator core: `gameboy-emulator`
- Audio/haptics: `expo-audio`, `expo-haptics`
- ROM picking: `expo-document-picker`

## Project Structure

- [App.js](App.js): Root app composition and font loading.
- [index.js](index.js): Runtime/polyfill bootstrap.
- [src/components/GameBoyShell.js](src/components/GameBoyShell.js): Handheld shell UI, controls, in-screen menu.
- [src/components/FrameDisplay.js](src/components/FrameDisplay.js): Emulator frame/placeholder display.
- [src/emulator/useGameboyEmulator.js](src/emulator/useGameboyEmulator.js): Emulator lifecycle, ROM loading, mapper checks, input wiring.
- [src/assets.js](src/assets.js): Sprite asset registry.
- [src/utils/imageDataToDataUri.js](src/utils/imageDataToDataUri.js): Frame conversion helper.

## Prerequisites

- Node.js 18+
- npm
- Expo Go on phone for quick testing (optional)

For native run builds (outside Expo Go), you also need platform toolchains:
- iOS: Xcode
- Android: Android Studio / SDK

## Installation

```bash
npm install
```

## Running the App

### 1) Start Metro

```bash
npm run start
```

If you hit stale-cache behavior, run:

```bash
npx expo start --clear
```

### 2) Web

```bash
npm run web
```

### 3) iPhone / Android with Expo Go

From Metro, scan the QR code in Expo Go.

If LAN is unstable, use tunnel mode:

```bash
npx expo start --go --host tunnel --clear --port 8081
```

## Controls

- D-pad: movement
- `A`, `B`: action buttons
- `START`, `SELECT`: game buttons
- Menu open: press `START + SELECT` together (combo gesture)

### In-Screen Menu

- Up/Down: navigate menu
- A: confirm
- B or Start: close menu

## ROM Support

The app accepts `.gb` and `.gbc` files in picker flow.

Current emulator-core mapper support in this project:
- ROM only (`0x00`)
- MBC1 (`0x01`, `0x02`, `0x03`)
- MBC3 (`0x0F`, `0x10`, `0x11`, `0x12`, `0x13`)

Unsupported mappers (for example many MBC5 games) are rejected with a clear in-app status message.

## Known Limitations

1. Emulator core compatibility
- `gameboy-emulator` does not support all cartridge mappers.

2. Web audio constraints
- Browser audio path may require `SharedArrayBuffer` and cross-origin isolation for full threaded audio behavior.

3. Mobile performance
- This setup runs a JS emulator core plus frame conversion on the JS thread, so performance varies by device/runtime.

## Troubleshooting

### ROM loads but game does not proceed
- Ensure your ROM mapper is supported (ROM/MBC1/MBC3).
- Try a known compatible title (for example MBC1/MBC3-based GB games).

### Inputs seem unresponsive
- Verify you are not triggering menu combo accidentally.
- Test `START` independently for title-screen progression.

### App feels slow
- Run with clean cache: `npx expo start --clear`
- Test web and native separately to compare runtime overhead.
- Use a physical device rather than simulator when possible.

### Dependency / config health check

```bash
npx expo-doctor
```

## Legal

Use only ROMs you legally own and are permitted to use in your region.