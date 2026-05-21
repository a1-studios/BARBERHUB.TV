import { useLayoutEffect, useRef } from 'react';

/**
 * Scales the inner span down to fit its parent container width.
 * Apply ref to a wrapping element; the immediate child gets `transform: scale(...)`.
 */
export function useFitText<T extends HTMLElement>(deps: ReadonlyArray<unknown> = []) {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const child = el.firstElementChild as HTMLElement | null;
    if (!child) return;

    const fit = () => {
      child.style.transform = 'scale(1)';
      child.style.transformOrigin = 'center center';
      const parentW = el.clientWidth;
      const childW = child.scrollWidth;
      if (parentW > 0 && childW > parentW) {
        const scale = Math.max(0.5, parentW / childW);
        child.style.transform = `scale(${scale})`;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
