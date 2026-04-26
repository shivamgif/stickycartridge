// MODULE: useRomLibrary | ROLE: Local ROM CRUD — copy to docs dir, persist metadata | API: useRomLibrary

import { useCallback, useEffect, useState } from 'react';
import { Buffer } from 'buffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

const ROMS_DIR = `${FileSystem.documentDirectory}roms/`;
const META_FILE = `${FileSystem.documentDirectory}roms-meta.json`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(ROMS_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(ROMS_DIR, { intermediates: true });
}

async function readMeta() {
  try {
    const info = await FileSystem.getInfoAsync(META_FILE);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(META_FILE);
    return JSON.parse(raw) ?? [];
  } catch {
    return [];
  }
}

async function writeMeta(roms) {
  await FileSystem.writeAsStringAsync(META_FILE, JSON.stringify(roms));
}

export default function useRomLibrary() {
  const [roms, setRoms] = useState([]);

  useEffect(() => {
    readMeta().then(setRoms);
  }, []);

  // Pick a ROM via system picker, copy to docs dir, add to library.
  // Returns { romData: ArrayBuffer, entry: RomEntry } or null if cancelled.
  const pickNew = useCallback(async () => {
    await ensureDir();

    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];

    const name = asset.name ?? 'unknown.gb';
    if (!name.toLowerCase().endsWith('.gb') && !name.toLowerCase().endsWith('.gbc')) return null;

    // Persist to document directory so it survives cache clears.
    const destPath = `${ROMS_DIR}${Date.now()}_${name}`;
    await FileSystem.copyAsync({ from: asset.uri, to: destPath });

    // Read the ROM data for immediate emulator loading.
    const encoding = FileSystem.EncodingType?.Base64 ?? 'base64';
    const base64 = await FileSystem.readAsStringAsync(destPath, { encoding });
    const bytes = Buffer.from(base64, 'base64');
    const romData = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    const info = await FileSystem.getInfoAsync(destPath);
    const entry = {
      id: String(Date.now()),
      name,
      filePath: destPath,
      addedAt: new Date().toISOString(),
      lastPlayed: null,
      size: info.size ?? 0,
    };

    const updated = [entry, ...roms];
    setRoms(updated);
    await writeMeta(updated);

    return { romData, entry };
  }, [roms]);

  // Load ROM data from an existing library entry path.
  const loadRomData = useCallback(async (entry) => {
    const encoding = FileSystem.EncodingType?.Base64 ?? 'base64';
    const base64 = await FileSystem.readAsStringAsync(entry.filePath, { encoding });
    const bytes = Buffer.from(base64, 'base64');
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }, []);

  const deleteRom = useCallback(async (id) => {
    const entry = roms.find((r) => r.id === id);
    if (entry) {
      try { await FileSystem.deleteAsync(entry.filePath, { idempotent: true }); } catch {}
    }
    const updated = roms.filter((r) => r.id !== id);
    setRoms(updated);
    await writeMeta(updated);
  }, [roms]);

  const markPlayed = useCallback(async (id) => {
    const updated = roms.map((r) =>
      r.id === id ? { ...r, lastPlayed: new Date().toISOString() } : r,
    );
    setRoms(updated);
    await writeMeta(updated);
  }, [roms]);

  const getLastPlayed = useCallback(() => {
    return roms
      .filter((r) => r.lastPlayed)
      .sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed))[0] ?? null;
  }, [roms]);

  return { roms, pickNew, loadRomData, deleteRom, markPlayed, getLastPlayed };
}
