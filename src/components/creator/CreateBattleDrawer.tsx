import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { TOURNAMENT_CATEGORIES } from '@/config/categories';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { UpgradePrompt } from '@/components/barber/UpgradePrompt';

interface CreateBattleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBattleDrawer({ isOpen, onClose }: CreateBattleDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { canCreateBattle, battlesRemaining, isUnlimited } = useSubscriptionLimits();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [startsAt, setStartsAt] = useState<Date | undefined>();
  const [endsAt, setEndsAt] = useState<Date | undefined>();
  const [submissionDeadline, setSubmissionDeadline] = useState<Date | undefined>();

  const handleSubmit = async () => {
    if (!user || !title.trim() || !category) return;

    if (!canCreateBattle) {
      setShowUpgrade(true);
      return;
    }

    setSubmitting(true);
    try {
      const { data: battle, error } = await supabase
        .from('battles')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          category,
          prize_amount: 0,
          currency: 'BB',
          organizer_id: user.id,
          status: 'upcoming',
          battle_type: 'unofficial',
          starts_at: startsAt?.toISOString() || null,
          ends_at: endsAt?.toISOString() || null,
          submission_deadline: submissionDeadline?.toISOString() || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Battle created!');
      onClose();
      navigate(`/battles/${battle.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create battle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center justify-center gap-2 text-lg font-bold">
              <Trophy className="w-5 h-5 text-primary" />
              Create Battle
            </DrawerTitle>
            {!isUnlimited && canCreateBattle && (
              <p className="text-xs text-muted-foreground text-center">{battlesRemaining} battles remaining this month</p>
            )}
          </DrawerHeader>

          <div className="px-4 pb-6 overflow-y-auto space-y-3">
            <Input
              placeholder="Battle title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-card/50 border-border/30"
            />

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-card/50 border-border/30">
                <SelectValue placeholder="Category *" />
              </SelectTrigger>
              <SelectContent>
                {TOURNAMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.shortName}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-card/50 border-border/30 min-h-[60px] resize-none text-sm"
            />

            {/* Date pickers */}
            <div className="grid grid-cols-2 gap-2">
              <DatePickerField label="Starts" value={startsAt} onChange={setStartsAt} />
              <DatePickerField label="Ends" value={endsAt} onChange={setEndsAt} />
            </div>
            <DatePickerField label="Submission deadline" value={submissionDeadline} onChange={setSubmissionDeadline} />

            <Button
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !category}
              className="w-full h-11 font-bold rounded-xl"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {canCreateBattle ? 'Create Battle' : 'Upgrade to Create'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <UpgradePrompt
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason="battle_limit"
      />
    </>
  );
}

function DatePickerField({ label, value, onChange }: { label: string; value?: Date; onChange: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left text-xs font-normal bg-card/50 border-border/30 h-9",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-1.5 h-3 w-3 opacity-50" />
          {value ? format(value, "MMM d") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={(date) => date < new Date()}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
