import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarIcon, Loader2, Trophy, ChevronDown, Users, Clock, Award, FileText, Zap, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { TOURNAMENT_CATEGORIES } from '@/config/categories';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { UpgradePrompt } from '@/components/barber/UpgradePrompt';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { z } from 'zod';

interface CreateBattleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const battleSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Please select a category'),
  max_participants: z.number().min(2).max(64).optional(),
  starts_at: z.date().optional(),
  ends_at: z.date().optional(),
  submission_deadline: z.date().optional(),
  voting_ends_at: z.date().optional(),
  rules: z.string().optional(),
  cover_image_url: z.string().url().optional().or(z.literal('')),
  streaming_type: z.string().optional(),
  prize_seed_bb: z.number().min(0).optional(),
});

type BattleFormData = z.infer<typeof battleSchema>;

const STREAMING_TYPES = [
  { value: 'twilio', label: 'Twilio (Default)' },
  { value: 'youtube', label: 'YouTube Live' },
  { value: 'video_upload', label: 'Video Upload Only' },
];

export function CreateBattleDrawer({ isOpen, onClose }: CreateBattleDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { canCreateBattle, battlesRemaining, isUnlimited } = useSubscriptionLimits();
  const { barberBucks } = useBarberBucks();

  // Section open states
  const [basicOpen, setBasicOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [prizeOpen, setPrizeOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<string>('');
  const [streamingType, setStreamingType] = useState('twilio');
  const [startsAt, setStartsAt] = useState<Date | undefined>();
  const [endsAt, setEndsAt] = useState<Date | undefined>();
  const [submissionDeadline, setSubmissionDeadline] = useState<Date | undefined>();
  const [votingEndsAt, setVotingEndsAt] = useState<Date | undefined>();
  const [prizeSeedBB, setPrizeSeedBB] = useState<string>('0');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [rules, setRules] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setTitle(''); setDescription(''); setCategory('');
    setMaxParticipants(''); setStreamingType('twilio');
    setStartsAt(undefined); setEndsAt(undefined);
    setSubmissionDeadline(undefined); setVotingEndsAt(undefined);
    setPrizeSeedBB('0'); setCoverImageUrl(''); setRules('');
    setErrors({});
    setBasicOpen(true); setSettingsOpen(false);
    setScheduleOpen(false); setPrizeOpen(false);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (title.trim().length < 3) errs.title = 'Title must be at least 3 characters';
    if (!category) errs.category = 'Please select a category';
    const maxP = maxParticipants ? parseInt(maxParticipants) : undefined;
    if (maxP !== undefined && (maxP < 2 || maxP > 64)) errs.max_participants = 'Must be 2–64';
    if (startsAt && endsAt && endsAt <= startsAt) errs.ends_at = 'End must be after start';
    if (submissionDeadline && endsAt && submissionDeadline >= endsAt) errs.submission_deadline = 'Must be before end date';
    if (votingEndsAt && endsAt && votingEndsAt <= endsAt) errs.voting_ends_at = 'Must be after end date';
    const seed = parseInt(prizeSeedBB) || 0;
    if (seed > barberBucks) errs.prize_seed = `Insufficient BB (you have ${barberBucks.toLocaleString()})`;
    if (coverImageUrl && coverImageUrl.length > 0) {
      try { new URL(coverImageUrl); } catch { errs.cover_image = 'Must be a valid URL'; }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!user || !validate()) return;

    if (!canCreateBattle) {
      setShowUpgrade(true);
      return;
    }

    setSubmitting(true);
    try {
      const seed = parseInt(prizeSeedBB) || 0;
      const maxP = maxParticipants ? parseInt(maxParticipants) : null;

      const { data: battle, error } = await supabase
        .from('battles')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          prize_amount: seed,
          currency: 'BB',
          organizer_id: user.id,
          status: 'upcoming',
          battle_type: 'unofficial',
          streaming_type: streamingType || 'twilio',
          max_participants: maxP,
          starts_at: startsAt?.toISOString() || null,
          ends_at: endsAt?.toISOString() || null,
          submission_deadline: submissionDeadline?.toISOString() || null,
          voting_ends_at: votingEndsAt?.toISOString() || null,
          cover_image_url: coverImageUrl.trim() || null,
          rules: rules.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Battle created successfully!');
      resetForm();
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
      <Drawer open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); } }}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2 border-b border-border/30">
            <DrawerTitle className="flex items-center justify-center gap-2 text-lg font-bold">
              <Trophy className="w-5 h-5 text-primary" />
              CREATE BATTLE
            </DrawerTitle>
            {!isUnlimited && canCreateBattle && (
              <p className="text-xs text-muted-foreground text-center mt-1">
                {battlesRemaining} battle{battlesRemaining !== 1 ? 's' : ''} remaining this month
              </p>
            )}
            {!canCreateBattle && (
              <p className="text-xs text-destructive text-center mt-1">
                Monthly limit reached — upgrade to create more
              </p>
            )}
          </DrawerHeader>

          <div className="overflow-y-auto px-4 pb-6 space-y-2 pt-3">
            {/* ─── BASIC INFO ─── */}
            <CollapsibleSection
              icon={<FileText className="w-4 h-4" />}
              title="Basic Info"
              open={basicOpen}
              onToggle={() => setBasicOpen(!basicOpen)}
            >
              <div className="space-y-3">
                <FormField label="Battle Title *" error={errors.title}>
                  <Input
                    placeholder="Best Fade Competition"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-card/50 border-border/30"
                  />
                </FormField>

                <FormField label="Category *" error={errors.category}>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-card/50 border-border/30">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOURNAMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.shortName}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Description">
                  <Textarea
                    placeholder="Describe what this battle is about..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-card/50 border-border/30 min-h-[70px] resize-none text-sm"
                  />
                </FormField>
              </div>
            </CollapsibleSection>

            {/* ─── BATTLE SETTINGS ─── */}
            <CollapsibleSection
              icon={<Users className="w-4 h-4" />}
              title="Battle Settings"
              open={settingsOpen}
              onToggle={() => setSettingsOpen(!settingsOpen)}
            >
              <div className="space-y-3">
                <FormField label="Max Participants" hint="2–64 barbers (leave empty for unlimited)" error={errors.max_participants}>
                  <Input
                    type="number"
                    placeholder="e.g. 8"
                    min={2}
                    max={64}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    className="bg-card/50 border-border/30"
                  />
                </FormField>

                <FormField label="Streaming Type">
                  <Select value={streamingType} onValueChange={setStreamingType}>
                    <SelectTrigger className="bg-card/50 border-border/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STREAMING_TYPES.map((st) => (
                        <SelectItem key={st.value} value={st.value}>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </CollapsibleSection>

            {/* ─── SCHEDULE ─── */}
            <CollapsibleSection
              icon={<Clock className="w-4 h-4" />}
              title="Schedule"
              open={scheduleOpen}
              onToggle={() => setScheduleOpen(!scheduleOpen)}
            >
              <div className="space-y-3">
                <FormField label="Submission Deadline" hint="Barbers must submit videos by this date" error={errors.submission_deadline}>
                  <DatePickerField value={submissionDeadline} onChange={setSubmissionDeadline} placeholder="Pick deadline" />
                </FormField>

                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Starts At">
                    <DatePickerField value={startsAt} onChange={setStartsAt} placeholder="Start date" />
                  </FormField>
                  <FormField label="Ends At" error={errors.ends_at}>
                    <DatePickerField value={endsAt} onChange={setEndsAt} placeholder="End date" />
                  </FormField>
                </div>

                <FormField label="Voting Ends At" hint="When fan voting closes" error={errors.voting_ends_at}>
                  <DatePickerField value={votingEndsAt} onChange={setVotingEndsAt} placeholder="Voting end date" />
                </FormField>
              </div>
            </CollapsibleSection>

            {/* ─── PRIZE & RULES ─── */}
            <CollapsibleSection
              icon={<Award className="w-4 h-4" />}
              title="Prize & Rules"
              open={prizeOpen}
              onToggle={() => setPrizeOpen(!prizeOpen)}
            >
              <div className="space-y-3">
                <FormField label="Seed Prize Pool (BB)" hint={`Your balance: ${barberBucks.toLocaleString()} BB`} error={errors.prize_seed}>
                  <Input
                    type="number"
                    placeholder="0"
                    min={0}
                    value={prizeSeedBB}
                    onChange={(e) => setPrizeSeedBB(e.target.value)}
                    className="bg-card/50 border-border/30"
                  />
                </FormField>

                {/* Jackpot split info */}
                <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">Jackpot Split:</span> For official categories, donations follow the 80/15/5 rule — 80% to the Global Jackpot, 15% to the barber, 5% to M4M.
                    Unofficial battles keep 100% of seeded prizes for participants.
                  </div>
                </div>

                <FormField label="Cover Image URL" error={errors.cover_image}>
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    className="bg-card/50 border-border/30"
                  />
                </FormField>

                <FormField label="Rules & Guidelines" hint="Specific requirements for submissions">
                  <Textarea
                    placeholder="e.g. Must complete haircut within 45 minutes. No prior work allowed..."
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    className="bg-card/50 border-border/30 min-h-[80px] resize-none text-sm"
                  />
                </FormField>
              </div>
            </CollapsibleSection>

            {/* ─── PUBLISH BUTTON ─── */}
            <div className="pt-3 space-y-2">
              <Button
                onClick={handleSubmit}
                disabled={submitting || title.trim().length < 3 || !category}
                className="w-full h-12 font-bold rounded-xl text-base"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                {canCreateBattle ? 'Create & Publish Battle' : 'Upgrade to Publish'}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Non-premium battles are saved as unofficial and won't propagate in the network feed.
                <button
                  type="button"
                  onClick={() => setShowUpgrade(true)}
                  className="text-primary ml-1 underline"
                >
                  Upgrade for network reach
                </button>
              </p>
            </div>
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

/* ─── Helper: Collapsible Section ─── */
function CollapsibleSection({
  icon,
  title,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-card/60 border border-border/20 hover:border-primary/30 transition-colors">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {icon}
            {title}
          </span>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-1 pt-2 pb-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ─── Helper: Form Field ─── */
function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
      {hint && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

/* ─── Helper: Date Picker ─── */
function DatePickerField({
  value,
  onChange,
  placeholder,
}: {
  value?: Date;
  onChange: (d: Date | undefined) => void;
  placeholder: string;
}) {
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
          {value ? format(value, "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={(date) => date < new Date()}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
