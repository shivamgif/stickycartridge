// MODULE: supabase | ROLE: Supabase client singleton with FileSystem session storage | API: supabase

import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// ── FileSystem-based session storage ────────────────────────────────────────
// Supabase JS v2 needs a storage adapter that persists the auth session between
// app launches. expo-file-system is already installed; this avoids pulling in
// @react-native-async-storage as an extra dependency.

const SESSION_FILE = `${FileSystem.documentDirectory}supabase-session.json`;

const fsStorage = {
  async getItem(key) {
    try {
      const info = await FileSystem.getInfoAsync(SESSION_FILE);
      if (!info.exists) return null;
      const raw = await FileSystem.readAsStringAsync(SESSION_FILE);
      const store = JSON.parse(raw);
      return store[key] ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      let store = {};
      const info = await FileSystem.getInfoAsync(SESSION_FILE);
      if (info.exists) {
        const raw = await FileSystem.readAsStringAsync(SESSION_FILE);
        store = JSON.parse(raw);
      }
      store[key] = value;
      await FileSystem.writeAsStringAsync(SESSION_FILE, JSON.stringify(store));
    } catch {}
  },
  async removeItem(key) {
    try {
      const info = await FileSystem.getInfoAsync(SESSION_FILE);
      if (!info.exists) return;
      const raw = await FileSystem.readAsStringAsync(SESSION_FILE);
      const store = JSON.parse(raw);
      delete store[key];
      await FileSystem.writeAsStringAsync(SESSION_FILE, JSON.stringify(store));
    } catch {}
  },
};

// ── Client ──────────────────────────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: fsStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
