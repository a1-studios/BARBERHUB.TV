import { Badge } from '@/components/ui/badge';
import { Scissors, Users, Shield } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface RoleBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RoleBadge = ({ size = 'md', className }: RoleBadgeProps) => {
  const { isBarber, isFan, isAdmin } = useUserRole();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (isAdmin) {
    return (
      <Badge 
        variant="default" 
        className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white ${sizeClasses[size]} ${className}`}
      >
        <Shield className={`${iconSize[size]} mr-1`} />
        Admin
      </Badge>
    );
  }

  if (isBarber) {
    return (
      <Badge 
        variant="default" 
        className={`bg-gradient-to-r from-primary to-orange-500 text-white ${sizeClasses[size]} ${className}`}
      >
        <Scissors className={`${iconSize[size]} mr-1`} />
        Barber
      </Badge>
    );
  }

  if (isFan) {
    return (
      <Badge 
        variant="secondary" 
        className={`${sizeClasses[size]} ${className}`}
      >
        <Users className={`${iconSize[size]} mr-1`} />
        Fan
      </Badge>
    );
  }

  return null;
};
