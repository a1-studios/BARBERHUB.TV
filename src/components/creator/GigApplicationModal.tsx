import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Briefcase, MapPin, Heart, Coins } from 'lucide-react';

interface GigApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gig: {
    id: string;
    title: string;
    description: string | null;
    budget_bb: number;
    location: string | null;
    charity_percent: number;
    slots: number;
    applications_count: number;
  };
}

export function GigApplicationModal({ open, onOpenChange, gig }: GigApplicationModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id) return;
    setSubmitting(true);

    const { error } = await supabase
      .from('gig_applications' as any)
      .insert({
        gig_id: gig.id,
        barber_id: user.id,
        message: message.trim() || null,
      } as any);

    setSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('You already applied to this gig');
      } else {
        toast.error('Failed to submit application');
      }
      return;
    }

    toast.success('Application submitted!');
    queryClient.invalidateQueries({ queryKey: ['sponsor-gigs'] });
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Apply to Gig
          </DialogTitle>
          <DialogDescription>{gig.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {gig.description && (
            <p className="text-sm text-muted-foreground">{gig.description}</p>
          )}

          <div className="flex flex-wrap gap-3 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
              <Coins className="w-3 h-3" />
              {gig.budget_bb} BB
            </span>
            {gig.location && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {gig.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500/10 text-pink-400 font-medium">
              <Heart className="w-3 h-3" />
              {gig.charity_percent}% to Minutes for Men
            </span>
          </div>

          <div className="text-xs text-muted-foreground">
            {gig.applications_count} / {gig.slots} slots filled
          </div>

          <Textarea
            placeholder="Short message to the sponsor (optional)..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={3}
            className="resize-none"
          />

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
