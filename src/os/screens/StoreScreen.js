// MODULE: StoreScreen | ROLE: Supabase-backed ROM community store | API: StoreScreen

import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import useStore from '../useStore';

// ── View states ───────────────────────────────────────────────────────────
const VIEW = {
  LIST: 'LIST',          // browsing ROM list
  DISCLAIMER: 'DISC',   // upload disclaimer
  UPLOADING: 'UPLOADING',
  DOWNLOADING: 'DOWNLOADING',
  UPLOAD_PICK: 'PICK',  // waiting for RomUploadScreen to hand back a ROM
};

function pad(n, len = 4) {
  return String(n).padStart(len, '0');
}

function shortTitle(title = '', maxLen = 14) {
  const clean = title.replace(/\.(gb|gbc)$/i, '');
  return clean.length > maxLen ? clean.slice(0, maxLen - 1) + '…' : clean;
}

// ── Main component ────────────────────────────────────────────────────────
export default function StoreScreen({
  onButton,
  navigate,
  goBack,
  // Passed from GameBoyShell for upload flow:
  onUploadRomPick,   // (callback) => void — triggers file picker + returns { romData, entry }
}) {
  const {
    roms, isLoading, error,
    likedIds, fetchRoms, uploadRom, downloadRom, likeRom, unlikeRom,
  } = useStore();

  const [view, setView] = useState(VIEW.LIST);
  const [cursor, setCursor] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const cursorRef = useRef(0);
  const pendingRomRef = useRef(null); // { romData, title } waiting for disclaimer agree

  // Keep cursor in bounds when roms list changes
  useEffect(() => {
    if (cursorRef.current >= roms.length && roms.length > 0) {
      cursorRef.current = roms.length - 1;
      setCursor(roms.length - 1);
    }
  }, [roms.length]);

  // ── Button handler ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (button, isPressed) => {
      if (!isPressed) return;

      // ── DISCLAIMER view ──
      if (view === VIEW.DISCLAIMER) {
        if (button === 'a') {
          // Agreed — proceed with upload
          const { romData, title } = pendingRomRef.current ?? {};
          if (!romData) { setView(VIEW.LIST); return; }
          setView(VIEW.UPLOADING);
          setStatusMsg('UPLOADING...');
          uploadRom(romData, title)
            .then((ok) => {
              setStatusMsg(ok ? 'UPLOAD OK!' : 'UPLOAD FAILED');
              setTimeout(() => {
                setStatusMsg('');
                setView(VIEW.LIST);
                pendingRomRef.current = null;
              }, 1600);
            });
        } else if (button === 'b') {
          pendingRomRef.current = null;
          setView(VIEW.LIST);
        }
        return;
      }

      // ── UPLOADING / DOWNLOADING — block input ──
      if (view === VIEW.UPLOADING || view === VIEW.DOWNLOADING) return;

      // ── LIST view ──
      if (button === 'up') {
        cursorRef.current = Math.max(0, cursorRef.current - 1);
        setCursor(cursorRef.current);
      } else if (button === 'down') {
        cursorRef.current = Math.min(roms.length, cursorRef.current + 1); // +1 for Upload row
        setCursor(cursorRef.current);
      } else if (button === 'right') {
        // Refresh
        fetchRoms();
        setStatusMsg('REFRESHING...');
        setTimeout(() => setStatusMsg(''), 1200);
      } else if (button === 'a') {
        const isUploadRow = cursorRef.current === roms.length;
        if (isUploadRow) {
          // Trigger upload flow via picker
          if (typeof onUploadRomPick?.call === 'function') {
            onUploadRomPick.call(({ romData, entry } = {}) => {
              if (!romData || !entry) return;
              pendingRomRef.current = { romData, title: entry.name };
              setView(VIEW.DISCLAIMER);
            });
          }
          return;
        }
        // Download selected ROM
        const rom = roms[cursorRef.current];
        if (!rom) return;
        setView(VIEW.DOWNLOADING);
        setStatusMsg(`FETCHING ${shortTitle(rom.title)}...`);
        downloadRom(rom).then((data) => {
          if (data) {
            setStatusMsg('SAVED TO LIBRARY');
            if (typeof onUploadRomPick?.onDownload === 'function') {
              onUploadRomPick.onDownload(data, rom.title);
            }
          } else {
            setStatusMsg('DOWNLOAD FAILED');
          }
          setTimeout(() => {
            setStatusMsg('');
            setView(VIEW.LIST);
          }, 1600);
        });
      } else if (button === 'select') {
        const isUploadRow = cursorRef.current === roms.length;
        if (isUploadRow) return;
        const rom = roms[cursorRef.current];
        if (!rom) return;
        if (likedIds.has(rom.id)) {
          unlikeRom(rom.id);
        } else {
          likeRom(rom.id);
        }
      } else if (button === 'b') {
        goBack();
      }
    };

    onButton.current = handler;
  }, [view, roms, likedIds, goBack, fetchRoms, uploadRom, downloadRom, likeRom, unlikeRom, onUploadRomPick]);

  // ── Render helpers ──────────────────────────────────────────────────────

  if (view === VIEW.DISCLAIMER) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>UPLOAD ROM</Text>
        <View style={styles.divider} />
        <View style={styles.body}>
          <Text style={styles.disclaimerText}>
            ONLY UPLOAD ROMS{'\n'}YOU OWN OR HAVE{'\n'}RIGHTS TO SHARE.
          </Text>
          <View style={styles.dividerThin} />
          <Text style={styles.disclaimerSub}>
            BY PRESSING A YOU{'\n'}CONFIRM YOU OWN{'\n'}THIS ROM.
          </Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.hint}>A:AGREE  B:CANCEL</Text>
        </View>
      </View>
    );
  }

  if (view === VIEW.UPLOADING || view === VIEW.DOWNLOADING) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>STORE</Text>
        <View style={styles.divider} />
        <View style={styles.body}>
          <Text style={styles.icon}>{view === VIEW.UPLOADING ? '▲' : '▼'}</Text>
          <Text style={styles.statusText}>{statusMsg}</Text>
        </View>
      </View>
    );
  }

  // ── LIST ──────────────────────────────────────────────────────────────
  const displayItems = [...roms, { id: '__upload__', title: '+ UPLOAD ROM', isAction: true }];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>STORE</Text>
        <Text style={styles.meta}>
          {isLoading ? 'LOADING' : error ? 'ERROR' : `${roms.length} ROMS`}
        </Text>
      </View>
      <View style={styles.divider} />

      {/* Status flash */}
      {statusMsg ? (
        <Text style={styles.flash}>{statusMsg}</Text>
      ) : null}

      {/* ROM list */}
      {error && !isLoading ? (
        <View style={styles.body}>
          <Text style={styles.errorText}>NO CONNECTION</Text>
          <Text style={styles.errorSub}>►:RETRY  B:BACK</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {displayItems.map((item, i) => {
            const isActive = cursor === i;
            const isAction = item.isAction;
            const isLiked = likedIds.has(item.id);
            return (
              <View key={item.id} style={[styles.row, isActive && styles.rowActive]}>
                <Text
                  style={[styles.rowLabel, isAction && styles.rowAction, isActive && styles.rowLabelActive]}
                  numberOfLines={1}
                >
                  {isActive ? '▶ ' : '  '}
                  {isAction ? item.title : shortTitle(item.title)}
                </Text>
                {!isAction && (
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowStat, isLiked && styles.rowStatLiked]}>
                      ♥{pad(item.likes ?? 0, 3)}
                    </Text>
                    <Text style={styles.rowStat}>
                      ▼{pad(item.downloads ?? 0, 3)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Footer hint */}
      <View style={styles.footer}>
        <Text style={styles.hint}>A:GET  SEL:♥  ►:REFRESH  B:BACK</Text>
      </View>
    </View>
  );
}

// ── Styles (DMG palette) ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#4C5800', paddingHorizontal: 8, paddingVertical: 6 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontFamily: 'PressStart2P', fontSize: 10, color: '#000000' },
  meta: { fontFamily: 'PressStart2P', fontSize: 7, color: '#111111' },

  divider: { height: 1, backgroundColor: '#000000', marginBottom: 6 },
  dividerThin: { height: 1, backgroundColor: '#000000', marginVertical: 10 },

  flash: { fontFamily: 'PressStart2P', fontSize: 7, color: '#000000', textAlign: 'center', marginBottom: 4 },

  list: { flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowActive: { backgroundColor: 'rgba(0,0,0,0.1)' },
  rowLabel: { fontFamily: 'PressStart2P', fontSize: 8, color: '#222222', flex: 1 },
  rowLabelActive: { color: '#000000' },
  rowAction: { color: '#000000' },
  rowMeta: { flexDirection: 'row', gap: 6 },
  rowStat: { fontFamily: 'PressStart2P', fontSize: 7, color: '#111111' },
  rowStatLiked: { color: '#000000' },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  icon: { fontFamily: 'PressStart2P', fontSize: 20, color: '#000000' },
  statusText: { fontFamily: 'PressStart2P', fontSize: 8, color: '#111111', textAlign: 'center' },

  disclaimerText: { fontFamily: 'PressStart2P', fontSize: 8, color: '#000000', textAlign: 'center', lineHeight: 12 },
  disclaimerSub: { fontFamily: 'PressStart2P', fontSize: 7, color: '#111111', textAlign: 'center', lineHeight: 10 },

  errorText: { fontFamily: 'PressStart2P', fontSize: 10, color: '#000000', textAlign: 'center' },
  errorSub: { fontFamily: 'PressStart2P', fontSize: 7, color: '#111111', textAlign: 'center' },

  footer: { alignItems: 'center', marginTop: 4 },
  hint: { fontFamily: 'PressStart2P', fontSize: 6, color: '#111111' },
});
