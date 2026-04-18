import { motion } from 'framer-motion';
import { Scissors, Users } from 'lucide-react';

interface IdentifyStepProps {
  email: string;
  onSelect: (role: 'barber' | 'fan') => void;
}

export const IdentifyStep = ({ email, onSelect }: IdentifyStepProps) => {
  return (
    <div className="w-full max-w-md mx-auto px-6 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center space-y-2"
      >
        <p className="text-[10px] uppercase tracking-[0.3em] font-mono" style={{ color: '#00F0FF' }}>
          ◢ Welcome, {email}
        </p>
        <h2
          className="text-2xl md:text-3xl font-black tracking-[0.2em] uppercase"
          style={{ color: '#fff', textShadow: '0 0 12px rgba(0,240,255,0.5)' }}
        >
          Select Class
        </h2>
        <p className="text-xs uppercase tracking-widest" style={{ color: '#7a8a8d' }}>
          Choose your role to continue
        </p>
      </motion.div>

      {/* Sliding doors */}
      <div className="grid grid-cols-2 gap-4 relative overflow-hidden">
        {/* Left door — Barber */}
        <motion.button
          initial={{ x: '-120%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0.1 }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect('barber')}
          className="relative group flex flex-col items-center gap-3 py-8 px-4 border-2 transition-colors"
          style={{
            borderColor: 'rgba(255,95,0,0.5)',
            background: 'linear-gradient(180deg, rgba(255,95,0,0.08), rgba(0,0,0,0.6))',
            boxShadow:
              '0 0 30px rgba(255,95,0,0.2), inset 0 0 20px rgba(0,0,0,0.6)',
            borderRadius: '2px',
          }}
        >
          {/* Rivets */}
          <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#FF5F00]/50" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF5F00]/50" />
          <span className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#FF5F00]/50" />
          <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF5F00]/50" />
          <Scissors
            className="w-10 h-10 transition-transform group-hover:rotate-12"
            style={{ color: '#FF5F00', filter: 'drop-shadow(0 0 10px rgba(255,95,0,0.6))' }}
          />
          <span
            className="font-black tracking-[0.25em] text-sm uppercase"
            style={{ color: '#fff' }}
          >
            Barber
          </span>
          <span className="text-[9px] uppercase tracking-widest font-mono" style={{ color: '#FF8C00' }}>
            Operator
          </span>
        </motion.button>

        {/* Right door — Fan */}
        <motion.button
          initial={{ x: '120%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0.1 }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect('fan')}
          className="relative group flex flex-col items-center gap-3 py-8 px-4 border-2 transition-colors"
          style={{
            borderColor: 'rgba(0,240,255,0.5)',
            background: 'linear-gradient(180deg, rgba(0,240,255,0.08), rgba(0,0,0,0.6))',
            boxShadow:
              '0 0 30px rgba(0,240,255,0.2), inset 0 0 20px rgba(0,0,0,0.6)',
            borderRadius: '2px',
          }}
        >
          <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#00F0FF]/50" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#00F0FF]/50" />
          <span className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#00F0FF]/50" />
          <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#00F0FF]/50" />
          <Users
            className="w-10 h-10 transition-transform group-hover:scale-110"
            style={{ color: '#00F0FF', filter: 'drop-shadow(0 0 10px rgba(0,240,255,0.6))' }}
          />
          <span
            className="font-black tracking-[0.25em] text-sm uppercase"
            style={{ color: '#fff' }}
          >
            Fan
          </span>
          <span className="text-[9px] uppercase tracking-widest font-mono" style={{ color: '#00F0FF' }}>
            Spectator
          </span>
        </motion.button>
      </div>
    </div>
  );
};
