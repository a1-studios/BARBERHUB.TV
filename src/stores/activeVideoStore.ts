// Single-decoder guard. Only one video plays at a time platform-wide.
// Tiny custom store — avoids adding zustand as a dep.

type Listener = (id: string | null) => void;

let activeId: string | null = null;
const listeners = new Set<Listener>();

export const activeVideoStore = {
  get() {
    return activeId;
  },
  set(id: string | null) {
    if (activeId === id) return;
    activeId = id;
    listeners.forEach((l) => l(id));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

import { useEffect, useState } from 'react';
export function useActiveVideoId() {
  const [id, setId] = useState<string | null>(activeVideoStore.get());
  useEffect(() => {
    const unsub = activeVideoStore.subscribe(setId);
    return () => { unsub; };
  }, []);
  return id;
}
