import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { TOURNAMENT_CATEGORIES } from '@/config/categories';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ArenaGateChooseCategoriesStepProps {
  onComplete: () => void;
  onBack: () => void;
}

export const ArenaGateChooseCategoriesStep = ({ onComplete, onBack }: ArenaGateChooseCategoriesStepProps) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleCategory = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 2) {
        toast.info('Max 2 categories allowed');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('barber_profiles')
        .update({ competition_categories: selected } as any)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Battle categories saved!');
      onComplete();
    } catch (err: any) {
      console.error('Save categories error:', err);
      toast.error('Failed to save categories');
      onComplete(); // Don't block the flow
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      key="choose-categories"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col min-h-0 overflow-y-auto"
    >
      <h3 className="text-lg font-black text-center bg-gradient-to-r from-pink-500 via-primary to-cyan-400 bg-clip-text text-transparent mb-1">
        CHOOSE YOUR BATTLEFIELD
      </h3>
      <p className="text-center text-[11px] text-muted-foreground mb-3">
        Pick up to 2 categories to compete in
      </p>

      <div className="space-y-2 flex-1">
        {TOURNAMENT_CATEGORIES.map((cat, i) => {
          const isSelected = selected.includes(cat.id);
          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                isSelected
                  ? 'ring-1 scale-[1.02]'
                  : 'hover:scale-[1.01]'
              )}
              style={{
                borderColor: isSelected ? cat.colorTheme.primary : 'hsl(var(--border))',
                background: isSelected
                  ? `linear-gradient(135deg, ${cat.colorTheme.primary}15, transparent)`
                  : 'transparent',
                boxShadow: isSelected ? `0 0 20px ${cat.colorTheme.glow}25` : 'none',
                
              }}
            >
              <span className="text-2xl">{cat.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-foreground">{cat.shortName}</div>
                <div className="text-[10px] text-muted-foreground">{cat.vibe}</div>
              </div>
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${cat.colorTheme.primary}30`, color: cat.colorTheme.primary }}
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-3 space-y-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 font-bold"
        >
          {saving ? 'Saving...' : selected.length > 0 ? `Enter the Arena (${selected.length}/2)` : 'Enter the Arena'}
        </Button>
        <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={onComplete}>
          Skip — explore first
        </Button>
        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground/60" onClick={onBack}>
          ← Back
        </Button>
      </div>
    </motion.div>
  );
};
