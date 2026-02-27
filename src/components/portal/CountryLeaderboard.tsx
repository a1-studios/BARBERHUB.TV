import { motion } from 'framer-motion';
import { Globe, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CountryLeaderCard } from './CountryLeaderCard';
import { useCountryLeaders } from '@/hooks/useCountryLeaders';
import { useToast } from '@/hooks/use-toast';

export const CountryLeaderboard = () => {
  const { data: countries, isLoading } = useCountryLeaders(12);
  const { toast } = useToast();


  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="w-full h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!countries || countries.length === 0) {
    return (
      <div className="text-center py-8">
        <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No country leaders yet</p>
        <p className="text-sm text-muted-foreground">Be the first to represent your nation!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-3"
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <Globe className="w-7 h-7 text-cyan-400" />
        </motion.div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Country Leaders
        </h2>
        <Trophy className="w-5 h-5 text-yellow-500" />
      </motion.div>

      <p className="text-center text-sm text-muted-foreground -mt-2">
        Top barbers representing their nations in the 2026 Global Championship
      </p>

      {/* Vertical Cards Grid */}
      <div className="grid gap-4">
        {countries.map((country, index) => (
          <CountryLeaderCard
            key={country.country_code}
            countryCode={country.country_code}
            countryName={country.country_name}
            leaders={country.leaders}
            totalPoints={country.total_points}
            barberCount={country.barber_count}
            index={index}
          />
        ))}
      </div>

      {/* Stats Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center gap-6 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-1">
          <Globe className="w-4 h-4" />
          <span>{countries.length} countries</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span>
            {countries.reduce((sum, c) => sum + c.total_points, 0).toLocaleString()} total points
          </span>
        </div>
      </motion.div>
    </div>
  );
};
