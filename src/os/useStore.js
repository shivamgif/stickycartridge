// MODULE: useStore | ROLE: Supabase social store — browse, upload, download, like ROMs | API: useStore

import { useCallback, useEffect, useRef, useState } from 'react';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';

const BUCKET = 'roms';
const PAGE_SIZE = 20;

// ── Auth helpers ─────────────────────────────────────────────────────────────

async function ensureAnonymousUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns:
 *   roms         RomStoreEntry[]   — list from Supabase `roms` table
 *   isLoading    bool
 *   error        string | null
 *   user         object | null     — current auth user
 *   likedIds     Set<string>       — rom ids the current user has liked
 *   fetchRoms    () => void
 *   uploadRom    (ArrayBuffer, title, description?) => Promise<bool>
 *   downloadRom  (RomStoreEntry) => Promise<ArrayBuffer | null>
 *   likeRom      (romId) => Promise<void>
 *   unlikeRom    (romId) => Promise<void>
 *
 * RomStoreEntry: { id, title, description, storage_path, downloads, likes, created_at }
 */
export default function useStore() {
  const [roms, setRoms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [likedIds, setLikedIds] = useState(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Ensure anonymous auth on first mount ──────────────────────────────────
  useEffect(() => {
    ensureAnonymousUser()
      .then((u) => { if (mountedRef.current) setUser(u); })
      .catch((e) => { if (mountedRef.current) setError(`Auth: ${e.message}`); });
  }, []);

  // ── Fetch liked IDs whenever user changes ────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase
      .from('rom_likes')
      .select('rom_id')
      .eq('user_id', user.id)
      .then(({ data, error: e }) => {
        if (e || !mountedRef.current) return;
        setLikedIds(new Set(data.map((r) => r.rom_id)));
      });
  }, [user?.id]);

  // ── Fetch ROM list ─────────────────────────────────────────────────────────
  const fetchRoms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from('roms')
      .select('id, title, description, storage_path, downloads, likes, created_at')
      .order('likes', { ascending: false })
      .limit(PAGE_SIZE);

    if (!mountedRef.current) return;
    if (e) {
      setError(e.message);
    } else {
      setRoms(data ?? []);
    }
    setIsLoading(false);
  }, []);

  // Fetch on mount
  useEffect(() => { fetchRoms(); }, []);

  // ── Upload ROM ─────────────────────────────────────────────────────────────
  const uploadRom = useCallback(async (romData, title, description = '') => {
    try {
      const u = user ?? await ensureAnonymousUser();
      if (!mountedRef.current) return false;
      setUser(u);

      // Write to a temp cache file, then upload to Supabase Storage.
      const filename = `${u.id}/${Date.now()}_${title.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const tempUri = `${FileSystem.cacheDirectory}upload_${Date.now()}.rom`;

      const bytes = new Uint8Array(romData);
      const base64 = Buffer.from(bytes).toString('base64');
      await FileSystem.writeAsStringAsync(tempUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload file to storage
      const { error: storageErr } = await supabase.storage
        .from(BUCKET)
        .upload(filename, {
          uri: tempUri,
          name: title,
          type: 'application/octet-stream',
        });

      // Clean up temp file
      FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});

      if (storageErr) throw storageErr;

      // Insert metadata row
      const { error: dbErr } = await supabase.from('roms').insert({
        owner_id: u.id,
        title,
        description,
        storage_path: filename,
      });
      if (dbErr) throw dbErr;

      // Refresh list
      fetchRoms();
      return true;
    } catch (e) {
      if (mountedRef.current) setError(`Upload: ${e.message}`);
      return false;
    }
  }, [user, fetchRoms]);

  // ── Download ROM ──────────────────────────────────────────────────────────
  const downloadRom = useCallback(async (rom) => {
    try {
      const { data, error: e } = await supabase.storage
        .from(BUCKET)
        .download(rom.storage_path);
      if (e) throw e;

      // Increment download counter (fire and forget)
      supabase.rpc('increment_downloads', { rom_id: rom.id }).catch(() => {});

      // data is a Blob on web; on React Native it depends on runtime.
      // Convert to ArrayBuffer.
      if (data instanceof Blob) {
        return await data.arrayBuffer();
      }
      // Supabase RN can return a Uint8Array / Buffer — wrap it
      if (data?.buffer) return data.buffer;
      return null;
    } catch (e) {
      if (mountedRef.current) setError(`Download: ${e.message}`);
      return null;
    }
  }, []);

  // ── Like / Unlike ─────────────────────────────────────────────────────────
  const likeRom = useCallback(async (romId) => {
    if (!user) return;
    setLikedIds((prev) => new Set([...prev, romId]));
    setRoms((prev) =>
      prev.map((r) => r.id === romId ? { ...r, likes: r.likes + 1 } : r)
    );
    const { error: e } = await supabase
      .from('rom_likes')
      .insert({ user_id: user.id, rom_id: romId });
    if (e && mountedRef.current) {
      // Revert on failure
      setLikedIds((prev) => { const s = new Set(prev); s.delete(romId); return s; });
      setRoms((prev) =>
        prev.map((r) => r.id === romId ? { ...r, likes: Math.max(0, r.likes - 1) } : r)
      );
    }
  }, [user]);

  const unlikeRom = useCallback(async (romId) => {
    if (!user) return;
    setLikedIds((prev) => { const s = new Set(prev); s.delete(romId); return s; });
    setRoms((prev) =>
      prev.map((r) => r.id === romId ? { ...r, likes: Math.max(0, r.likes - 1) } : r)
    );
    const { error: e } = await supabase
      .from('rom_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('rom_id', romId);
    if (e && mountedRef.current) {
      // Revert
      setLikedIds((prev) => new Set([...prev, romId]));
      setRoms((prev) =>
        prev.map((r) => r.id === romId ? { ...r, likes: r.likes + 1 } : r)
      );
    }
  }, [user]);

  return {
    roms,
    isLoading,
    error,
    user,
    likedIds,
    fetchRoms,
    uploadRom,
    downloadRom,
    likeRom,
    unlikeRom,
  };
}
