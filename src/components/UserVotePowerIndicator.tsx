import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';

export const UserVotePowerIndicator = () => {
  const { isVerified, isFan, profile } = useUserProfile();

  if (!isFan) return null;

  const votePower = isVerified ? 3 : 1;
  const isExpiring = profile?.three_x_vote_expires_at && 
    new Date(profile.three_x_vote_expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={isVerified ? "default" : "secondary"} 
        className={`${
          isVerified 
            ? "bg-gradient-to-r from-yellow-500 to-amber-600 text-white" 
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Zap className="w-3 h-3 mr-1" />
        {votePower}x Vote Power
      </Badge>
      {isExpiring && (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          Expires Soon
        </Badge>
      )}
    </div>
  );
};