import { useCallback, useEffect, useRef, useState } from 'react';
import { Buffer } from 'buffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { encodeBMP } from '../utils/FastBMP';

const initialButtons = {
  up: false,
  down: false,
  left: false,
  right: false,
  a: false,
  b: false,
  start: false,
  select: false,
};

function syncInputs(gameboy, state) {
  gameboy.input.isPressingUp = state.up;
  gameboy.input.isPressingDown = state.down;
  gameboy.input.isPressingLeft = state.left;
  gameboy.input.isPressingRight = state.right;
  gameboy.input.isPressingA = state.a;
  gameboy.input.isPressingB = state.b;
  gameboy.input.isPressingStart = state.start;
  gameboy.input.isPressingSelect = state.select;
}

async function readRomAsArrayBuffer(asset) {
  // Web path: DocumentPicker exposes a browser File object with arrayBuffer().
  if (asset?.file && typeof asset.file.arrayBuffer === 'function') {
    return asset.file.arrayBuffer();
  }

  const uri = asset?.uri;
  if (!uri) {
    throw new Error('Missing ROM URI');
  }

  const encoding = FileSystem.EncodingType?.Base64 ?? 'base64';
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding });
  const bytes = Buffer.from(base64, 'base64');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function isSupportedRomFilename(name = '') {
  const lower = name.toLowerCase();
  return lower.endsWith('.gb') || lower.endsWith('.gbc');
}

const CARTRIDGE_TYPE_OFFSET = 0x0147;
const SUPPORTED_CARTRIDGE_TYPES = new Set([
  0x00, // ROM
  0x01, // MBC1
  0x02, // MBC1+RAM
  0x03, // MBC1+RAM+BATTERY
  0x0f, // MBC3+TIMER+BATTERY
  0x10, // MBC3+TIMER+RAM+BATTERY
  0x11, // MBC3
  0x12, // MBC3+RAM
  0x13, // MBC3+RAM+BATTERY
]);

function getCartridgeTypeByte(romData) {
  if (!romData || romData.byteLength <= CARTRIDGE_TYPE_OFFSET) {
    return null;
  }

  return new DataView(romData).getUint8(CARTRIDGE_TYPE_OFFSET);
}

