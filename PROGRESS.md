# Progress Tracker

> Living checklist. Never delete history — check items off. Add new items as discovered.
> Format: `- [x] done` / `- [ ] pending` / `- [~] in progress`

---

## Phase 1 — Agent Memory System
- [x] CLAUDE.md created (agent handoff master doc)
- [x] ARCHITECTURE.md created (state machine, button contract, API specs)
- [x] PROGRESS.md created (this file)

## Phase 2 — GameBoyOS State Machine
- [x] `src/os/useGameBoyOS.js` — state machine hook (navigate, goBack, resetToHome)
- [x] `src/os/screens/BootScreen.js` — animated boot logo, auto-advances
- [x] `src/os/screens/HomeScreen.js` — clock + Play/Library/Store menu
- [x] `src/os/screens/RomLibraryScreen.js` — scrollable ROM list + delete confirm
- [x] `src/os/screens/PauseMenuScreen.js` — Resume/LoadROM/Settings/Exit
- [x] `src/os/screens/SettingsScreen.js` — palette/fps/haptics/sfx/scanlines
- [x] `src/os/screens/StoreScreen.js` — placeholder (Phase 5)
- [x] `src/components/GameBoyShell.js` — full rewrite with OS routing
- [x] `src/emulator/useGameboyEmulator.js` — added `loadRomBuffer(data, name)`
- [x] `src/os/useSettings.js` — settings persistence to filesystem
- [x] `App.js` — updated props (removed onPickRom, added loadRomBuffer)

## Phase 3 — ROM Library (Local Storage)
- [x] `src/os/useRomLibrary.js` — CRUD hook (pickNew, loadRomData, deleteRom, markPlayed)
- [x] ROMs persisted in `FileSystem.documentDirectory/roms/`
- [x] Metadata JSON with name, lastPlayed, size
- [x] ROM selection from library via D-pad + A
- [x] Delete ROM via SELECT button + confirm
- [x] ROM_UPLOAD as dedicated screen (`RomUploadScreen.js`) — navigates from library, auto-fires picker, goBack on cancel

## Phase 4 — Settings
- [x] Color palette switching (DMG green / grey / pocket) — applied to `gameboy.gpu.colors` live
- [x] Frame rate cap toggle (30 / 60 fps) — throttle in `useGameboyEmulator` uses `settingsRef`
- [x] Haptic feedback toggle — `settings.haptics` checked in `playFeedback`
- [x] Button SFX toggle — `settings.sfx` checked in `playFeedback`
- [x] Scanlines effect overlay — `ScanlinesOverlay` component inside `screenWrap`
- [x] Settings persisted via FileSystem JSON (expo-file-system, `useSettings`)
- [x] Settings lifted to App.js — shared between emulator and shell, no double-load

## Phase 5 — Social Store (Supabase)
- [x] `@supabase/supabase-js` installed
- [x] `.env.example` + `supabase/schema.sql` — setup docs
- [x] `src/lib/supabase.js` — client singleton with FileSystem session storage
- [x] `src/os/useStore.js` — fetch, upload, download, like/unlike hook
- [x] `src/os/screens/StoreScreen.js` — browseable ROM grid with D-pad nav
- [x] Auth flow — anonymous sign-in on first launch (Supabase anonymous auth)
- [x] ROM upload with disclaimer modal (in-screen consent before upload)
- [x] ROM download + auto-added to local library + loaded in emulator
- [x] Like / unlike system — optimistic updates with rollback
- [x] All UI in GB palette, PressStart2P font
- [ ] Supabase project created, credentials in .env ← USER ACTION NEEDED

## Phase 6 — Sprite Alignment & Polish
- [x] Audit button positions — `DEBUG_LAYOUT` flag in GameBoyShell shows coloured hitbox overlays
- [x] Pressed sprites for B, Start, Select — dark tint overlay (`spritePressTint`) + scale 0.97, no new assets needed
- [x] Scanlines overlay component ← done in Phase 4 (ScanlinesOverlay.js)
- [x] Boot animation — BootScreen rewritten: spring logo drop, subtitle slide, 3× blink, fade-to-black
- [x] Screen power-on animation — `ScreenPowerOnFlash` re-mounts on every screen transition
- [ ] Settings: custom color palette editor — deferred (L/R cycling in SettingsScreen covers presets)

## Phase 7 — Save States & SRAM Persistence
- [ ] 7.1 — SRAM auto-save (battery-backed cartridge RAM persisted to `saves/{romId}.sram` on pause/exit/30s interval)
- [ ] 7.2 — Save state snapshots (full CPU+GPU+memory serialization, up to 3 slots per ROM)
- [ ] 7.3 — Save State OS screen (accessible from Pause Menu: 3 slots with timestamp + thumbnail, Save/Load/Delete)
- [ ] 7.4 — Auto-save on app background (hook `AppState` changes to auto-save SRAM + quick-save)
- [ ] 7.5 — Cloud sync (optional — sync save files to Supabase Storage, keyed by user ID)

## Phase 8 — Audio Engine
- [ ] 8.1 — AudioContext bridge (Web Audio API bridge: read APU register writes, synthesize 4 channels in real-time)
- [ ] 8.2 — Expo Audio integration (native: ring-buffer PCM approach with `expo-audio`)
- [ ] 8.3 — Volume control in Settings (0–100% via L/R control)
- [ ] 8.4 — Per-channel mute (advanced: toggle individual APU channels)
- [ ] 8.5 — Audio latency tuning (buffer size: Low/Medium/High in Settings)

