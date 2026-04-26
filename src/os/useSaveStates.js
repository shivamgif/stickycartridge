// MODULE: useSaveStates | ROLE: Save/load SRAM + save state snapshots to filesystem | API: useSaveStates

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';

const SAVES_DIR = `${FileSystem.documentDirectory}saves/`;
const SRAM_EXT = '.sram';
const STATE_EXT = '.state';
const MAX_SLOTS = 3;
const AUTO_SAVE_INTERVAL_MS = 30_000; // 30 seconds

// ── Helpers ────────────────────────────────────────────────────

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(SAVES_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(SAVES_DIR, { intermediates: true });
}

function sramPath(romId) {
  return `${SAVES_DIR}${romId}${SRAM_EXT}`;
}

function statePath(romId, slot) {
  return `${SAVES_DIR}${romId}_slot${slot}${STATE_EXT}`;
}

function stateMetaPath(romId) {
  return `${SAVES_DIR}${romId}_states.json`;
}

// ArrayBuffer → base64 string for filesystem storage
function bufferToBase64(ab) {
  return Buffer.from(new Uint8Array(ab)).toString('base64');
}

// base64 string → ArrayBuffer
function base64ToBuffer(b64) {
  const buf = Buffer.from(b64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

// ── SRAM persistence ──────────────────────────────────────────

async function writeSram(romId, sramData) {
  if (!sramData || sramData.byteLength === 0) return;
  await ensureDir();
  const b64 = bufferToBase64(sramData);
  await FileSystem.writeAsStringAsync(sramPath(romId), b64, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

async function readSram(romId) {
  try {
    const info = await FileSystem.getInfoAsync(sramPath(romId));
    if (!info.exists) return null;
    const b64 = await FileSystem.readAsStringAsync(sramPath(romId));
    return base64ToBuffer(b64);
  } catch {
    return null;
  }
}

// ── Save state snapshots ──────────────────────────────────────

async function readStateMeta(romId) {
  try {
    const path = stateMetaPath(romId);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return {};
    const raw = await FileSystem.readAsStringAsync(path);
    return JSON.parse(raw) ?? {};
  } catch {
    return {};
  }
}

async function writeStateMeta(romId, meta) {
  await ensureDir();
  await FileSystem.writeAsStringAsync(stateMetaPath(romId), JSON.stringify(meta));
}

/**
 * Capture a full emulator state snapshot.
 * We serialize everything we can access:
 * - Memory bytes (full 64KB address space)
 * - CPU registers (A, B, C, D, E, F, H, L, SP, PC)
 * - CPU flags (isInterruptMasterEnable)
 * - SRAM (if present)
 * - GPU colors (palette)
 */
function captureState(gameboy) {
  if (!gameboy) return null;

  const state = {};

  // Memory
  try {
    const memBytes = gameboy.memory.memoryBytes;
    if (memBytes) {
      state.memory = bufferToBase64(memBytes.buffer.slice(memBytes.byteOffset, memBytes.byteOffset + memBytes.byteLength));
    }
  } catch {}

  // CPU registers
  try {
    const regs = gameboy.cpu.registers;
    state.registers = {
      A: regs.A.value,
      B: regs.B.value,
      C: regs.C.value,
      D: regs.D.value,
      E: regs.E.value,
      F: regs.F.value,
      H: regs.H.value,
      L: regs.L.value,
      SP: regs.stackPointer.value,
      PC: regs.programCounter.value,
    };
    state.ime = gameboy.cpu.isInterruptMasterEnable;
  } catch {}

  // SRAM
  try {
    const sram = gameboy.getCartridgeSaveRam();
    if (sram && sram.byteLength > 0) {
      state.sram = bufferToBase64(sram);
    }
  } catch {}

  // GPU palette
  try {
    if (gameboy.gpu?.colors) {
      state.gpuColors = gameboy.gpu.colors;
    }
  } catch {}

  return state;
}

/**
 * Restore a full emulator state from a snapshot.
 */
function restoreState(gameboy, state) {
  if (!gameboy || !state) return false;

  // Memory
  try {
    if (state.memory) {
      const memData = base64ToBuffer(state.memory);
      const target = gameboy.memory.memoryBytes;
      if (target && memData.byteLength > 0) {
        const src = new Uint8Array(memData);
        const len = Math.min(src.length, target.length);
        for (let i = 0; i < len; i++) {
          target[i] = src[i];
        }
      }
    }
  } catch {}

  // CPU registers
  try {
    if (state.registers) {
      const regs = gameboy.cpu.registers;
      regs.A.value = state.registers.A;
      regs.B.value = state.registers.B;
      regs.C.value = state.registers.C;
      regs.D.value = state.registers.D;
      regs.E.value = state.registers.E;
      regs.F.value = state.registers.F;
      regs.H.value = state.registers.H;
      regs.L.value = state.registers.L;
      regs.stackPointer.value = state.registers.SP;
      regs.programCounter.value = state.registers.PC;
    }
    if (state.ime !== undefined) {
      gameboy.cpu.isInterruptMasterEnable = state.ime;
    }
  } catch {}

  // SRAM
  try {
    if (state.sram) {
      const sramData = base64ToBuffer(state.sram);
      gameboy.setCartridgeSaveRam(sramData);
    }
  } catch {}

  // GPU palette
  try {
    if (state.gpuColors) {
      gameboy.gpu.colors = state.gpuColors;
    }
  } catch {}

  return true;
}

// ── Hook ──────────────────────────────────────────────────────

export default function useSaveStates(emulatorRef) {
  const [slots, setSlots] = useState({}); // { 0: { timestamp, romId }, 1: ..., 2: ... }
  const [currentRomId, setCurrentRomId] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const currentRomIdRef = useRef(null);

  // Keep ref in sync
  useEffect(() => {
    currentRomIdRef.current = currentRomId;
  }, [currentRomId]);

  // Load slot metadata when ROM changes
  useEffect(() => {
    if (!currentRomId) {
      setSlots({});
      return;
    }
    readStateMeta(currentRomId).then(setSlots);
  }, [currentRomId]);

  // ── SRAM: auto-load on ROM start ──

  const loadSram = useCallback(async (romId) => {
    const gameboy = emulatorRef.current;
    if (!gameboy || !romId) return;

    const sramData = await readSram(romId);
    if (sramData) {
      try {
        gameboy.setCartridgeSaveRam(sramData);
      } catch {}
    }
  }, [emulatorRef]);

  // ── SRAM: save to filesystem ──

  const saveSram = useCallback(async (romId) => {
    const gameboy = emulatorRef.current;
    if (!gameboy || !romId) return;
    try {
      const sram = gameboy.getCartridgeSaveRam();
      if (sram && sram.byteLength > 0) {
        await writeSram(romId, sram);
      }
    } catch {}
  }, [emulatorRef]);

  // ── SRAM: register auto-save on cartridge RAM writes ──

  const registerSramCallback = useCallback((romId) => {
    const gameboy = emulatorRef.current;
    if (!gameboy) return;
    try {
      gameboy.setOnWriteToCartridgeRam(() => {
        // Debounce: the auto-save interval handles periodic writes
        // This callback is just a signal that SRAM has changed
      });
    } catch {}
  }, [emulatorRef]);

  // ── SRAM: periodic auto-save (every 30s) ──

  useEffect(() => {
    if (!currentRomId) {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
      return;
    }

    autoSaveTimerRef.current = setInterval(() => {
      if (currentRomIdRef.current) {
        saveSram(currentRomIdRef.current);
      }
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [currentRomId, saveSram]);

  // ── SRAM: auto-save when app goes to background ──

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        const romId = currentRomIdRef.current;
        if (romId) {
          saveSram(romId);
        }
      }
    });
    return () => sub.remove();
  }, [saveSram]);

  // ── Save state: save to slot ──

  const saveState = useCallback(async (slot) => {
    const gameboy = emulatorRef.current;
    const romId = currentRomIdRef.current;
    if (!gameboy || !romId || slot < 0 || slot >= MAX_SLOTS) return false;

    const state = captureState(gameboy);
    if (!state) return false;

    await ensureDir();
    const path = statePath(romId, slot);
    await FileSystem.writeAsStringAsync(path, JSON.stringify(state));

    const meta = await readStateMeta(romId);
    meta[slot] = {
      timestamp: new Date().toISOString(),
      romId,
    };
    await writeStateMeta(romId, meta);
    setSlots({ ...meta });
    return true;
  }, [emulatorRef]);

  // ── Save state: load from slot ──

  const loadState = useCallback(async (slot) => {
    const gameboy = emulatorRef.current;
    const romId = currentRomIdRef.current;
    if (!gameboy || !romId || slot < 0 || slot >= MAX_SLOTS) return false;

    const path = statePath(romId, slot);
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return false;
      const raw = await FileSystem.readAsStringAsync(path);
      const state = JSON.parse(raw);
      return restoreState(gameboy, state);
    } catch {
      return false;
    }
  }, [emulatorRef]);

  // ── Save state: delete slot ──

  const deleteState = useCallback(async (slot) => {
    const romId = currentRomIdRef.current;
    if (!romId || slot < 0 || slot >= MAX_SLOTS) return;

    const path = statePath(romId, slot);
    try {
      await FileSystem.deleteAsync(path, { idempotent: true });
    } catch {}

    const meta = await readStateMeta(romId);
    delete meta[slot];
    await writeStateMeta(romId, meta);
    setSlots({ ...meta });
  }, []);

  // ── Called when a ROM is loaded ──

  const onRomLoaded = useCallback(async (romId) => {
    setCurrentRomId(romId);
    await loadSram(romId);
    registerSramCallback(romId);
  }, [loadSram, registerSramCallback]);

  // ── Called when leaving a game ──

  const onRomUnloaded = useCallback(async () => {
    const romId = currentRomIdRef.current;
    if (romId) await saveSram(romId);
    setCurrentRomId(null);
  }, [saveSram]);

  return {
    slots,
    currentRomId,
    saveState,
    loadState,
    deleteState,
    saveSram,
    loadSram,
    onRomLoaded,
    onRomUnloaded,
    MAX_SLOTS,
  };
}