export function useGameboyEmulator(settings = {}) {
  const emulatorRef = useRef(null);
  const startedRef = useRef(false);
  const lastFrameEncodeAtRef = useRef(0);
  const lastFrameHashRef = useRef(0);

  const [frameUri, setFrameUri] = useState(null);
  const [romName, setRomName] = useState('No ROM loaded');
  const [statusText, setStatusText] = useState('Load a ROM to start');
  const [isRunning, setIsRunning] = useState(false);
  const [buttonState, setButtonState] = useState(initialButtons);
  const [isCoreReady, setIsCoreReady] = useState(false);

  // Settings refs to avoid restarting the emulator when they change
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
    
    const gameboy = emulatorRef.current;
    if (gameboy && gameboy.gpu && settings.palette) {
      const PALETTES = {
        DMG: [
          { red: 155, green: 188, blue: 15 },
          { red: 139, green: 172, blue: 15 },
          { red: 48,  green: 98,  blue: 48 },
          { red: 15,  green: 56,  blue: 15 },
        ],
        POCKET: [
          { red: 196, green: 207, blue: 161 },
          { red: 139, green: 149, blue: 109 },
          { red: 77,  green: 83,  blue: 60  },
          { red: 31,  green: 31,  blue: 31  },
        ],
        GREY: [
          { red: 224, green: 224, blue: 224 },
          { red: 160, green: 160, blue: 160 },
          { red: 80,  green: 80,  blue: 80  },
          { red: 32,  green: 32,  blue: 32  },
        ]
      };
      const colors = PALETTES[settings.palette] || PALETTES.DMG;
      gameboy.gpu.colors = colors;
    }
  }, [settings.palette]);

  useEffect(() => {
    try {
      const { Gameboy } = require('gameboy-emulator');
      const gameboy = new Gameboy();
      emulatorRef.current = gameboy;
      setIsCoreReady(true);

      gameboy.onFrameFinished((imageData) => {
        const now = Date.now();
        const settings = settingsRef.current;
        const fpsThrottle = settings?.fps === '60' ? 14 : 30; // Slightly under to allow for jitter
        
        if (now - lastFrameEncodeAtRef.current < fpsThrottle) {
          return;
        }

        // Quick hash of pixel buffer to detect changes (every 16th pixel for speed)
        const pixels = imageData.data;
        let hash = 0;
        for (let i = 0; i < pixels.length; i += 64) {
          hash = (hash << 5) - hash + pixels[i];
          hash |= 0;
        }

        if (hash === lastFrameHashRef.current) {
          return;
        }

        lastFrameHashRef.current = hash;
        lastFrameEncodeAtRef.current = now;

        // BMP encoding is uncompressed and extremely fast on mobile CPU
        const nextFrame = encodeBMP(pixels.buffer, imageData.width, imageData.height);
        if (nextFrame) {
          setFrameUri(nextFrame);
        }
      });
    } catch (error) {
      setIsCoreReady(false);
      const detail = error?.message ? ` (${error.message})` : '';
      setStatusText(`Failed to initialize emulator core on this runtime${detail}`);
      console.error('Emulator init failed:', error);
    }

    return () => {
      emulatorRef.current = null;
    };
  }, []);

  const setButton = useCallback((button, pressed) => {
    const gameboy = emulatorRef.current;
    if (!gameboy) {
      return;
    }

    setButtonState((current) => {
      const next = { ...current, [button]: pressed };
      syncInputs(gameboy, next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const gameboy = emulatorRef.current;
    if (!gameboy) {
      return;
    }

    gameboy.memory.reset();
    setStatusText('Emulator reset');
  }, []);

  // Load a ROM from a pre-read ArrayBuffer (used by ROM library).
  const loadRomBuffer = useCallback(async (romData, name) => {
    const gameboy = emulatorRef.current;
    if (!gameboy) {
      setStatusText('Emulator core unavailable');
      return false;
    }

    const cartridgeType = getCartridgeTypeByte(romData);
    if (cartridgeType === null || !SUPPORTED_CARTRIDGE_TYPES.has(cartridgeType)) {
      const hexType = cartridgeType === null ? 'unknown' : `0x${cartridgeType.toString(16).padStart(2, '0')}`;
      setStatusText(`Unsupported cartridge type ${hexType}`);
      setIsRunning(false);
      return false;
    }

    gameboy.loadGame(romData);

    const supportsSharedArrayBuffer = typeof globalThis.SharedArrayBuffer !== 'undefined';
    if (supportsSharedArrayBuffer) {
      try { gameboy.apu.enableSound(); } catch {}
    }

    syncInputs(gameboy, buttonState);

    if (!startedRef.current) {
      startedRef.current = true;
      gameboy.run();
    }

    setRomName(name ?? 'ROM');
    setStatusText('ROM loaded');
    setIsRunning(true);
    return true;
  }, [buttonState]);

  const loadRomFromDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      // Many platforms/providers do not expose stable MIME types for .gb/.gbc.
      // Accept all files here and validate the extension after selection.
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    if (!isSupportedRomFilename(asset.name ?? '')) {
      setStatusText('Unsupported file. Please pick a .gb or .gbc ROM.');
      return;
    }

    const gameboy = emulatorRef.current;

    if (!gameboy) {
      setRomName(asset.name ?? 'ROM selected');

      try {
        const romData = await readRomAsArrayBuffer(asset);
        if (romData.byteLength > 0) {
          setStatusText('ROM selected. Core could not start in this runtime.');
          setIsRunning(false);
          return;
        }
      } catch (error) {
        // Fall through to user-facing status update below.
      }

      setStatusText('ROM selected, but emulator core is unavailable in this runtime.');
      return;
    }

    const romData = await readRomAsArrayBuffer(asset);
    const cartridgeType = getCartridgeTypeByte(romData);
    if (cartridgeType === null || !SUPPORTED_CARTRIDGE_TYPES.has(cartridgeType)) {
      const hexType = cartridgeType === null ? 'unknown' : `0x${cartridgeType.toString(16).padStart(2, '0')}`;
      setRomName(asset.name ?? 'ROM selected');
      setStatusText(`Unsupported cartridge type ${hexType}. This core supports ROM/MBC1/MBC3 only.`);
      setIsRunning(false);
      return;
    }

    gameboy.loadGame(romData);

    const supportsSharedArrayBuffer = typeof globalThis.SharedArrayBuffer !== 'undefined';
    if (supportsSharedArrayBuffer) {
      try {
        gameboy.apu.enableSound();
      } catch (error) {
        setStatusText('ROM loaded (audio unavailable on this browser runtime)');
      }
    } else {
      setStatusText('ROM loaded (audio unavailable on this browser runtime)');
    }

    syncInputs(gameboy, buttonState);

    if (!startedRef.current) {
      startedRef.current = true;
      gameboy.run();
    }

    setRomName(asset.name ?? 'Loaded ROM');
    if (supportsSharedArrayBuffer) {
      setStatusText(isCoreReady ? 'ROM loaded' : 'ROM selected');
    }
    setIsRunning(true);
  }, [buttonState, isCoreReady]);

  return {
    frameUri,
    romName,
    statusText,
    isRunning,
    buttonState,
    pickRom: loadRomFromDocument,
    loadRomBuffer,
    reset,
    setButton,
    emulatorRef,
  };
}