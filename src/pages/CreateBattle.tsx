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
import { CalendarIcon, Loader2, Trophy, Youtube, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { extractYouTubeVideoId, getYouTubeInputHelperText } from '@/utils/youtubeHelpers';
import { TOURNAMENT_CATEGORIES } from '@/config/categories';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { Alert, AlertDescription } from '@/components/ui/alert';

const battleSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Please select a category'),
  prize_amount: z.number().min(0, 'Prize amount must be 0 or greater'),
  currency: z.string().default('USD'),
  max_participants: z.number().min(2, 'Must allow at least 2 participants').optional(),
  starts_at: z.date().optional(),
  ends_at: z.date().optional(),
  submission_deadline: z.date().optional(),
  voting_ends_at: z.date().optional(),
  rules: z.string().optional(),
  cover_image_url: z.string().url().optional().or(z.literal('')),
  barber1_youtube_video_id: z.string().optional(),
  barber2_youtube_video_id: z.string().optional(),
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

// Categories are now imported from centralized config
// Use TOURNAMENT_CATEGORIES for standardized 5-category tournament system

const CreateBattle = () => {
  const { user, loading } = useAuth();
  const { needsSetup, profileType, isLoading: validationLoading } = useProfileValidator();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { 
    canCreateBattle, 
    battlesRemaining, 
    isUnlimited, 
    tierName, 
    checkLimit 
  } = useSubscriptionLimits();

  // Check user profile and role
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const form = useForm<BattleFormData>({
    resolver: zodResolver(battleSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      prize_amount: 0,
      currency: 'USD',
      max_participants: undefined,
      rules: '',
      cover_image_url: '',
      barber1_youtube_video_id: '',
      barber2_youtube_video_id: '',
    },
  });

  useEffect(() => {
    if (!loading && !profileLoading && !validationLoading) {
      if (!user) {
        navigate('/');
      } else if (profile && profile.user_type !== 'barber') {
        navigate('/battles');
        toast.error('Only barbers can create battles');
      }
    }
  }, [user, profile, loading, profileLoading, validationLoading, navigate]);

  const onSubmit = async (data: BattleFormData) => {
    if (!user) return;

    // Check subscription limits before creating battle
    if (!checkLimit()) {
      return;
    }

    try {
      setSubmitting(true);

      // Extract video IDs from input (handles URLs or raw IDs)
      const barber1VideoId = data.barber1_youtube_video_id 
        ? extractYouTubeVideoId(data.barber1_youtube_video_id) 
        : null;
      const barber2VideoId = data.barber2_youtube_video_id 
        ? extractYouTubeVideoId(data.barber2_youtube_video_id) 
        : null;

      const battleData = {
        title: data.title,
        description: data.description || null,
        category: data.category || null,
        prize_amount: data.prize_amount || 0,
        currency: data.currency || 'USD',
        rules: data.rules || null,
        organizer_id: user.id,
        status: 'upcoming',
        cover_image_url: data.cover_image_url || null,
        max_participants: data.max_participants || null,
        starts_at: data.starts_at?.toISOString() || null,
        ends_at: data.ends_at?.toISOString() || null,
        submission_deadline: data.submission_deadline?.toISOString() || null,
        voting_ends_at: data.voting_ends_at?.toISOString() || null,
        barber1_youtube_video_id: barber1VideoId,
        barber2_youtube_video_id: barber2VideoId,
      };

      const { data: battle, error } = await supabase
        .from('battles')
        .insert(battleData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Battle created successfully!');
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

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <BackButton to="/battles" />
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="h-8 w-8 text-primary" />
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Create New Battle
              </h1>
            </div>
            <p className="text-muted-foreground">
              Set up a competition and watch barbers showcase their incredible skills
            </p>
          </div>

          <Card className="border border-border/50 shadow-lg backdrop-blur-sm bg-card/50" style={{ borderRadius: '1.5rem' }}>
            <CardHeader>
              <CardTitle>Battle Details</CardTitle>
              <CardDescription>
                Fill in the information for your barber battle
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
                          <Input placeholder="Best Fade Competition 2024" {...field} />
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
                            placeholder="Describe what this battle is about, what judges will look for..."
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
                              placeholder="Unlimited"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="prize_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prize Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                            />
                          </FormControl>
                          <FormDescription>Enter 0 for no prize</FormDescription>
                          <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="submission_deadline"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Submission Deadline</FormLabel>
                <FormDescription>
                  Barbers must submit videos by this time or forfeit
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

          <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
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
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
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
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
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
                          <Input
                            placeholder="https://example.com/image.jpg"
                            {...field}
                          />
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
                            placeholder="Specific rules for this battle, submission requirements, criteria for judging..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* YouTube Live Stream Setup Section */}
                  <div className="space-y-4 pt-6 border-t border-border">
                    <div className="flex items-center gap-2 mb-4">
                      <Youtube className="h-5 w-5 text-red-500" />
                      <h3 className="text-lg font-semibold">Live Battle Setup (Optional)</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      For live viewer tracking during battles, add YouTube Live Stream Video IDs for both competitors.
                      Start your YouTube live streams first, then paste the video IDs or URLs here.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="barber1_youtube_video_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Barber 1 YouTube Video ID</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="dQw4w9WgXcQ or full URL"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              {getYouTubeInputHelperText()}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="barber2_youtube_video_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Barber 2 YouTube Video ID</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="dQw4w9WgXcQ or full URL"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              {getYouTubeInputHelperText()}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

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
                      {canCreateBattle ? 'Create Battle' : 'Upgrade to Create More'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CreateBattle;
