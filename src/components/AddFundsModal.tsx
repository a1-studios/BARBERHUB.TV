import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBarberBucks } from "@/hooks/useBarberBucks";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, User, Globe, X, ExternalLink, HandCoins } from "lucide-react";
import { CountrySelector } from "./CountrySelector";
import { RotatingBBCoin } from "./economy/RotatingBBCoin";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { UniversalBarterGateway } from "@/components/barter/UniversalBarterGateway";

interface BarterContext {
  perkCategory: 'subscription' | 'battle_entry' | 'visibility_boost';
  perkDetails: Record<string, any>;
  requiredBBValue: number;
}

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  barterContext?: BarterContext;
}

export const AddFundsModal = ({ isOpen, onClose, barterContext }: AddFundsModalProps) => {
  const { purchaseBucks } = useBarberBucks();
  const { user } = useAuth();
  const { isFan, isBarber, isLoading: rolesLoading } = useUserRole();
  const [mounted, setMounted] = useState(false);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [pendingCheckoutUrl, setPendingCheckoutUrl] = useState<string | null>(null);
  const [showBarter, setShowBarter] = useState(false);
  const [profileData, setProfileData] = useState({
    display_name: '',
    country_code: ''
  });
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);

  // Fetch user profile for avatar
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-modal', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, display_name')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id && isOpen
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowBarter(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !user || rolesLoading) return;
    
    if (isFan) {
      checkProfile();
    } else {
      setShowProfilePrompt(false);
      setCheckingProfile(false);
    }
  }, [isOpen, user, isFan, rolesLoading]);

  const checkProfile = async () => {
    if (!user) return;
    setCheckingProfile(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, country_code')
        .eq('user_id', user.id)
        .single();

      if (profile && (!profile.display_name || profile.display_name.trim() === '')) {
        setShowProfilePrompt(true);
        setProfileData({
          display_name: profile.display_name || '',
          country_code: profile.country_code || ''
        });
      } else {
        setShowProfilePrompt(false);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setCheckingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    if (!profileData.display_name.trim()) {
      toast.error('Please enter a display name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profileData.display_name.trim(),
          country_code: profileData.country_code || null
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success('Profile updated!');
      setShowProfilePrompt(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const isInIframe = () => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  };

  const handleAddFunds = (usdAmount: number) => {
    setPendingCheckoutUrl(null);
    purchaseBucks.mutate(usdAmount, {
      onSuccess: (data) => {
        try {
          localStorage.setItem('pending_bb_purchase', JSON.stringify({
            session_id: data.session_id,
            bb_amount: data.bb_amount,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('Failed to store pending purchase:', e);
        }

        if (isInIframe()) {
          const win = window.open(data.url, '_blank');
          if (win) {
            onClose();
            toast.success('Stripe checkout opened in a new tab. Complete your purchase there!');
          } else {
            setPendingCheckoutUrl(data.url);
            toast.error('Popup blocked — use the link below to open checkout.');
          }
        } else {
          onClose();
          window.location.href = data.url;
        }
      }
    });
  };

  const quickAmounts = [
    { bb: 25, usd: 5, bonus: 0 },
    { bb: 50, usd: 10, bonus: 0 },
    { bb: 130, usd: 25, bonus: 5 },
    { bb: 265, usd: 50, bonus: 15 },
    { bb: 550, usd: 100, bonus: 50 }
  ];

  if (!isOpen || !mounted) return null;

  // If barter mode is active, show the UniversalBarterGateway
  if (showBarter && barterContext) {
    return (
      <UniversalBarterGateway
        isOpen={true}
        perkCategory={barterContext.perkCategory}
        perkDetails={barterContext.perkDetails}
        requiredBBValue={barterContext.requiredBBValue}
        onSuccess={() => {
          setShowBarter(false);
          onClose();
        }}
        onCancel={() => setShowBarter(false)}
      />
    );
  }

  return createPortal(
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 pt-20"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.88)', pointerEvents: 'auto' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-[280px] max-w-[90vw]">
        <div className="absolute -inset-3 bg-gradient-to-r from-primary/40 via-cyan/30 to-primary/40 rounded-2xl blur-xl opacity-80" />
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-cyan to-primary rounded-xl blur-sm opacity-70 animate-pulse" />
        
        <div className="relative bg-card rounded-xl border border-cyan/50 overflow-hidden shadow-[0_0_40px_rgba(0,217,255,0.15)]">
          {/* Header */}
          <div className="relative px-4 py-3 bg-gradient-to-r from-primary/20 via-cyan/10 to-primary/20 border-b border-primary/30">
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan to-transparent animate-pulse" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotatingBBCoin 
                  avatarUrl={userProfile?.avatar_url} 
                  displayName={userProfile?.display_name || profileData.display_name} 
                  size="sm" 
                  animate={true} 
                />
                <h3 className="text-base font-bold">
                  <span className="text-cyan">BB</span>
                  <span className="text-foreground ml-1">Store</span>
                </h3>
              </div>
              <button 
                onClick={onClose} 
                className="p-1 rounded-md hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="p-3">
            {/* Pay with Services button for barbers */}
            {isBarber && barterContext && (
              <button
                onClick={() => setShowBarter(true)}
                className={cn(
                  "w-full mb-3 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg",
                  "bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20",
                  "border border-amber-500/40 hover:border-amber-400/60",
                  "transition-all duration-200 hover:shadow-[0_0_12px_rgba(245,158,11,0.25)]",
                  "text-sm font-semibold text-amber-400"
                )}
              >
                <HandCoins className="h-4 w-4" />
                Pay with Services Instead
              </button>
            )}

            {/* Profile Prompt for Fans */}
            {showProfilePrompt && !checkingProfile && (
              <div className="mb-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-500 text-xs">Complete Profile</p>
                    <p className="text-[10px] text-muted-foreground">Add display name to continue</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label htmlFor="display_name" className="text-xs flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Display Name *
                    </Label>
                    <Input
                      id="display_name"
                      value={profileData.display_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, display_name: e.target.value }))}
                      placeholder="Your name"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Country
                    </Label>
                    <div className="mt-1">
                      <CountrySelector
                        value={profileData.country_code}
                        onChange={(code) => setProfileData(prev => ({ ...prev, country_code: code || '' }))}
                        placeholder="Select country"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={loading}
                    size="sm"
                    className="w-full h-8 text-xs"
                  >
                    {loading ? 'Saving...' : 'Save & Continue'}
                  </Button>
                </div>
              </div>
            )}

            {rolesLoading && (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}

            {!rolesLoading && (!showProfilePrompt || !isFan) && !checkingProfile && (
              <div className="space-y-3">
                {/* Conversion Rate */}
                <div className="flex items-center justify-center gap-2 py-1.5 px-3 bg-muted/30 rounded-lg border border-border/30">
                  <span className="text-[10px] text-muted-foreground">Rate:</span>
                  <span className="text-xs font-bold">
                    <span className="text-foreground">$1</span>
                    <span className="text-muted-foreground mx-1">=</span>
                    <span className="text-cyan">5 BB</span>
                  </span>
                </div>
                
                {/* Package Grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {quickAmounts.slice(0, 3).map(({ bb, usd, bonus }) => (
                    <button
                      key={usd}
                      onClick={() => handleAddFunds(usd)}
                      disabled={purchaseBucks.isPending}
                      className={cn(
                        "relative group flex flex-col items-center p-2 rounded-lg",
                        "bg-gradient-to-b from-muted/50 to-muted/20",
                        "border border-border/50 hover:border-cyan/50",
                        "transition-all duration-200",
                        "hover:shadow-[0_0_12px_rgba(0,217,255,0.2)]"
                      )}
                    >
                      <span className="text-lg font-bold text-primary">{bb}</span>
                      <span className="text-[9px] text-cyan font-medium">BB</span>
                      {bonus > 0 && (
                        <span className="text-[8px] text-green-400 font-medium">+{bonus}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground mt-0.5">${usd}</span>
                    </button>
                  ))}
                </div>

                {/* Larger packages */}
                <div className="grid grid-cols-2 gap-1.5">
                  {quickAmounts.slice(3).map(({ bb, usd, bonus }) => (
                    <button
                      key={usd}
                      onClick={() => handleAddFunds(usd)}
                      disabled={purchaseBucks.isPending}
                      className={cn(
                        "relative group flex items-center justify-between p-2 rounded-lg",
                        "bg-gradient-to-r from-primary/10 via-cyan/5 to-primary/10",
                        "border border-primary/30 hover:border-cyan/50",
                        "transition-all duration-200",
                        "hover:shadow-[0_0_12px_rgba(0,217,255,0.3)]"
                      )}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-base font-bold text-primary">{bb}</span>
                          <span className="text-[9px] text-cyan font-medium">BB</span>
                        </div>
                        {bonus > 0 && (
                          <span className="text-[8px] text-green-400 font-medium">+{bonus} bonus</span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-foreground">${usd}</span>
                    </button>
                  ))}
                </div>

                {/* Fallback checkout link */}
                {pendingCheckoutUrl && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">Popup was blocked. Click below to open checkout:</p>
                    <a
                      href={pendingCheckoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Stripe Checkout
                    </a>
                  </div>
                )}

                <button 
                  onClick={onClose} 
                  className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {!rolesLoading && checkingProfile && (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};