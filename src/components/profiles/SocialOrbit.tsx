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
  /** Avatar diameter in px */
  size: number;
  links?: SocialLinks;
  /** Extra distance (px) from avatar edge to icon center. Defaults to 18. */
  gap?: number;
  /** Icon chip diameter in px */
  iconSize?: number;
  className?: string;
}

type SocialKey = keyof SocialLinks;

interface SocialDef {
  key: SocialKey;
  Icon: LucideIcon;
  /** Tailwind class applied when connected (brand color) */
  litClass: string;
  /** Drop-shadow color when connected */
  glow: string;
  label: string;
}

const SOCIALS: SocialDef[] = [
  { key: 'instagram', Icon: Instagram, litClass: 'text-pink-500',  glow: 'drop-shadow(0 0 6px rgba(236,72,153,0.65))', label: 'Instagram' },
  { key: 'facebook',  Icon: Facebook,  litClass: 'text-blue-500',  glow: 'drop-shadow(0 0 6px rgba(59,130,246,0.65))',  label: 'Facebook' },
  { key: 'twitter',   Icon: Twitter,   litClass: 'text-sky-400',   glow: 'drop-shadow(0 0 6px rgba(56,189,248,0.65))',  label: 'X / Twitter' },
  { key: 'youtube',   Icon: Youtube,   litClass: 'text-red-500',   glow: 'drop-shadow(0 0 6px rgba(239,68,68,0.65))',   label: 'YouTube' },
];

const normalizeUrl = (raw: string) => (raw.startsWith('http') ? raw : `https://${raw}`);

export function SocialOrbit({
  children,
  size,
  links,
  gap = 18,
  iconSize = 26,
  className,
}: SocialOrbitProps) {
  const radius = size / 2 + gap;            // distance from center to icon center
  const wrapperSize = size + (gap + iconSize) * 2;
  const center = wrapperSize / 2;

  // 4 evenly spaced positions: top, right, bottom, left
  const positions = [-90, 0, 90, 180];

  return (
    <div
      className={cn('relative inline-block', className)}
      style={{ width: wrapperSize, height: wrapperSize }}
    >
      {/* Centered avatar */}
      <div
        className="absolute"
        style={{
          width: size,
          height: size,
          left: center - size / 2,
          top: center - size / 2,
        }}
      >
        {children}
      </div>

      {/* Orbiting icons */}
      {SOCIALS.map((social, i) => {
        const angle = positions[i];
        const rad = (angle * Math.PI) / 180;
        const x = center + radius * Math.cos(rad) - iconSize / 2;
        const y = center + radius * Math.sin(rad) - iconSize / 2;
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
              className={cn(
                'transition-colors',
                connected ? social.litClass : 'text-muted-foreground/30'
              )}
              style={{ width: iconSize * 0.55, height: iconSize * 0.55 }}
              strokeWidth={connected ? 2.2 : 1.6}
            />
          </div>
        );

        return (
          <div
            key={social.key}
            className="absolute"
            style={{ left: x, top: y, width: iconSize, height: iconSize }}
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
