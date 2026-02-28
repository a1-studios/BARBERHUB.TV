import { useState } from 'react';
import { motion } from 'framer-motion';
import { Scissors, Users, Mail, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { z } from 'zod';

const emailSchema = z.string().trim().email().max(255);

interface VaultEntryProps {
  onComplete: (email: string, role: 'barber' | 'fan') => void;
}

const VaultEntry = ({ onComplete }: VaultEntryProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'barber' | 'fan' | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError('Enter a valid email');
      return;
    }
    if (!role) {
      setError('Choose your role first');
      return;
    }
    setError('');
    onComplete(result.data, role);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 space-y-8">
      {/* Pulsing Vault Door */}
      <motion.div
        className="relative w-40 h-40 rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle, hsl(25 100% 55% / 0.3), hsl(210 100% 19% / 0.5), transparent)',
          boxShadow: '0 0 60px hsl(25 100% 55% / 0.4), inset 0 0 40px hsl(210 100% 19% / 0.3)',
        }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-24 h-24 rounded-full border-2 border-[hsl(25,100%,55%)] flex items-center justify-center bg-[#0D0D0D]/80">
          <Zap className="w-10 h-10 text-[hsl(25,100%,55%)]" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl md:text-3xl font-black text-center tracking-tight"
        style={{ color: '#FF5F1F' }}
      >
        VAULT OF HONOR
      </motion.h1>
      <p className="text-sm text-gray-400 text-center max-w-xs">
        Spin the wheel for exclusive rewards. Choose your path first.
      </p>

      {/* Role Toggle */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={() => { setRole('barber'); setError(''); }}
          className={`relative p-4 border rounded-xl transition-all duration-300 ${
            role === 'barber'
              ? 'border-[#FF5F1F]/60 bg-[#FF5F1F]/10 shadow-[0_0_20px_rgba(255,95,31,0.3)]'
              : 'border-gray-700 bg-gray-900/50 hover:border-[#FF5F1F]/30'
          }`}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className={`p-2 rounded-full ${role === 'barber' ? 'bg-[#FF5F1F] text-black' : 'bg-gray-800'}`}>
              <Scissors className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-white">BARBER</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => { setRole('fan'); setError(''); }}
          className={`relative p-4 border rounded-xl transition-all duration-300 ${
            role === 'fan'
              ? 'border-[#002D62]/60 bg-[#002D62]/20 shadow-[0_0_20px_rgba(0,45,98,0.4)]'
              : 'border-gray-700 bg-gray-900/50 hover:border-[#002D62]/40'
          }`}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className={`p-2 rounded-full ${role === 'fan' ? 'bg-[#002D62] text-white' : 'bg-gray-800'}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-white">FAN</span>
          </div>
        </button>
      </div>

      {/* Email */}
      <div className="w-full max-w-xs space-y-2">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            className="pl-10 bg-gray-900/80 border-gray-700 text-white placeholder:text-gray-600"
            maxLength={255}
          />
        </div>
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSubmit}
        className="w-full max-w-xs py-4 rounded-xl font-black text-lg text-black tracking-wider"
        style={{
          background: 'linear-gradient(135deg, #FF5F1F, #FF8C00)',
          boxShadow: '0 0 30px rgba(255,95,31,0.5)',
        }}
      >
        ⚡ POWER THE VAULT
      </motion.button>
    </div>
  );
};

export default VaultEntry;
