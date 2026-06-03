interface SignatureHeaderProps {
  /**
   * The title to display. Spaces will be replaced with hyphens and the result
   * uppercased to match the platform wordmark style (e.g. "Creator Hub" -> "CREATOR-HUB").
   */
  title: string;
  /** Optional muted subtitle shown beneath the wordmark. */
  subtitle?: string;
  className?: string;
}

/**
 * Reusable wordmark header used across major sections (Lives, Challenges,
 * Battles, Creator Hub, Barber Profile, etc.). Renders the title in the
 * platform's signature style: uppercase, hyphenated, wide tracking, white.
 */
export const SignatureHeader = ({ title, subtitle, className }: SignatureHeaderProps) => {
  const wordmark = title
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');

  return (
    <div className={className ?? 'mb-4'}>
      <h2
        className="text-white font-bold uppercase"
        style={{ letterSpacing: '0.15em', fontWeight: 700 }}
      >
        {wordmark}
      </h2>
      {subtitle && (
        <p
          className="mt-1 uppercase"
          style={{ fontSize: '12px', color: '#666', letterSpacing: '0.12em' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SignatureHeader;
