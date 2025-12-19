import { motion } from 'framer-motion';

interface BannerChainEffectProps {
  colorTheme: string;
}

export const BannerChainEffect = ({ colorTheme }: BannerChainEffectProps) => {
  const chainLinks = [1, 2, 3];
  
  return (
    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
      {/* Mounting hook */}
      <motion.div
        className="w-6 h-3 rounded-t-full bg-gradient-to-b from-zinc-400 to-zinc-600 shadow-lg"
        style={{
          boxShadow: `0 0 10px ${colorTheme}40`
        }}
      />
      
      {/* Chain links */}
      {chainLinks.map((link, index) => (
        <motion.div
          key={link}
          initial={{ rotateZ: 0 }}
          animate={{ 
            rotateZ: [0, 2, -2, 0]
          }}
          transition={{
            duration: 3,
            delay: index * 0.1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          <div 
            className="w-3 h-4 border-2 rounded-full"
            style={{
              borderColor: 'hsl(var(--muted-foreground))',
              background: 'linear-gradient(180deg, hsl(var(--muted)) 0%, hsl(var(--background)) 100%)'
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};
