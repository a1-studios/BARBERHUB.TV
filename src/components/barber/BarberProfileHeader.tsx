import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TierRing } from '@/components/TierRing';
import { RotatingBBCoin } from '@/components/economy/RotatingBBCoin';
import { Link } from 'react-router-dom';
import { ExternalLink, Settings, Plus, ArrowDownToLine, Instagram, Twitter, Youtube, Facebook, LogOut, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { M4MHeartbeat } from '@/components/m4m/M4MHeartbeat';

interface BarberProfileHeaderProps {
  avatar_url?: string | null;
  display_name: string;
  country_code?: string | null;
  specialty?: string | null;
  is_live?: boolean;
  subscription_tier?: string | null;
  stats: {
    follower_count: number;
    like_count: number;
    total_donations_cents: number;
  };
  barber_id?: string;
  onSettingsClick?: () => void;
  onAddFundsClick?: () => void;
  onSignOutClick?: () => void;
  onDeleteAccountClick?: () => void;
  barberBucks?: number;
  showActions?: boolean;
  socialLinks?: {
    instagram?: string | null;
    facebook?: string | null;
    twitter?: string | null;
    youtube?: string | null;
  };
  m4m_certified?: boolean;
  m4m_paid?: boolean;
  m4m_lives_touched?: number;
  barber_user_id?: string;
}

export function BarberProfileHeader({
  avatar_url,
  display_name,
  country_code,
  specialty,
  is_live,
  subscription_tier,
  stats,
  barber_id,
  onSettingsClick,
  onAddFundsClick,
  onSignOutClick,
  onDeleteAccountClick,
  barberBucks,
  showActions = true,
  socialLinks,
  m4m_certified = false,
  m4m_paid = false,
  m4m_lives_touched = 0,
  barber_user_id
}: BarberProfileHeaderProps) {
  const getCountryFlag = (code: string) => {
    const codePoints = code
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const totalDonations = (stats.total_donations_cents / 100).toFixed(0);

  return (
    <Card className="relative overflow-hidden border-primary/20">
      <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-primary/20" />
      
      {/* Compact BB Display - Top Right with Rotating Coin */}
      {barberBucks !== undefined && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-3 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-cyan-500/20">
          <RotatingBBCoin 
            avatarUrl={avatar_url} 
            displayName={display_name} 
            size="xs" 
            animate={true} 
          />
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-white">{barberBucks.toLocaleString()}</span>
              <span className="text-xs text-cyan-400">BB</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onAddFundsClick && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-cyan-500/20" onClick={onAddFundsClick}>
                <Plus className="h-3 w-3 text-cyan-400" />
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0 hover:bg-primary/20" 
              onClick={() => toast.info('Withdrawal requests are processed within 3-5 business days. Contact support to initiate a withdrawal.')}
            >
              <ArrowDownToLine className="h-3 w-3 text-primary" />
            </Button>
          </div>
        </div>
      )}
      
      <CardContent className="relative p-4 md:p-8 z-10">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
          <div className="flex flex-col items-center gap-1">
            <TierRing tier={subscription_tier} size="lg" interactive={showActions}>
              <Avatar className="w-20 h-20 md:w-32 md:h-32">
                <AvatarImage src={avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-3xl md:text-4xl font-bold">
                  {(display_name || 'B').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TierRing>
            <M4MHeartbeat
              certified={m4m_certified}
              paid={m4m_paid}
              livesTouched={m4m_lives_touched}
              barberName={display_name}
              barberUserId={barber_user_id || ''}
              size="md"
              isOwnProfile={showActions}
            />
          </div>

          <div className="flex-1 space-y-3 w-full">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-4xl font-bold text-white">{display_name}</h1>
                {country_code && (
                  <span className="text-2xl md:text-3xl">{getCountryFlag(country_code)}</span>
                )}
                {is_live && (
                  <Badge variant="destructive" className="animate-pulse text-sm md:text-lg px-2 md:px-3 py-1">
                    🔴 LIVE NOW
                  </Badge>
                )}
              </div>
              
              {specialty && (
                <p className="text-base md:text-lg text-muted-foreground mt-2">{specialty}</p>
              )}

              {/* Social Media Icons - Max 3 */}
              {(() => {
                const activeSocials = [
                  { key: 'instagram', url: socialLinks?.instagram, icon: Instagram, hoverClass: 'hover:text-pink-500' },
                  { key: 'twitter', url: socialLinks?.twitter, icon: Twitter, hoverClass: 'hover:text-blue-400' },
                  { key: 'youtube', url: socialLinks?.youtube, icon: Youtube, hoverClass: 'hover:text-red-500' },
                  { key: 'facebook', url: socialLinks?.facebook, icon: Facebook, hoverClass: 'hover:text-blue-500' },
                ].filter(s => s.url).slice(0, 3);

                if (activeSocials.length === 0) return null;

                return (
                  <div className="flex items-center gap-2 mt-2">
                    {activeSocials.map(({ key, url, icon: Icon, hoverClass }) => (
                      <a
                        key={key}
                        href={url!.startsWith('http') ? url! : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-muted-foreground ${hoverClass} transition-colors`}
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Stats Row */}
            <div className="flex gap-4 md:gap-6 flex-wrap">
              <div className="text-center">
                <div className="text-lg md:text-3xl font-bold text-white">{stats.follower_count}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-lg md:text-3xl font-bold text-white">{stats.like_count}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Likes</div>
              </div>
              <div className="text-center">
                <div className="text-lg md:text-3xl font-bold text-primary">${totalDonations}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Donated</div>
              </div>
            </div>

            {/* Action Buttons */}
            {showActions && (
              <div className="flex gap-3 flex-wrap pt-1">
                {barber_id && (
                  <Link to={`/barbers/${barber_id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Public Profile
                    </Button>
                  </Link>
                )}
                {onSettingsClick && (
                  <Button variant="outline" size="sm" onClick={onSettingsClick}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                )}
                {onSignOutClick && (
                  <Button variant="ghost" size="sm" onClick={onSignOutClick} className="text-muted-foreground hover:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                )}
                {onDeleteAccountClick && (
                  <Button variant="ghost" size="sm" onClick={onDeleteAccountClick} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
