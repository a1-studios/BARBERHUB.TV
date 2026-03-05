import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TagSelector } from './TagSelector';
import { BARBER_REVIEW_TAGS, CLIENT_REVIEW_TAGS, ReviewTag } from '@/config/reviewTags';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostAppointmentReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  revieweeId: string;
  isBarberReviewing: boolean;
  onSuccess?: () => void;
}

export function PostAppointmentReviewModal({
  open, onOpenChange, appointmentId, revieweeId, isBarberReviewing, onSuccess,
}: PostAppointmentReviewModalProps) {
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const availableTags: ReviewTag[] = isBarberReviewing ? CLIENT_REVIEW_TAGS : BARBER_REVIEW_TAGS;

  const toggleTag = (slug: string) => {
    setSelectedTags(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const handleSubmit = async () => {
    if (stars < 1) {
      toast.error('Please select a star rating');
      return;
    }
    setSubmitting(true);
    try {
      const tags = selectedTags.map(slug => {
        const tag = availableTags.find(t => t.slug === slug);
        return { slug, is_negative: tag?.is_negative || false, is_internal: tag?.is_internal || false };
      });

      const { data, error } = await supabase.functions.invoke('submit-review', {
        body: { appointment_id: appointmentId, star_rating: stars, comment: comment || null, tags },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(isBarberReviewing ? 'Client feedback saved' : 'Review submitted! ✂️');
      onOpenChange(false);
      onSuccess?.();
      // Reset
      setStars(0);
      setComment('');
      setSelectedTags([]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const displayStars = hoverStars || stars;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isBarberReviewing ? 'Rate This Client' : 'Rate Your Barber'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHoverStars(n)}
                  onMouseLeave={() => setHoverStars(0)}
                  onClick={() => setStars(n)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'h-8 w-8 transition-colors',
                      n <= displayStars ? 'fill-primary text-primary' : 'text-muted-foreground/30'
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {displayStars === 0 && 'Tap to rate'}
              {displayStars === 1 && 'Poor'}
              {displayStars === 2 && 'Fair'}
              {displayStars === 3 && 'Good'}
              {displayStars === 4 && 'Great'}
              {displayStars === 5 && 'Outstanding'}
            </p>
          </div>

          {/* Tag Pills */}
          <div>
            <Label className="text-sm mb-2 block">
              {isBarberReviewing ? 'Client Tags (internal only)' : 'What stood out?'}
            </Label>
            <TagSelector tags={availableTags} selected={selectedTags} onToggle={toggleTag} />
          </div>

          {/* Comment */}
          <div>
            <Label className="text-sm">Comment (optional)</Label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={isBarberReviewing ? 'Internal notes about this client...' : 'Share your experience...'}
              maxLength={500}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={stars < 1 || submitting}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
