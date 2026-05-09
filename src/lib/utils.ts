import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a cleaned, human-friendly title or null if the string looks like
 * a raw filename / UUID / storage key (e.g. "f99cfb17-fc02-4fe4-...mp4").
 */
export function cleanDisplayTitle(t?: string | null): string | null {
  if (!t) return null;
  const s = t.trim();
  if (!s) return null;
  // Media file extension
  if (/\.(mp4|mov|webm|m4v|avi|mkv|jpg|jpeg|png|gif|heic)(\?.*)?$/i.test(s)) return null;
  // UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(s)) return null;
  // Long hex / random key blocks (e.g. base64-ish or hash filenames)
  if (/^[0-9a-f]{16,}$/i.test(s)) return null;
  // Storage-style with __ separators or slashes
  if (s.includes('__') || s.startsWith('http') || s.includes('/')) return null;
  return s;
}