## Phase 9 — Performance & Rendering Pipeline
- [ ] 9.1 — Canvas-based rendering (Web) — render directly to `<canvas>`, skip PNG encode
- [ ] 9.2 — Pixel buffer rendering (Native) — `react-native-skia` or raw GL surface for direct pixel blit
- [ ] 9.3 — Frame double-buffering (prevent torn frames during slow encodes)
- [ ] 9.4 — Consistent 60fps (true 60fps render loop with canvas/Skia)
- [ ] 9.5 — CPU profiling & FPS counter overlay (dev mode only)
- [ ] 9.6 — Web Worker emulation (Web) — move emulator core to Web Worker

## Phase 10 — Game Boy Color (GBC) Support
- [ ] 10.1 — GBC mode detection (read cartridge header byte 0x0143 for CGB flag)
- [ ] 10.2 — Extended palette support (8 BG + 8 sprite palettes, 15-bit RGB)
- [ ] 10.3 — VRAM banking (2 VRAM banks for GBC)
- [ ] 10.4 — Double-speed CPU mode (4MHz ↔ 8MHz toggle)
- [ ] 10.5 — GBC boot screen (animated GBC logo instead of DMG boot)
- [ ] 10.6 — Cartridge type expansion (add MBC5 to `SUPPORTED_CARTRIDGE_TYPES`, evaluate `jsboy` as fallback)

## Phase 11 — Multiplayer & Link Cable
- [ ] 11.1 — Local link cable (two emulator instances, split-screen, serial port bridging)
- [ ] 11.2 — Online link cable (WebSocket/Supabase Realtime-based serial bridge)
- [ ] 11.3 — Link Cable OS screen (Host/Join, lobby code, connection status)
- [ ] 11.4 — Latency compensation (frame-sync or input-delay for network jitter)

## Phase 12 — Accessibility & Input Enhancements
- [ ] 12.1 — Keyboard support (Web/iPad) — Arrow keys → D-pad, Z/X → B/A, Enter → Start, Shift → Select
- [ ] 12.2 — Gamepad/controller support (Gamepad API on Web, `react-native-game-pad` for Bluetooth)
- [ ] 12.3 — Button remapping (custom key/gamepad mappings in Settings, persisted)
- [ ] 12.4 — Turbo/auto-fire (hold Select+A/B to toggle 30fps turbo on that button)
- [ ] 12.5 — Screen scaling options (integer scaling, stretch-to-fill, original 1:1)
- [ ] 12.6 — Fast-forward (Select+Start for 2×/4× speed, configurable max in Settings)
- [ ] 12.7 — Responsive sprite scaling (fix misalignment on non-375pt screens)

## Phase 13 — App Store Readiness
- [ ] 13.1 — App icons & splash screen (GB-style icon, all required sizes via `expo-splash-screen`)
- [ ] 13.2 — Legal disclaimer flow (first-launch modal: "You must own the games you load")
- [ ] 13.3 — Privacy policy & Terms (static page, linked from Settings)
- [ ] 13.4 — Crash reporting (Sentry or Bugsnag integration)
- [ ] 13.5 — Analytics (opt-in, basic usage: screens used, session length)
- [ ] 13.6 — Deep linking (`stickybuttons://rom/{storeId}`)
- [ ] 13.7 — OTA updates (`expo-updates` for over-the-air JS bundle updates)
- [ ] 13.8 — EAS Build config (`eas.json` for production iOS/Android builds with signing)

## Phase 14 — Community & Monetization
- [ ] 14.1 — User profiles (replace anonymous auth with email/Apple/Google sign-up)
- [ ] 14.2 — ROM ratings & reviews (1–5 stars + short text reviews in Store)
- [ ] 14.3 — Collections/playlists (named ROM collections, e.g. "RPGs", "Puzzle Games")
- [ ] 14.4 — Achievement system (play time tracking, badges: "First ROM loaded", "10 saves made", etc.)
- [ ] 14.5 — Premium shell skins (alternate GB shell sprites via IAP or achievements)
- [ ] 14.6 — Tip jar / Donate (one-time payment option)

---

## Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-04-23 | Supabase for backend | Free tier, easy Expo JS client, realtime support |
| 2026-04-23 | User-responsibility ROM sharing | Users confirm they own rights; app stores per-user |
| 2026-04-23 | No React Navigation | State machine replaces nav; avoids native chrome |
| 2026-04-23 | Keep `gameboy-emulator` as primary | Working, validated with polyfills. `jsboy` is fallback. |
| 2026-04-27 | B button switched to circle sprites | Matches A button shape; enables proper pressed state |

---

## Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| ~~Button sprites for B have no pressed state~~ | ✅ Fixed | B now uses Circle sprites with pressed variant |
| Start/Select have no pressed sprite assets | Open | Still using tint overlay; need dedicated pressed PNGs |
| Some sprite positions may misalign on non-375pt screens | Open | Phase 12.7 |
| `jsboy` in package.json but unused | Open | Evaluate as MBC5 fallback in Phase 10 |
| SharedArrayBuffer not available → APU audio disabled on most devices | Open | Phase 8 will address this |
