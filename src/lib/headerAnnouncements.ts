import { useEffect, useState } from 'react';

export type HeaderAnnouncement = {
  first: string;
  second: string;
  durationMs?: number;
};

const EVENT = 'header:announce';

export function announce(a: HeaderAnnouncement): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<HeaderAnnouncement>(EVENT, { detail: a }));
}

export function useHeaderAnnouncement(): HeaderAnnouncement | null {
  const [a, setA] = useState<HeaderAnnouncement | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<HeaderAnnouncement>).detail;
      if (!detail) return;
      setA(detail);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setA(null), detail.durationMs ?? 3500);
    };
    window.addEventListener(EVENT, handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return a;
}
