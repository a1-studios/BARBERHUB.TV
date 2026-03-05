import { useProfileValidator } from '@/hooks/useProfileValidator';
import { ProfileSetupPrompt } from '@/components/auth/ProfileSetupPrompt';
import { BackButton } from '@/components/ui/BackButton';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Trophy, AlertCircle, ShieldOff } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TOURNAMENT_CATEGORIES } from '@/config/categories';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UpgradePrompt } from '@/components/barber/UpgradePrompt';
import { Badge } from '@/components/ui/badge';

const battleSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Please select a category'),
  max_participants: z.number().min(2, 'Must allow at least 2 participants').optional(),
  starts_at: z.date().optional(),
  ends_at: z.date().optional(),
  submission_deadline: z.date().optional(),
  voting_ends_at: z.date().optional(),
  rules: z.string().optional(),
  cover_image_url: z.string().url().optional().or(z.literal('')),
}).refine((data) => {
  if (data.starts_at && data.ends_at) {
    return data.ends_at > data.starts_at;
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["ends_at"],
}).refine((data) => {
  if (data.submission_deadline && data.ends_at) {
    return data.submission_deadline < data.ends_at;
  }
  return true;
}, {
  message: "Submission deadline must be before battle end date",
  path: ["submission_deadline"],
}).refine((data) => {
  if (data.ends_at && data.voting_ends_at) {
    return data.voting_ends_at > data.ends_at;
  }
  return true;
}, {
  message: "Voting end date must be after battle end date",
  path: ["voting_ends_at"],
});

type BattleFormData = z.infer<typeof battleSchema>;

const CreateBattle = () => {
  const { user, loading } = useAuth();
  const { needsSetup, profileType, isLoading: validationLoading } = useProfileValidator();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { 
    canCreateBattle, 
    battlesRemaining, 
    isUnlimited, 
    tierName, 
    checkLimit,
    hasActiveSubscription
  } = useSubscriptionLimits();

  const form = useForm<BattleFormData>({
    resolver: zodResolver(battleSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      max_participants: undefined,
      rules: '',
      cover_image_url: '',
    },
  });

  useEffect(() => {
    if (!loading && !validationLoading) {
      if (!user) {
        navigate('/');
      }
    }
  }, [user, loading, validationLoading, navigate]);

  const onSubmit = async (data: BattleFormData) => {
    if (!user) return;

    // Must have active subscription for unofficial battles
    if (!hasActiveSubscription) {
      setShowUpgradePrompt(true);
      return;
    }

    // Check subscription limits before creating battle
    if (!canCreateBattle) {
      setShowUpgradePrompt(true);
      return;
    }

    try {
      setSubmitting(true);

      const battleData = {
        title: data.title,
        description: data.description || null,
        category: data.category || null,
        prize_amount: 0,
        currency: 'BB',
        rules: data.rules || null,
        organizer_id: user.id,
        status: 'upcoming',
        cover_image_url: data.cover_image_url || null,
        max_participants: data.max_participants || null,
        starts_at: data.starts_at?.toISOString() || null,
        ends_at: data.ends_at?.toISOString() || null,
        submission_deadline: data.submission_deadline?.toISOString() || null,
        voting_ends_at: data.voting_ends_at?.toISOString() || null,
        battle_type: 'unofficial' as const,
      };

      const { data: battle, error } = await supabase
        .from('battles')
        .insert(battleData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Unofficial battle created!');
      navigate(`/battles/${battle.id}`);
    } catch (error) {
      console.error('Error creating battle:', error);
      toast.error('Failed to create battle. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Show profile setup if barber profile doesn't exist
  if (!loading && !validationLoading && needsSetup && profileType === 'barber') {
    return <ProfileSetupPrompt type="barber" />;
  }

  if (loading || validationLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-24 flex items-center justify-center">
          <div className="animate-pulse text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Gate behind premium subscription
  if (!hasActiveSubscription) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 pb-20 px-4">
          <div className="container mx-auto max-w-2xl">
            <BackButton to="/battles" />
            <Card className="border border-border/50 shadow-lg backdrop-blur-sm bg-card/50 text-center" style={{ borderRadius: '1.5rem' }}>
              <CardContent className="py-12 space-y-6">
                <ShieldOff className="w-16 h-16 mx-auto text-muted-foreground" />
                <h2 className="text-2xl font-bold text-foreground">Premium Feature</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Creating unofficial battles requires an active subscription (Bronze, Silver, or Gold).
                  Unofficial battles are for fun and practice — they do not affect official rankings.
                </p>
                <Button onClick={() => setShowUpgradePrompt(true)} size="lg">
                  View Subscription Plans
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
        <UpgradePrompt 
          isOpen={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
          reason="battle_limit"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <BackButton to="/battles" />
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="h-8 w-8 text-primary" />
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                Create Unofficial Battle
              </h1>
            </div>
            <Badge variant="outline" className="text-sm px-4 py-1 border-yellow-500/50 text-yellow-500 mb-4">
              UNOFFICIAL — Does Not Affect Rankings
            </Badge>
            <p className="text-muted-foreground">
              Host a fun or practice battle. Results will not count toward official leaderboards or prizes.
            </p>
          </div>

          <Card className="border border-border/50 shadow-lg backdrop-blur-sm bg-card/50" style={{ borderRadius: '1.5rem' }}>
            <CardHeader>
              <CardTitle>Battle Details</CardTitle>
              <CardDescription>
                Set up your unofficial barber battle
              </CardDescription>
              
              {!canCreateBattle && !isUnlimited && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You've reached your monthly limit. Upgrade your {tierName} subscription to create more battles.
                  </AlertDescription>
                </Alert>
              )}
              
              {canCreateBattle && !isUnlimited && (
                <Alert className="mt-4 border-primary/50 bg-primary/5">
                  <Trophy className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-foreground">
                    {battlesRemaining} battle{battlesRemaining !== 1 ? 's' : ''} remaining this month ({tierName} tier)
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Battle Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Best Fade Competition" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what this battle is about..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TOURNAMENT_CATEGORIES.map((category) => (
                                <SelectItem key={category.id} value={category.shortName}>
                                  {category.icon} {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_participants"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Participants</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="2"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormDescription>Leave empty for unlimited</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="submission_deadline"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Submission Deadline</FormLabel>
                        <FormDescription>
                          Barbers must submit videos by this time
                        </FormDescription>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value as Date, "PPP p")
                                ) : (
                                  <span>Pick date & time (optional)</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value as Date | undefined}
                              onSelect={field.onChange}
                              disabled={(date: Date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="starts_at"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ends_at"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="voting_ends_at"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Voting Ends</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="cover_image_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cover Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" {...field} />
                        </FormControl>
                        <FormDescription>Optional: Add a cover image for your battle</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rules"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rules & Guidelines</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Specific rules for this battle, submission requirements..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/battles')}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || !canCreateBattle}
                      className="flex-1"
                    >
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {canCreateBattle ? 'Create Unofficial Battle' : 'Upgrade to Create More'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />

      <UpgradePrompt 
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        reason="battle_limit"
      />
    </div>
  );
};

export default CreateBattle;
