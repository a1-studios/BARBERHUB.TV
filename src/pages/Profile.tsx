import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useProfileSetup } from '@/hooks/useProfileSetup';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Settings, ExternalLink, Edit3, LogOut, Trash2, ChevronRight, Receipt, CalendarDays, Award, Instagram, Twitter, Youtube, Facebook, Plus, Gift } from 'lucide-react';
import NotificationToggle from '@/components/settings/NotificationToggle';
import InstallAppButton from '@/components/settings/InstallAppButton';
import { MyPrizesSection } from '@/components/profile/MyPrizesSection';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { AddFundsModal } from '@/components/AddFundsModal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import { ClientProfileForm } from '@/components/profiles/ClientProfileForm';
import { SponsorBoardPurchaseModal } from '@/components/fan/SponsorBoardPurchaseModal';
import { TransactionHistory } from '@/components/analytics/TransactionHistory';
import { MyAppointments } from '@/components/fan/MyAppointments';
import { BarberAppointmentManager } from '@/components/booking/BarberAppointmentManager';
import { AvatarCrest } from '@/components/AvatarCrest';
import { RotatingBBCoin } from '@/components/economy/RotatingBBCoin';
import { SubCategoryBadge } from '@/components/SubCategoryBadge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Link } from 'react-router-dom';
import { SocialOrbit } from '@/components/profiles/SocialOrbit';
import { toast } from 'sonner';
import { BottomNavBar } from '@/components/BottomNavBar';
import { cn } from '@/lib/utils';
import { parseSpecialties, getSpecialtyDisplay } from '@/config/specialtyTags';
import { PostAppointmentReviewModal } from '@/components/reviews/PostAppointmentReviewModal';
import { requireProfileComplete } from '@/components/auth/ProfileCompletionGate';
import { AlertCircle } from 'lucide-react';
import { DisplayNameEditor } from '@/components/profile/DisplayNameEditor';
import { LocationQuickToggle } from '@/components/profiles/LocationQuickToggle';

const ProfileCompletionBanner = ({ profile }: { profile: any }) => {
  if (!profile) return null;
  if (profile.user_type && profile.country_code) return null;
  return (
    <button
      type="button"
      onClick={() => requireProfileComplete()}
      className="w-full mt-3 mb-2 px-4 py-3 rounded-2xl flex items-center gap-3 text-left transition-transform active:scale-[0.98] animate-pulse-slow"
      style={{
        background: 'linear-gradient(135deg, hsla(20,100%,56%,0.18) 0%, hsla(28,100%,50%,0.14) 100%)',
        border: '1.5px solid hsla(20,100%,56%,0.55)',
        boxShadow: '0 6px 22px hsla(20,100%,56%,0.3)',
      }}
    >
      <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black uppercase tracking-tight text-white">
          Complete your profile 🎟️
        </div>
        <div className="text-[11px] text-white/70 leading-snug">
          Required to claim your Barber Bucks and ticket reward.
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300">
        Finish ›
      </span>
    </button>
  );
};

