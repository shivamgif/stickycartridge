# GB Emu — Agent Handoff Document

> **READ THIS FIRST.** This file is the single source of truth for any AI agent working on this project. Update the "Current State" section at the end of every session.

---

## What This Is

A React Native + Expo app that emulates a Game Boy console. The entire UI is a sprite-based Game Boy shell. **Zero native phone UI should ever be visible** — all navigation (ROM loading, settings, social store) happens through the 8 sprite buttons on screen.

Platform: iOS + Android + Web. Portrait only. Expo SDK 54, React 19, New Architecture enabled.

---

## Module Map

| File | Role | Key Exports |
|------|------|-------------|
| `App.js` | Entry point, loads font, renders shell | — |
| `index.js` | Polyfills (Buffer, ImageData, AudioContext, etc.) | — |
| `src/assets.js` | Sprite asset `require()` registry | `Sprites` |
| `src/components/GameBoyShell.js` | Full-screen sprite shell + button routing | `GameBoyShell` |
| `src/components/FrameDisplay.js` | Renders emulator frame or placeholder | `FrameDisplay` |
| `src/components/ScanlinesOverlay.js` | Optional CRT scanlines layer over screen | `ScanlinesOverlay` |
| `src/emulator/useGameboyEmulator.js` | Wraps `gameboy-emulator` npm package | `useGameboyEmulator` |
| `src/utils/imageDataToDataUri.js` | ImageData → PNG data URI (upng-js) | `imageDataToDataUri` |
| `src/os/useGameBoyOS.js` | **OS state machine** — owns current screen + nav history | `useGameBoyOS` |
| `src/os/screens/BootScreen.js` | Animated boot logo, auto-advances to HOME | `BootScreen` |
| `src/os/screens/HomeScreen.js` | Clock + 3 icons: Play, Library, Store | `HomeScreen` |
| `src/os/screens/RomLibraryScreen.js` | Scrollable list of stored ROMs | `RomLibraryScreen` |
| `src/os/screens/RomUploadScreen.js` | Transient screen owning the file-picker flow | `RomUploadScreen` |
| `src/os/screens/PauseMenuScreen.js` | In-game pause: Resume/SaveState/LoadROM/Settings/Exit | `PauseMenuScreen` |
| `src/os/screens/SettingsScreen.js` | Palette, FPS, haptics, SFX, scanlines | `SettingsScreen` |
| `src/os/screens/StoreScreen.js` | Supabase-backed ROM community store | `StoreScreen` |
| `src/os/useRomLibrary.js` | Local ROM CRUD (expo-file-system + JSON metadata) | `useRomLibrary` |
| `src/os/useSaveStates.js` | SRAM auto-persistence + 3-slot save state snapshots | `useSaveStates` |
| `src/os/useStore.js` | Supabase fetch/upload/download/like for social store | `useStore` |
| `src/os/screens/SaveStateScreen.js` | 3-slot save/load/delete UI with D-pad navigation | `SaveStateScreen` |
| `src/lib/supabase.js` | Supabase client singleton, FileSystem session adapter | `supabase` |

---

## Button Contract

Every OS screen receives `{ buttonState, onButton }` props. This is the **only** input mechanism.

```
D-Pad Up/Down    → scroll list / navigate menu
D-Pad Left/Right → tab / page switch
A                → confirm / select
B                → back / cancel (go to previous screen)
Start            → pause game (IN_GAME) / open menu
Select           → secondary action (toggle option, show info)
Start + Select   → force-quit to HOME from anywhere
```

Buttons are handled in priority order:
1. `Start+Select` combo always fires force-quit (checked in `useGameBoyOS`)
2. If screen is `IN_GAME` → route buttons to emulator
3. Otherwise → route buttons to current OS screen component

---

## OS Screen States

```
BOOT → HOME → ROM_LIBRARY → (pick ROM) → IN_GAME
                          ↓
                       ROM_UPLOAD (opens system picker briefly, returns)
        HOME → STORE
IN_GAME → (START) → PAUSE_MENU → SETTINGS
                              → SAVE_STATES (3-slot save/load/delete)
                              → ROM_LIBRARY
                              → HOME
```

