import { Badge } from '@/components/ui/badge';
import { GraduationCap, Award } from 'lucide-react';

interface SubCategoryBadgeProps {
  subCategory: string | null | undefined;
  size?: 'sm' | 'md';
}

export const SubCategoryBadge = ({ subCategory, size = 'sm' }: SubCategoryBadgeProps) => {
  if (!subCategory) return null;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5'
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5'
  };

  if (subCategory === 'educator') {
    return (
      <Badge
        variant="default"
        className={`bg-gradient-to-r from-emerald-600 to-green-500 text-white border-0 ${sizeClasses[size]}`}
      >
        <GraduationCap className={`${iconSize[size]} mr-0.5`} />
        Educator
      </Badge>
    );
  }

  if (subCategory === 'official_sponsor') {
    return (
      <Badge
        variant="default"
        className={`bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-0 ${sizeClasses[size]}`}
      >
        <Award className={`${iconSize[size]} mr-0.5`} />
        Official Sponsor
      </Badge>
    );
  }

  return null;
};
