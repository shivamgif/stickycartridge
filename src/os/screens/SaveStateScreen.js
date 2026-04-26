// MODULE: SaveStateScreen | ROLE: 3-slot save/load/delete UI for save states | API: SaveStateScreen

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const ACTIONS = ['SAVE', 'LOAD', 'DELETE'];

function formatTimestamp(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export default function SaveStateScreen({
  onButton,
  goBack,
  slots,        // { 0: { timestamp }, 1: ..., 2: ... }
  onSave,       // (slot) => Promise<bool>
  onLoad,       // (slot) => Promise<bool>
  onDelete,     // (slot) => void
  maxSlots,     // number (3)
}) {
  // Two-level cursor: slotCursor (0–2) and actionCursor (0–2 = SAVE/LOAD/DELETE)
  const [slotCursor, setSlotCursor] = useState(0);
  const [actionCursor, setActionCursor] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const slotCursorRef = useRef(0);
  const actionCursorRef = useRef(0);
  const confirmRef = useRef(false);
  const statusTimerRef = useRef(null);

  const showStatus = (msg) => {
    setStatusMsg(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatusMsg(null), 2000);
  };

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (button, isPressed) => {
      if (!isPressed) return;

      // If in delete-confirm mode
      if (confirmRef.current) {
        if (button === 'a') {
          onDelete(slotCursorRef.current);
          confirmRef.current = false;
          setConfirmDelete(false);
          showStatus('DELETED');
        } else if (button === 'b') {
          confirmRef.current = false;
          setConfirmDelete(false);
        }
        return;
      }

      if (button === 'up') {
        slotCursorRef.current = (slotCursorRef.current - 1 + maxSlots) % maxSlots;
        setSlotCursor(slotCursorRef.current);
        actionCursorRef.current = 0;
        setActionCursor(0);
      } else if (button === 'down') {
        slotCursorRef.current = (slotCursorRef.current + 1) % maxSlots;
        setSlotCursor(slotCursorRef.current);
        actionCursorRef.current = 0;
        setActionCursor(0);
      } else if (button === 'left') {
        actionCursorRef.current = (actionCursorRef.current - 1 + ACTIONS.length) % ACTIONS.length;
        setActionCursor(actionCursorRef.current);
      } else if (button === 'right') {
        actionCursorRef.current = (actionCursorRef.current + 1) % ACTIONS.length;
        setActionCursor(actionCursorRef.current);
      } else if (button === 'a') {
        const action = ACTIONS[actionCursorRef.current];
        const slot = slotCursorRef.current;
        const slotData = slots[slot];

        if (action === 'SAVE') {
          onSave(slot).then((ok) => {
            showStatus(ok ? 'SAVED!' : 'SAVE FAILED');
          });
        } else if (action === 'LOAD') {
          if (!slotData) {
            showStatus('EMPTY SLOT');
            return;
          }
          onLoad(slot).then((ok) => {
            if (ok) {
              showStatus('LOADED!');
              // Go back to game after a short delay
              setTimeout(() => goBack(), 800);
            } else {
              showStatus('LOAD FAILED');
            }
          });
        } else if (action === 'DELETE') {
          if (!slotData) {
            showStatus('EMPTY SLOT');
            return;
          }
          confirmRef.current = true;
          setConfirmDelete(true);
        }
      } else if (button === 'b') {
        goBack();
      }
    };
    onButton.current = handler;
  }, [goBack, onSave, onLoad, onDelete, slots, maxSlots]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>SAVE STATES</Text>
      <View style={styles.divider} />

      {confirmDelete ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>DELETE SLOT {slotCursor + 1}?</Text>
          <Text style={styles.confirmHint}>A:YES  B:NO</Text>
        </View>
      ) : (
        <View style={styles.slotList}>
          {Array.from({ length: maxSlots }, (_, i) => {
            const slotData = slots[i];
            const isActive = slotCursor === i;
            return (
              <View key={i} style={[styles.slotRow, isActive && styles.slotRowActive]}>
                <View style={styles.slotHeader}>
                  <Text style={[styles.slotLabel, isActive && styles.textActive]}>
                    {isActive ? '▶ ' : '  '}SLOT {i + 1}
                  </Text>
                  <Text style={[styles.slotTime, isActive && styles.textActive]}>
                    {slotData ? formatTimestamp(slotData.timestamp) : '---EMPTY---'}
                  </Text>
                </View>
                {isActive && (
                  <View style={styles.actionRow}>
                    {ACTIONS.map((act, j) => (
                      <Text
                        key={act}
                        style={[
                          styles.actionLabel,
                          actionCursor === j && styles.actionLabelActive,
                        ]}
                      >
                        {actionCursor === j ? `[${act}]` : ` ${act} `}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {statusMsg && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>{statusMsg}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.hint}>
          {confirmDelete ? 'A:CONFIRM  B:CANCEL' : '▲▼:SLOT ◄►:ACTION A:OK B:BACK'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#4C5800',
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  title: {
    fontFamily: 'PressStart2P',
    fontSize: 10,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#000000',
    marginBottom: 5,
  },
  slotList: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  slotRow: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  slotRowActive: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotLabel: {
    fontFamily: 'PressStart2P',
    fontSize: 8,
    color: '#222222',
  },
  slotTime: {
    fontFamily: 'PressStart2P',
    fontSize: 7,
    color: '#111111',
  },
  textActive: {
    color: '#000000',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 3,
    gap: 4,
  },
  actionLabel: {
    fontFamily: 'PressStart2P',
    fontSize: 7,
    color: '#111111',
  },
  actionLabelActive: {
    color: '#000000',
  },
  confirmBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  confirmText: {
    fontFamily: 'PressStart2P',
    fontSize: 10,
    color: '#000000',
    textAlign: 'center',
  },
  confirmHint: {
    fontFamily: 'PressStart2P',
    fontSize: 8,
    color: '#111111',
    textAlign: 'center',
  },
  statusBar: {
    alignItems: 'center',
    paddingVertical: 3,
  },
  statusText: {
    fontFamily: 'PressStart2P',
    fontSize: 8,
    color: '#000000',
  },
  footer: {
    alignItems: 'center',
  },
  hint: {
    fontFamily: 'PressStart2P',
    fontSize: 6,
    color: '#111111',
  },
});
