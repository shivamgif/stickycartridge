# Progress Tracker

> Living checklist. Never delete history — check items off. Add new items as discovered.
> Format: `- [x] done` / `- [ ] pending` / `- [~] in progress`

---

## Phase 1 — Agent Memory System
- [x] CLAUDE.md created (agent handoff master doc)
- [x] ARCHITECTURE.md created (state machine, button contract, API specs)
- [x] PROGRESS.md created (this file)

## Phase 2 — GameBoyOS State Machine
- [ ] `src/os/useGameBoyOS.js` — state machine hook
- [ ] `src/os/screens/BootScreen.js` — animated boot logo
- [ ] `src/os/screens/HomeScreen.js` — clock + 3 icons
- [ ] `src/os/screens/RomLibraryScreen.js` — scrollable ROM list
- [ ] `src/os/screens/PauseMenuScreen.js` — in-game pause menu
- [ ] `src/os/screens/SettingsScreen.js` — gameplay options
- [ ] `src/components/GameBoyShell.js` updated — inline menu replaced with OS screens
- [ ] `src/emulator/useGameboyEmulator.js` updated — expose saveState/loadState

## Phase 3 — ROM Library (Local Storage)
- [ ] `src/os/useRomLibrary.js` — CRUD hook
- [ ] ROMs persisted in `FileSystem.documentDirectory/roms/`
- [ ] Metadata JSON with name, lastPlayed, size
- [ ] ROM_UPLOAD screen (wraps system picker, returns to shell)
- [ ] Delete ROM from library via menu

## Phase 4 — Settings
- [ ] Color palette switching (DMG green / grey / pocket)
- [ ] Frame rate cap toggle (30 / 60 fps)
- [ ] Haptic feedback toggle
- [ ] Button SFX toggle
- [ ] Scanlines effect overlay
- [ ] Settings persisted via AsyncStorage

## Phase 5 — Social Store (Supabase)
- [ ] Supabase project created, credentials in env
- [ ] `src/os/useStore.js` — fetch/upload hook
- [ ] `src/os/screens/StoreScreen.js` — browseable ROM grid
- [ ] Auth flow (anonymous → account on upload)
- [ ] ROM upload with disclaimer modal
- [ ] ROM download + add to local library
- [ ] Like / rating system
- [ ] All UI in GB palette, PressStart2P font

## Phase 6 — Sprite Alignment & Polish
- [ ] Audit button positions on iPhone SE, iPhone 16 Pro Max, iPad
- [ ] Add pressed sprites for B, Start, Select buttons
- [ ] Scanlines overlay component
- [ ] Boot animation (GB logo drop)
- [ ] Screen power-on animation (white flash → fade in)
- [ ] Settings: custom color palette editor

---

## Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-04-23 | Supabase for backend | Free tier, easy Expo JS client, realtime support |
| 2026-04-23 | User-responsibility ROM sharing | Users confirm they own rights; app stores per-user |
| 2026-04-23 | No React Navigation | State machine replaces nav; avoids native chrome |
| 2026-04-23 | Keep `gameboy-emulator` as primary | Working, validated with polyfills. `jsboy` is fallback. |

---

## Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| Button sprites for B/Start/Select have no pressed state | Open | Sprites need new assets or reuse existing |
| Some sprite positions may misalign on non-375pt screens | Open | Phase 6 audit item |
| `jsboy` in package.json but unused | Open | Leave for now, evaluate as MBC5 fallback |
| SharedArrayBuffer not available → APU audio disabled on most devices | Open | Platform limitation; consider AudioWorklet polyfill |