State machine lives in `useGameBoyOS`. Each screen is a pure component; `useGameBoyOS` passes `navigate`, `goBack`, `buttonState`.

---

## How to Add a New OS Screen

1. Create `src/os/screens/YourScreen.js`
2. Add file header: `// MODULE: YourScreen | ROLE: ... | API: YourScreen`
3. Component signature: `({ buttonState, navigate, goBack, ...screenProps }) => JSX`
4. Add state key to `SCREENS` constant in `useGameBoyOS.js`
5. Add case to the screen router in `GameBoyShell.js` (or `useGameBoyOS`)
6. Update PROGRESS.md

---

## Visual Design System

- **Design canvas:** 750 × 1624 px (375pt @2x)
- **Screen area (design coords):** x: 130–630, y: 220–670
- **Screen pixel size:** 160 × 144 (Game Boy native), scaled up to fill screen area
- **Palette:** DMG green (`#0f380f`, `#306230`, `#8bac0f`, `#9bbc0f`) — default
- **Font:** `PressStart2P-Regular` (loaded via expo-font)
- **All OS UI renders inside the screen area.** Never outside.

---

## Key Decisions & Why

| Decision | Reason |
|----------|--------|
| No React Navigation | Single screen, OS state machine replaces nav stack. Avoids nav chrome. |
| `gameboy-emulator` npm package | Pure JS, works in RN with polyfills. No native module needed. |
| `jsboy` included but unused | Was evaluated as fallback; may replace `gameboy-emulator` if issues arise. |
| Supabase for social store | Free tier, realtime, easy Expo JS client. No native SDK needed. |
| ROM sharing: user-responsibility | Users upload ROMs they own. Disclaimer shown on upload. App stores per-user in Supabase Storage. |
| Frame throttle at 30fps | Prevents JS thread saturation on mobile. Can be raised to 60 in settings. |

---

## Current State

**Phase:** Phase 7 complete — Save States & SRAM Persistence.

**Done:**
- [x] Sprite-based Game Boy shell with D-pad, A/B, Start/Select
- [x] Working emulator (gameboy-emulator) with ROM file picker
- [x] 30/60fps frame rendering pipeline (throttle driven by `settings.fps`)
- [x] Button SFX (square wave) + haptics (both togglable via Settings)
- [x] GameBoyOS state machine with BOOT → HOME → ROM_LIBRARY → IN_GAME flow
- [x] ROM Library (local storage, CRUD, markPlayed)
- [x] ROM_UPLOAD as dedicated OS screen
- [x] Settings screen: palette / fps / haptics / sfx / scanlines
- [x] Palette switching live, Scanlines overlay, Settings persisted via FileSystem
- [x] Social Store: browse, upload (with disclaimer), download, like/unlike
- [x] Supabase anonymous auth, FileSystem session persistence
- [x] Boot animation: spring logo drop, subtitle slide, 3× blink, screen fade
- [x] Screen power-on flash on every screen transition
- [x] B button: circle pressed sprite; Start/Select: pressed tint overlay
- [x] DEBUG_LAYOUT flag for button hitbox audit
- [x] SRAM auto-persistence (auto-save every 30s, on app background, on exit)
- [x] Save state snapshots (3 slots per ROM, full CPU+GPU+memory serialization)
- [x] Save State OS screen (SAVE/LOAD/DELETE per slot, delete confirmation)
- [x] Auto-load SRAM on ROM start, auto-save on Start+Select force-quit

**Pending user action:**
- [ ] Fill in `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` (get from Supabase dashboard → Settings → API)
- [ ] Run `supabase/schema.sql` in Supabase SQL Editor
- [ ] Create `roms` storage bucket (private) in Supabase dashboard

**Deferred / Future:**
- Custom palette hex editor in Settings (presets via L/R already work)
- Pressed sprite assets for Start/Select (would need new PNG files)
- Cloud save sync (Supabase Storage)

---

## Running the Project

```bash
cd "gb-expo-emu"
npx expo start          # Dev server (scan QR with Expo Go)
npx expo run:ios        # Native iOS build
npx expo run:android    # Native Android build
```

Requires: Node 18+, Expo CLI, Xcode (for iOS).
