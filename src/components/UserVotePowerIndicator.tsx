import { Badge } from '@/components/ui/badge';
import { Zap, Crown, Sparkles } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const UserVotePowerIndicator = () => {
  const { isVerified, isFan, profile } = useUserProfile();

  if (!isFan) return null;

  const votePower = isVerified ? 3 : 1;
  const isExpiring = profile?.three_x_vote_expires_at && 
    new Date(profile.three_x_vote_expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const badgeContent = (
    <div className="flex items-center gap-2">
      <Badge 
        variant={isVerified ? "default" : "secondary"} 
        className={`${
          isVerified 
            ? "bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg shadow-yellow-500/30 border-yellow-400" 
            : "bg-muted text-muted-foreground"
        } font-bold transition-all duration-300`}
      >
        {isVerified ? (
          <>
            <Sparkles className="w-4 h-4 mr-1 animate-pulse" />
            <span className="text-base">{votePower}x</span>
            <Zap className="w-4 h-4 ml-1" />
            <span className="ml-1">VOTE POWER</span>
          </>
        ) : (
          <>
            <Zap className="w-3 h-3 mr-1" />
            {votePower}x Vote Power
          </>
        )}
      </Badge>
      {isExpiring && (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          Expires Soon
        </Badge>
      )}
    </div>
  );

  if (!isVerified) return badgeContent;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-card border-border">
          <div className="space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1">
              <Crown className="w-4 h-4 text-yellow-500" />
              3x Vote Power Active!
            </p>
            <p className="text-sm text-muted-foreground">
              {profile?.three_x_vote_expires_at 
                ? `Valid until ${new Date(profile.three_x_vote_expires_at).toLocaleDateString()}`
                : 'Active subscription or tournament verification'}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};