const Profile = () => {
  const { user, signOut } = useAuth();
  const { isBarber: isUserBarber } = useUserRole();
  const navigate = useNavigate();
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);
  const [barberApptOpen, setBarberApptOpen] = useState(false);
  const [prizesOpen, setPrizesOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAppointmentId, setReviewAppointmentId] = useState('');
  const [revieweeId, setRevieweeId] = useState('');
  const [isBarberReviewing, setIsBarberReviewing] = useState(false);

  const { barberBucks, showAddFundsModal, setShowAddFundsModal } = useBarberBucks();

  const {
    userProfile,
    barberProfile,
    clientProfile,
    loading: profileLoading,
    needsProfileSetup,
    refreshProfiles,
    isBarber,
    isClient
  } = useProfileSetup();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Deep-link: auto-open appointment collapsible and review modal from query params
  useEffect(() => {
    const appointmentId = searchParams.get('appointment_id');
    const action = searchParams.get('action');
    if (!appointmentId || !user?.id) return;

    // Auto-open the correct collapsible
    if (isBarber) {
      setBarberApptOpen(true);
    } else {
      setApptOpen(true);
    }

    // If action=review, fetch appointment and open review modal
    if (action === 'review') {
      (async () => {
        const { data: appt } = await supabase
          .from('appointments')
          .select('barber_user_id, client_id')
          .eq('id', appointmentId)
          .single();
        if (appt) {
          const reviewing = appt.barber_user_id === user.id;
          setIsBarberReviewing(reviewing);
          setRevieweeId(reviewing ? appt.client_id : appt.barber_user_id);
          setReviewAppointmentId(appointmentId);
          setReviewModalOpen(true);
        }
      })();
    }

    // Clear params so refresh doesn't re-trigger
    setSearchParams({}, { replace: true });
  }, [searchParams, user?.id, isBarber]);

  const { data: barberStats } = useQuery({
    queryKey: ['barber-own-stats', barberProfile?.id],
    queryFn: async () => {
      if (!barberProfile?.id) return null;
      const { data, error } = await supabase.from('barber_stats').select('*').eq('barber_id', barberProfile.id).maybeSingle();
      if (error) throw error;
      return data || { follower_count: 0, like_count: 0, total_donations_cents: 0 };
    },
    enabled: !!barberProfile?.id && isBarber
  });

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      await signOut();
      navigate('/');
      toast.success('Your account has been permanently deleted.');
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteStep(1);
    }
  };

  const getCountryFlag = (code: string) => {
    const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Profile setup flow
  if (needsProfileSetup && !showProfileSetup) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 pb-12 px-4">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
                <CardDescription>
                  {isBarber ? 'Set up your professional barber profile' : 'Complete your profile to get started'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowProfileSetup(true)} className="w-full" size="lg">
                  {isBarber ? 'Create Barber Profile' : 'Complete Profile'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 pb-12 px-4">
          <div className="max-w-lg mx-auto">
            <Button variant="ghost" onClick={() => setShowProfileSetup(false)} className="mb-4">← Back</Button>
            {isBarber ? (
              // For barbers, redirect to their public profile with edit mode
              (() => { navigate(`/barber/${user?.id}?edit=true`); return null; })()
            ) : (
              <ClientProfileForm onProfileCreated={() => { setShowProfileSetup(false); refreshProfiles(); }} existingProfile={clientProfile} />
            )}
          </div>
        </main>
      </div>
    );
  }

  const rawDisplay = isBarber
    ? (profile?.display_name || barberProfile?.name || '')
    : (profile?.display_name || '');
  // Hide emails — never display the user's email as their public name
  const looksLikeEmail = rawDisplay.includes('@');
  const displayName = (!rawDisplay || looksLikeEmail)
    ? (isBarber ? 'Set your name' : 'Set your name')
    : rawDisplay;
  const specialty = barberProfile?.specialty;
  const countryCode = isBarber ? barberProfile?.country_code : (profile?.country_code || (clientProfile as any)?.country_code);
  const subscriptionTier = barberProfile?.active_subscription_tier;
  const m4mCertified = (barberProfile as any)?.m4m_certified || false;
  const m4mPaid = (barberProfile as any)?.m4m_paid || false;
  const m4mLivesTouched = (barberProfile as any)?.m4m_lives_touched || 0;

  const socialLinksObj = isBarber ? {
    instagram: (barberProfile as any)?.instagram_handle,
    twitter: (barberProfile as any)?.twitter_handle,
    youtube: (barberProfile as any)?.youtube_handle,
    facebook: (barberProfile as any)?.facebook_handle,
  } : {
    instagram: (clientProfile as any)?.instagram_handle,
    twitter: (clientProfile as any)?.twitter_handle,
    youtube: (clientProfile as any)?.youtube_handle,
    facebook: (clientProfile as any)?.facebook_handle,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ===== FLAG BANNER BACKGROUND ===== */}
      {countryCode && (
        <>
          <div className="fixed inset-0 z-0 opacity-[0.35]">
            <img
              src={`https://flagcdn.com/w1280/${countryCode.toLowerCase()}.png`}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="fixed inset-0 z-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80" />
        </>
      )}

      <Header />

      <main className="relative z-10 flex-1 pt-16 pb-20 px-4">
        <div className="max-w-md mx-auto min-h-[calc(100dvh-4rem-5rem)] flex flex-col">
          <ProfileCompletionBanner profile={profile} />

          {/* ===== HERO: 3-col grid — specialties | avatar | stats ===== */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-2 pb-1">
            {/* LEFT — Specialties stacked */}
            <div className="flex flex-col items-start gap-1.5 min-w-0">
              {specialty ? parseSpecialties(specialty).map(id => {
                const tag = getSpecialtyDisplay(id);
                return tag ? (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20 max-w-full truncate"
                  >
                    {tag.emoji} {tag.label}
                  </Badge>
                ) : null;
              }) : null}
            </div>

            {/* CENTER — Avatar + orbit */}
            <SocialOrbit radius={56} iconSize={22} links={socialLinksObj}>
              {isBarber ? (
                <AvatarCrest
                  tier={subscriptionTier}
                  size="md"
                  interactive
                  showM4M
                  m4mCertified={m4mCertified}
                  m4mPaid={m4mPaid}
                  m4mLivesTouched={m4mLivesTouched}
                  barberName={displayName}
                  barberUserId={user?.id || ''}
                  isOwnProfile={true}
                >
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </AvatarCrest>
              ) : (
                <Avatar className="h-20 w-20 border-2 border-background shadow-lg">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </SocialOrbit>

            {/* RIGHT — Stats stacked */}
            <div className="flex flex-col items-end gap-1.5 text-right">
              {isBarber && barberStats ? (
                <>
                  <div>
                    <div className="text-base font-bold leading-none text-foreground">{barberStats.follower_count || 0}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Foll</div>
                  </div>
                  <div>
                    <div className="text-base font-bold leading-none text-foreground">{barberStats.like_count || 0}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Likes</div>
                  </div>
                  <div>
                    <div className="text-base font-bold leading-none text-primary">${((barberStats.total_donations_cents || 0) / 100).toFixed(0)}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Don</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-base font-bold leading-none text-foreground">{clientProfile?.total_votes_cast || 0}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Votes</div>
                  </div>
                  <div>
                    <div className="text-base font-bold leading-none text-primary">{clientProfile?.voting_power || 1}x</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Power</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Name + meta — centered under hero */}
          <div className="flex flex-col items-center text-center -mt-1">
            <h1 className="text-lg font-bold text-foreground flex items-center justify-center gap-1">
              {displayName}
              <DisplayNameEditor
                currentName={looksLikeEmail ? '' : rawDisplay}
                changedAt={(profile as any)?.display_name_changed_at}
              />
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {profile?.username && <span>@{profile.username}</span>}
              {countryCode && <span>{getCountryFlag(countryCode)}</span>}
              {!isBarber && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Fan</Badge>
              )}
              {!isBarber && (profile as any)?.sub_category && (
                <SubCategoryBadge subCategory={(profile as any).sub_category} size="sm" />
              )}
            </div>
            {profile?.bio && <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-[260px] mt-0.5">{profile.bio}</p>}
          </div>



          {/* ===== QUICK LOCATION TOGGLE (Barbers only) ===== */}
          {isBarber && <LocationQuickToggle />}

          {/* ===== iOS GROUPED LIST ===== */}
          <div className="flex-1 space-y-1">
            {/* TOOLS section */}
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-3 pt-3 pb-1">Tools</p>
            <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/30 overflow-hidden divide-y divide-border/20">
              {/* Transactions */}
              <Collapsible open={txOpen} onOpenChange={setTxOpen}>
                <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Recent Transactions</span>
                  </div>
                  <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', txOpen && 'rotate-90')} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-2 pb-3">
                    <TransactionHistory compact />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Appointments (fans) */}
              {!isBarber && (
                <Collapsible open={apptOpen} onOpenChange={setApptOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">My Appointments</span>
                    </div>
                    <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', apptOpen && 'rotate-90')} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-3">
                      <MyAppointments compact />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Manage Appointments & Bounties (barbers) */}
              {isBarber && (
                <Collapsible open={barberApptOpen} onOpenChange={setBarberApptOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Manage Appointments</span>
                    </div>
                    <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', barberApptOpen && 'rotate-90')} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-3">
                      <BarberAppointmentManager />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* My Rewards */}
              <Collapsible open={prizesOpen} onOpenChange={setPrizesOpen}>
                <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Gift className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">My Rewards</span>
                  </div>
                  <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', prizesOpen && 'rotate-90')} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <MyPrizesSection />
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* NOTIFICATIONS */}
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-3 pt-4 pb-1">Notifications</p>
            <NotificationToggle />
            <InstallAppButton />

            {/* ACCOUNT section */}
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-3 pt-4 pb-1">Account</p>
            <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border/30 overflow-hidden divide-y divide-border/20">
              {/* Edit Profile / Settings — unified for barbers */}
              {isBarber ? (
                <button
                  onClick={() => navigate(`/barber/${user?.id}?edit=true`)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Edit Profile & Settings</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ) : (
                <button
                  onClick={() => setShowEditDrawer(true)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Edit3 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Edit Profile</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}

              {/* Public Profile (barbers) */}
              {isBarber && (
                <Link
                  to={`/barber/${user?.id}`}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Public Profile</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}

              {/* Become Sponsor (fans) */}
              {!isBarber && (profile as any)?.sub_category !== 'official_sponsor' && (
                <button
                  onClick={() => setShowSponsorModal(true)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Award className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">Become Sponsor</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}

              {/* Sign Out */}
              <button
                onClick={async () => { await signOut(); navigate('/'); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Sign Out</span>
              </button>

              {/* Delete Account */}
              <button
                onClick={() => { setDeleteStep(1); setShowDeleteConfirm(true); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4 text-destructive/70" />
                <span className="text-sm text-destructive/70">Delete Account</span>
              </button>
            </div>

            {/* BB Pill — centered at bottom */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border/40">
                <RotatingBBCoin
                  avatarUrl={profile?.avatar_url}
                  displayName={displayName}
                  size="xs"
                  animate={true}
                />
                <span className="text-sm font-bold text-foreground">{barberBucks.toLocaleString()}</span>
                <span className="text-[10px] text-cyan-400 font-medium">BB</span>
                <button
                  onClick={() => setShowAddFundsModal(true)}
                  className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
                >
                  <Plus className="h-3 w-3 text-primary" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ===== MODALS & DRAWERS ===== */}
      <AddFundsModal isOpen={showAddFundsModal} onClose={() => setShowAddFundsModal(false)} />

      {user && (
        <SponsorBoardPurchaseModal
          isOpen={showSponsorModal}
          onClose={() => setShowSponsorModal(false)}
          barberBucks={barberBucks}
          userId={user.id}
          displayName={profile?.display_name || undefined}
        />
      )}

      {/* Edit Profile Drawer — fans only */}
      <Drawer open={showEditDrawer} onOpenChange={setShowEditDrawer}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-center pb-2">
            <DrawerTitle>Edit Profile</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            <ClientProfileForm
              onProfileCreated={() => { setShowEditDrawer(false); refreshProfiles(); }}
              existingProfile={clientProfile}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Step 1 */}
      <AlertDialog open={showDeleteConfirm && deleteStep === 1} onOpenChange={(open) => { if (!open) { setShowDeleteConfirm(false); setDeleteStep(1); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes all data including battles, votes, credits, and profile. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleteStep(2)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Step 2 */}
      <AlertDialog open={showDeleteConfirm && deleteStep === 2} onOpenChange={(open) => { if (!open) { setShowDeleteConfirm(false); setDeleteStep(1); } }}>
        <AlertDialogContent className="border-destructive/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive text-xl">⚠️ FINAL WARNING</AlertDialogTitle>
            <AlertDialogDescription>
              This is your last chance. Once deleted, your account and all data will be gone forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? 'Deleting...' : 'Permanently Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PostAppointmentReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        appointmentId={reviewAppointmentId}
        revieweeId={revieweeId}
        isBarberReviewing={isBarberReviewing}
      />

      <BottomNavBar />
    </div>
  );
};

export default Profile;
