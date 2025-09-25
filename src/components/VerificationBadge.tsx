import { Badge } from '@/components/ui/badge';
import { Shield, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerificationBadgeProps {
  isVerified?: boolean;
  expiresAt?: string;
  className?: string;
}

export const VerificationBadge = ({ isVerified, expiresAt, className }: VerificationBadgeProps) => {
  if (!isVerified) return null;

  const expirationDate = expiresAt ? new Date(expiresAt) : null;
  const isExpired = expirationDate && expirationDate < new Date();
  
  if (isExpired) return null;

  const formatExpirationDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={`bg-gradient-to-r from-yellow-500/10 to-amber-600/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20 transition-colors ${className}`}>
            <Shield className="w-3 h-3 mr-1" />
            Verified
            <span className="ml-1 text-xs font-bold">3x</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>
              Tournament verified • 3x vote power
              {expirationDate && (
                <span className="block text-sm opacity-75">
                  Expires: {formatExpirationDate(expirationDate)}
                </span>
              )}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};