import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Globe, Zap, Search, Users, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface GlobalContendersHeaderProps {
  contenderCount: number;
}

export const GlobalContendersHeader = ({ contenderCount }: GlobalContendersHeaderProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    navigate(`/barbers${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
      style={{ perspective: '1000px' }}
    >
      {/* Main Container with Banner-like styling */}
      <motion.div
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        animate={{
          rotateY: isHovered ? 0 : [-0.3, 0.3, -0.3],
          rotateX: isHovered ? 0 : [0.1, -0.1, 0.1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative transform-gpu"
      >
        {/* Outer Orange Frame */}
        <div 
          className={cn(
            "absolute inset-0 rounded-2xl transition-all duration-300",
            isHovered ? "opacity-100" : "opacity-90"
          )}
          style={{
            background: 'linear-gradient(180deg, hsl(24 100% 52%) 0%, hsl(24 100% 40%) 100%)',
            boxShadow: isHovered 
              ? '0 0 40px hsl(187 100% 50% / 0.5), 0 0 80px hsl(187 100% 50% / 0.3), inset 0 0 30px hsl(24 100% 60% / 0.5)'
              : '0 0 20px hsl(24 100% 50% / 0.3), 0 10px 30px rgba(0,0,0,0.5)'
          }}
        />

        {/* Inner Dark Body */}
        <div 
          className="relative m-[3px] rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, hsl(240 10% 8%) 0%, hsl(240 10% 4%) 70%, hsl(187 100% 15% / 0.3) 100%)',
          }}
        >
          {/* Inner Orange Border */}
          <div 
            className="absolute inset-[2px] rounded-xl pointer-events-none"
            style={{
              border: '1px solid hsl(24 100% 52% / 0.5)',
            }}
          />

          {/* Cyan Energy Glow from Bottom */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            animate={{
              height: isHovered ? '70%' : '50%',
              opacity: isHovered ? 0.9 : 0.6,
            }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'linear-gradient(180deg, transparent 0%, hsl(187 100% 50% / 0.1) 40%, hsl(187 100% 50% / 0.3) 100%)',
            }}
          />

          {/* Animated Energy Waves */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[40%] pointer-events-none"
            animate={{
              opacity: isHovered ? [0.5, 0.8, 0.5] : [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div 
              className="w-full h-full"
              style={{
                background: `radial-gradient(ellipse at 50% 100%, hsl(187 100% 50% / 0.4) 0%, transparent 70%)`,
                filter: 'blur(10px)',
              }}
            />
          </motion.div>

          {/* Sparkle Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-cyan rounded-full"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${20 + (i % 3) * 20}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.5, 0.5],
                }}
                transition={{
                  duration: 2 + i * 0.3,
                  repeat: Infinity,
                  delay: i * 0.4,
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10">
            {/* Top Row - Title and Stats */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
              {/* Title Section */}
              <div className="text-center lg:text-left">
                <motion.div 
                  className="flex items-center justify-center lg:justify-start gap-3 mb-2"
                  animate={{ 
                    textShadow: isHovered 
                      ? '0 0 30px hsl(187 100% 50%)' 
                      : '0 0 15px hsl(187 100% 50% / 0.5)'
                  }}
                >
                  <motion.div
                    animate={{ rotate: isHovered ? 360 : 0 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  >
                    <Globe className="w-8 h-8 sm:w-10 sm:h-10 text-cyan" />
                  </motion.div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-cyan">
                    Global Contenders
                  </h2>
                </motion.div>
                <p className="text-foreground/80 text-sm sm:text-base flex items-center justify-center lg:justify-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Drag to rotate • Click to view profiles
                </p>
              </div>

              {/* Stats Badges */}
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan/30 bg-cyan/10"
                  style={{
                    boxShadow: '0 0 15px hsl(187 100% 50% / 0.2)',
                  }}
                >
                  <Users className="w-5 h-5 text-cyan" />
                  <span className="text-xl sm:text-2xl font-bold text-cyan">{contenderCount}+</span>
                  <span className="text-xs text-cyan/70 hidden sm:inline">Barbers</span>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary/10"
                  style={{
                    boxShadow: '0 0 15px hsl(24 100% 50% / 0.2)',
                  }}
                >
                  <Crown className="w-5 h-5 text-primary" />
                  <span className="text-xs sm:text-sm text-primary font-medium">Worldwide</span>
                </motion.div>
              </div>
            </div>

            {/* Search Bar - Centered */}
            <div className="max-w-xl mx-auto">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative"
              >
                {/* Search Glow Effect */}
                <div 
                  className="absolute inset-0 rounded-xl blur-md pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, hsl(24 100% 50% / 0.3), hsl(187 100% 50% / 0.3), hsl(24 100% 50% / 0.3))',
                  }}
                />
                
                <div className="relative flex items-center gap-2 p-1.5 rounded-xl border-2 border-cyan/40 bg-background/90 backdrop-blur-sm">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Find top barbers near you..."
                      className="pl-10 pr-4 py-3 bg-transparent border-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground/60"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    className="gap-2 px-6 py-3 bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 text-primary-foreground font-semibold"
                    style={{
                      boxShadow: '0 0 20px hsl(24 100% 50% / 0.4)',
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    <span className="hidden sm:inline">Find Barbers</span>
                    <span className="sm:hidden">Go</span>
                  </Button>
                </div>
              </motion.div>
              
              <p className="text-center text-xs text-muted-foreground/60 mt-3">
                Browse portfolios, read reviews, and book appointments
              </p>
            </div>
          </div>

          {/* Corner Lightning Effects */}
          {isHovered && (
            <>
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: [0, 1, 0], scaleY: [0, 1, 0] }}
                transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 0.8 }}
                className="absolute left-2 top-1/4 w-0.5 h-12 bg-gradient-to-b from-cyan via-cyan/50 to-transparent rounded-full"
                style={{ filter: 'blur(1px)' }}
              />
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: [0, 1, 0], scaleY: [0, 1, 0] }}
                transition={{ duration: 0.4, delay: 0.3, repeat: Infinity, repeatDelay: 0.8 }}
                className="absolute right-2 top-1/3 w-0.5 h-10 bg-gradient-to-b from-cyan via-cyan/50 to-transparent rounded-full"
                style={{ filter: 'blur(1px)' }}
              />
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: [0, 1, 0], scaleX: [0, 1, 0] }}
                transition={{ duration: 0.3, delay: 0.5, repeat: Infinity, repeatDelay: 1 }}
                className="absolute bottom-4 left-1/4 w-16 h-0.5 bg-gradient-to-r from-transparent via-cyan to-transparent rounded-full"
                style={{ filter: 'blur(1px)' }}
              />
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
