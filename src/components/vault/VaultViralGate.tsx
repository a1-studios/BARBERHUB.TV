import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, Check, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface VaultViralGateProps {
  onComplete: (shared: boolean) => void;
}

const VaultViralGate = ({ onComplete }: VaultViralGateProps) => {
  const [showSkip, setShowSkip] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const shareUrl = `${window.location.origin}/vault`;
  const shareText = '🔥 I just unlocked the Vault of Honor! Spin the wheel for FREE rewards on BarberBattles.';

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Vault of Honor', text: shareText, url: shareUrl });
        onComplete(true);
      } else {
        // Fallback: copy link
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setCopied(true);
        toast.success('Link copied! Share it with friends.');
        setTimeout(() => onComplete(true), 1000);
      }
    } catch {
      // User cancelled share dialog — still count as intent
      onComplete(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 space-y-8">
      {/* Lock Animation */}
      <motion.div
        className="relative w-32 h-32 flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <motion.div
          className="w-28 h-28 rounded-2xl border-2 border-[#FF5F1F]/50 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1a1a2e, #0D0D0D)' }}
          animate={{ rotateY: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="w-4 h-12 bg-[#FF5F1F] rounded-full"
            animate={{ scaleY: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
        {/* Glow */}
        <div
          className="absolute inset-0 rounded-2xl opacity-40"
          style={{ boxShadow: '0 0 40px rgba(255,95,31,0.5)' }}
        />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-black text-center text-white"
      >
        SHARE TO UNLOCK THE WHEEL
      </motion.h2>
      <p className="text-sm text-gray-400 text-center max-w-xs">
        Spread the word to unlock your spin. One share = one chance at glory.
      </p>

      {/* Share Button */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleShare}
        className="w-full max-w-xs py-4 rounded-xl font-black text-lg text-black tracking-wider flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #FF5F1F, #FF8C00)',
          boxShadow: '0 0 30px rgba(255,95,31,0.5)',
        }}
      >
        {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
        {copied ? 'COPIED!' : 'SHARE TO SPIN'}
      </motion.button>

      {/* Desktop fallback: copy link */}
      {!navigator.share && !copied && (
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success('Link copied!');
            setTimeout(() => onComplete(true), 1000);
          }}
          className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-300 transition-colors"
        >
          <Copy className="w-3 h-3" /> Copy link instead
        </button>
      )}

      {/* Skip (appears after 5s) */}
      {showSkip && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => onComplete(false)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
        >
          Skip for now <ChevronRight className="w-3 h-3" />
        </motion.button>
      )}
    </div>
  );
};

export default VaultViralGate;
