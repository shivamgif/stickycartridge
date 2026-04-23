# Architecture Reference

> Detailed design doc. Read CLAUDE.md first for the 2-minute summary.

---

## State Machine Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        GameBoyShell.js                           │
│  (sprite shell, renders screen area, routes button events)       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   Screen Area (scaled)                     │  │
│  │                                                            │  │
│  │   useGameBoyOS  ──────────────────────────────────────     │  │
│  │   current screen:                                          │  │
│  │                                                            │  │
│  │   BOOT ──auto──► HOME ──A on Library──► ROM_LIBRARY        │  │
│  │                    │                        │              │  │
│  │                    │                   A on ROM            │  │
│  │                    │                        ▼              │  │
│  │               A on Store         IN_GAME (emulator)        │  │
│  │                    │                        │              │  │
│  │                    ▼                   START pressed       │  │
│  │                  STORE                      ▼              │  │
│  │                                       PAUSE_MENU           │  │
│  │                                        │   │   │           │  │
│  │                                   Resume Settings Exit     │  │
│  │                                                            │  │
│  │   Any screen: Start+Select ──────────────► HOME           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [D-PAD]     [B]  [A]     [SELECT]  [START]                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Button Routing Logic

```
GameBoyShell receives onPressButton(button, isPressed)
│
├─ Always: check Start+Select combo window (260ms)
│    └─ if combo → navigate('HOME'), stopEmulator()
│
├─ if currentScreen === 'IN_GAME'
│    └─ forward to useGameboyEmulator.setButton(button, isPressed)
│       EXCEPT: Start press → navigate('PAUSE_MENU')
│
└─ else (any OS screen)
     └─ forward to currentScreenComponent via onButton prop
```

---

## useGameBoyOS API

```js
const {
  currentScreen,   // string: 'BOOT' | 'HOME' | 'ROM_LIBRARY' | 'IN_GAME' | ...
  screenProps,     // object: extra props for the current screen (e.g. { romPath })
  navigate,        // (screenName: string, props?: object) => void
  goBack,          // () => void — pops history stack, fallback to HOME
  resetToHome,     // () => void — clears history, goes to HOME (used by Start+Select)
} = useGameBoyOS();
```

**History stack:** Simple array ref. `navigate` pushes current screen. `goBack` pops. Max depth 10 (prevents memory leak on rapid navigation).

---

## OS Screen Component Contract

Every screen in `src/os/screens/` must follow this signature:

```js
// MODULE: ScreenName | ROLE: describe purpose | API: ScreenName
export default function ScreenName({
  buttonState,   // { up, down, left, right, a, b, start, select } — current hold state
  onButton,      // (button: string, isPressed: bool) => void — edge events (press/release)
  navigate,      // (screenName, props?) => void
  goBack,        // () => void
  // ...any screen-specific props from screenProps
}) { ... }
```

Screens must:
- Render entirely within the parent's bounds (screen area, no overflow)
- Use `PressStart2P` font via `fontFamily: 'PressStart2P'`
- Use DMG palette colors (see CLAUDE.md Design System)
- Handle `b` button press as "go back" (call `goBack()`)
- Never call native APIs directly (no `expo-document-picker` in screen components — delegate to hooks)

---

## useRomLibrary API

```js
const {
  roms,          // RomEntry[] — sorted by lastPlayed desc
  addRom,        // (filePath: string, fileName: string) => Promise<RomEntry>
  deleteRom,     // (id: string) => Promise<void>
  getLastPlayed, // () => RomEntry | null
  markPlayed,    // (id: string) => void
} = useRomLibrary();

// RomEntry shape:
// { id, name, filePath, addedAt, lastPlayed, size }
```

Storage: ROMs copied to `FileSystem.documentDirectory + 'roms/'`. Metadata in `roms-metadata.json` in same dir.

---

## useGameboyEmulator API (existing, for reference)

```js
const {
  frameUri,      // string | null — PNG data URI of current frame
  romName,       // string | null
  statusText,    // string — human-readable status
  isRunning,     // boolean
  buttonState,   // { up, down, left, right, a, b, start, select }
  pickRom,       // () => void — opens system file picker (use only from ROM_UPLOAD screen)
  reset,         // () => void
  setButton,     // (button: string, pressed: boolean) => void
} = useGameboyEmulator();
```

---

## Supabase Schema (Phase 5)

```sql
-- profiles
id uuid references auth.users primary key
username text unique
created_at timestamp

-- roms
id uuid primary key default gen_random_uuid()
owner_id uuid references profiles(id)
title text
description text
storage_path text        -- path in Supabase Storage bucket 'roms'
downloads int default 0
likes int default 0
created_at timestamp

-- rom_likes
user_id uuid references profiles(id)
rom_id uuid references roms(id)
primary key (user_id, rom_id)
```

Bucket: `roms` — private, owner read/write, authenticated download with disclaimer accepted flag.

---

## Sprite Asset Reference

All sprites in `assets/sprites/`, exported via `src/assets.js` as `Sprites.*`:

| Key | File | Use |
|-----|------|-----|
| `background` | Background2x.png | Full shell background |
| `screen` | Screen2x.png | Screen bezel overlay |
| `battery.charged` | Battery_charged2x.png | Status bar |
| `battery.charging` | Battery_charging2x.png | Status bar |
| `battery.low` | Battery_low2x.png | Status bar |
| `dpad.neutral` | Plus_unpressed2x.png | D-pad rest |
| `dpad.up/down/left/right` | Plus_pressed_*2x.png | D-pad pressed states |
| `buttonA.up/down` | Circle_unpressed/pressed2x.png | A button |
| `buttonB.up` | Pill_unpressed2x.png | B button |
| `start.up` | Pill_unpressed2x-1.png | Start button |
| `select.up` | Pill_unpressed2x.png | Select button |

Note: B, Start, Select currently share unpressed sprites. Pressed variants need to be added for full tactile feedback.

---

## Performance Notes

- Frame pipeline: emulator → ImageData → UPNG.encode → base64 → data URI → `<Image>`
- Throttled to 30fps (33ms min gap). Configurable via Settings (30/60fps).
- Each PNG encode allocates a new buffer — no current pooling. Acceptable at 30fps.
- `useCallback`/`useMemo` used on all GameBoyShell render props to prevent re-renders.
- OS screen components should be wrapped in `React.memo`.
