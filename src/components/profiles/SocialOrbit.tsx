import { ReactNode } from 'react';
import { Instagram, Facebook, Twitter, Youtube, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SocialLinks {
  instagram?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  youtube?: string | null;
}
interface SocialOrbitProps {
  children: ReactNode;
  /** Distance (px) from container center to icon center */
  radius?: number;
  iconSize?: number;
  links?: SocialLinks;
  className?: string;
  /** When set, unmapped icons render as add-buttons that invoke this with the key. */
  onAddClick?: (key: keyof SocialLinks) => void;
}

type SocialKey = keyof SocialLinks;
interface SocialDef {
  key: SocialKey;
  Icon: LucideIcon;
  litClass: string;
  glow: string;
  label: string;
}

const SOCIALS: SocialDef[] = [
  { key: 'instagram', Icon: Instagram, litClass: 'text-pink-500', glow: 'drop-shadow(0 0 6px rgba(236,72,153,0.65))', label: 'Instagram' },
  { key: 'facebook',  Icon: Facebook,  litClass: 'text-blue-500', glow: 'drop-shadow(0 0 6px rgba(59,130,246,0.65))', label: 'Facebook' },
  { key: 'twitter',   Icon: Twitter,   litClass: 'text-sky-400',  glow: 'drop-shadow(0 0 6px rgba(56,189,248,0.65))', label: 'X / Twitter' },
  { key: 'youtube',   Icon: Youtube,   litClass: 'text-red-500',  glow: 'drop-shadow(0 0 6px rgba(239,68,68,0.65))',  label: 'YouTube' },
];

const normalizeUrl = (raw: string) => (raw.startsWith('http') ? raw : `https://${raw}`);

/**
 * Wraps any avatar element and orbits 4 social icons around its visual center.
 * Sizes itself to its child — icons sit absolutely positioned, anchored to the
 * container's center via translate. Padding is added so icons aren't clipped.
 */
export function SocialOrbit({
  children,
  radius = 72,
  iconSize = 28,
  links,
  className,
  onAddClick,
}: SocialOrbitProps) {
  // Compass positions: top, right, bottom, left
  const positions = [-90, 0, 90, 180];
  const pad = radius + iconSize / 2 + 4;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ padding: pad }}
    >
      {children}

      {SOCIALS.map((social, i) => {
        const rad = (positions[i] * Math.PI) / 180;
        const x = radius * Math.cos(rad);
        const y = radius * Math.sin(rad);
        const url = links?.[social.key];
        const connected = !!url && url.trim().length > 0;

        const chip = (
          <div
            className={cn(
              'flex items-center justify-center rounded-full border backdrop-blur-md transition-all',
              connected
                ? 'bg-background/70 border-border/50 animate-social-pulse'
                : 'bg-background/40 border-border/20'
            )}
            style={{
              width: iconSize,
              height: iconSize,
              filter: connected ? social.glow : undefined,
            }}
            aria-label={social.label}
          >
            <social.Icon
              className={cn('transition-colors', connected ? social.litClass : 'text-muted-foreground/30')}
              style={{ width: iconSize * 0.55, height: iconSize * 0.55 }}
              strokeWidth={connected ? 2.2 : 1.6}
            />
          </div>
        );

        return (
          <div
            key={social.key}
            className="absolute left-1/2 top-1/2 pointer-events-auto"
            style={{
              width: iconSize,
              height: iconSize,
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            }}
          >
            {connected ? (
              <a
                href={normalizeUrl(url!)}
                target="_blank"
                rel="noopener noreferrer"
                title={social.label}
                className="block"
              >
                {chip}
              </a>
            ) : (
              <div title={`${social.label} (not connected)`}>{chip}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
