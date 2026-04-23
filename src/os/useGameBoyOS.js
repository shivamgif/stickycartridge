// MODULE: useGameBoyOS | ROLE: Central OS state machine — owns current screen + nav history | API: useGameBoyOS

import { useState, useRef, useCallback } from 'react';

export const SCREENS = {
  BOOT: 'BOOT',
  HOME: 'HOME',
  ROM_LIBRARY: 'ROM_LIBRARY',
  ROM_UPLOAD: 'ROM_UPLOAD',
  IN_GAME: 'IN_GAME',
  PAUSE_MENU: 'PAUSE_MENU',
  SETTINGS: 'SETTINGS',
  STORE: 'STORE',
};

const MAX_HISTORY = 10;

export default function useGameBoyOS() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.BOOT);
  const [screenProps, setScreenProps] = useState({});
  const history = useRef([]);

  const navigate = useCallback((screenName, props = {}) => {
    setCurrentScreen(prev => {
      history.current = [...history.current.slice(-(MAX_HISTORY - 1)), prev];
      return screenName;
    });
    setScreenProps(props);
  }, []);

  const goBack = useCallback(() => {
    if (history.current.length === 0) {
      setCurrentScreen(SCREENS.HOME);
      setScreenProps({});
      return;
    }
    const prev = history.current[history.current.length - 1];
    history.current = history.current.slice(0, -1);
    setCurrentScreen(prev);
    setScreenProps({});
  }, []);

  const resetToHome = useCallback(() => {
    history.current = [];
    setCurrentScreen(SCREENS.HOME);
    setScreenProps({});
  }, []);

  return { currentScreen, screenProps, navigate, goBack, resetToHome };
}
