// Tiny event bus so any component can open the PWA install prompt.
type Listener = () => void;
const listeners = new Set<Listener>();

export function openInstallPrompt() {
  listeners.forEach((l) => l());
}

export function onOpenInstallPrompt(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // @ts-expect-error legacy iOS prop
  if (window.navigator.standalone) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}
