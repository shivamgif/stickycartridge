// MODULE: useSettings | ROLE: Persist gameplay options to filesystem | API: useSettings

import { useCallback, useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

const SETTINGS_FILE = `${FileSystem.documentDirectory}settings.json`;

const DEFAULTS = {
  palette: 'DMG',
  fps: '30',
  haptics: true,
  sfx: true,
  scanlines: false,
};

export default function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    FileSystem.getInfoAsync(SETTINGS_FILE).then((info) => {
      if (!info.exists) return;
      FileSystem.readAsStringAsync(SETTINGS_FILE)
        .then((raw) => setSettings({ ...DEFAULTS, ...JSON.parse(raw) }))
        .catch(() => {});
    });
  }, []);

  const changeSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { settings, changeSetting };
}
