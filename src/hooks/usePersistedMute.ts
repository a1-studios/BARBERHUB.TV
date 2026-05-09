import { useCallback, useEffect, useState } from 'react';

const KEY = 'bh_feed_muted';

/**
 * Shared mute preference across /watch, hero, and split-screen.
 * Defaults to muted (true) so autoplay works; once the user unmutes,
 * the preference persists across reloads and route changes.
 */
export function usePersistedMute(): [boolean, (next?: boolean) => void] {
  const [muted, setMutedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const v = window.localStorage.getItem(KEY);
    return v === null ? true : v === '1';
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue !== null) {
        setMutedState(e.newValue === '1');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setMuted = useCallback((next?: boolean) => {
    setMutedState(prev => {
      const value = typeof next === 'boolean' ? next : !prev;
      try {
        window.localStorage.setItem(KEY, value ? '1' : '0');
      } catch {}
      return value;
    });
  }, []);

  return [muted, setMuted];
}
