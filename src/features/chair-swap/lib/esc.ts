// Small shared HTML-escape helper for Mapbox popups. Prevents stored XSS
// through user-controlled listing fields (chair_name, shop_name, etc.).
export const esc = (s: string | null | undefined): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
