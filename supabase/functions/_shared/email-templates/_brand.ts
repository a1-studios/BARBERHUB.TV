/// <reference types="npm:@types/react@18.3.1" />

// BarberHub email brand tokens.
// Body must remain white per system requirement; accent uses neon orange.
export const brand = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    margin: 0,
    padding: 0,
  } as const,
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '40px 28px',
  } as const,
  header: {
    paddingBottom: '28px',
    borderBottom: '2px solid #FF5F1F',
    marginBottom: '28px',
  } as const,
  brandMark: {
    fontSize: '20px',
    fontWeight: 900 as const,
    letterSpacing: '0.04em',
    color: '#0a0a0a',
    textTransform: 'uppercase' as const,
    margin: 0,
  } as const,
  brandAccent: {
    color: '#FF5F1F',
  } as const,
  h1: {
    fontSize: '26px',
    fontWeight: 800 as const,
    color: '#0a0a0a',
    lineHeight: 1.2,
    margin: '0 0 18px',
    letterSpacing: '-0.01em',
  } as const,
  text: {
    fontSize: '15px',
    color: '#3d3d3d',
    lineHeight: 1.6,
    margin: '0 0 22px',
  } as const,
  link: {
    color: '#FF5F1F',
    textDecoration: 'underline',
    fontWeight: 600 as const,
  } as const,
  button: {
    backgroundColor: '#FF5F1F',
    backgroundImage:
      'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 800 as const,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    borderRadius: '12px',
    padding: '14px 26px',
    textDecoration: 'none',
    display: 'inline-block',
    boxShadow: '0 6px 18px rgba(255,95,31,0.35)',
  } as const,
  divider: {
    borderTop: '1px solid #ececec',
    margin: '32px 0 20px',
  } as const,
  footer: {
    fontSize: '12px',
    color: '#8a8a8a',
    lineHeight: 1.55,
    margin: 0,
  } as const,
  code: {
    display: 'inline-block',
    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    fontSize: '28px',
    fontWeight: 800 as const,
    letterSpacing: '0.4em',
    color: '#0a0a0a',
    background: '#fff4ec',
    border: '2px solid #FF5F1F',
    borderRadius: '12px',
    padding: '16px 24px',
    margin: '0 0 24px',
  } as const,
}
