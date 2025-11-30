import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBarberBucks } from "@/hooks/useBarberBucks";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coins, AlertCircle, User, Globe } from "lucide-react";
import { CountrySelector } from "./CountrySelector";

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFundsModal = ({ isOpen, onClose }: AddFundsModalProps) => {
  const { purchaseBucks } = useBarberBucks();
  const { user } = useAuth();
  const { isFan } = useUserRole();
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [profileData, setProfileData] = useState({
    display_name: '',
    country_code: ''
  });
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // Check if fan profile is complete
  useEffect(() => {
    if (isOpen && user && isFan) {
      checkProfile();
    } else {
      setCheckingProfile(false);
    }
  }, [isOpen, user, isFan]);

  const checkProfile = async () => {
    if (!user) return;
    setCheckingProfile(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, country_code')
        .eq('user_id', user.id)
        .single();

      // For fans, prompt for more info if they haven't provided display_name
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

  if (!isOpen) return null;

  const handleAddFunds = (amount: number) => {
    purchaseBucks.mutate(amount);
  };

  const quickAmounts = [
    { bb: 100, usd: 20 },
    { bb: 500, usd: 100 },
    { bb: 1000, usd: 200 },
    { bb: 2500, usd: 500 }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-yellow-500" />
            <h3 className="text-xl font-bold text-foreground">Add Barber Bucks</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </Button>
        </div>

        {/* Profile Prompt for Fans */}
        {showProfilePrompt && !checkingProfile && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-500 text-sm">Complete Your Profile</p>
                <p className="text-xs text-muted-foreground">Add a display name before purchasing Barber Bucks</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="display_name" className="text-sm flex items-center gap-2">
                  <User className="h-3 w-3" />
                  Display Name *
                </Label>
                <Input
                  id="display_name"
                  value={profileData.display_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Your name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  Country (optional)
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
                className="w-full"
              >
                {loading ? 'Saving...' : 'Save & Continue'}
              </Button>
            </div>
          </div>
        )}

        {/* Purchase Options - show if profile is complete or not a fan */}
        {(!showProfilePrompt || !isFan) && !checkingProfile && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Purchase Barber Bucks to vote, donate to creators, and enter tournaments.
            </p>

            {/* Conversion Rate */}
            <div className="bg-muted/50 rounded-lg p-3 text-center mb-4">
              <p className="text-xs text-muted-foreground">Conversion Rate</p>
              <p className="font-bold text-foreground">$1 USD = 5 BB</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {quickAmounts.map(({ bb, usd }) => (
                <Button
                  key={bb}
                  variant="outline"
                  onClick={() => handleAddFunds(bb)}
                  disabled={purchaseBucks.isPending}
                  className="h-auto flex flex-col items-center py-4 hover:border-yellow-500/50 hover:bg-yellow-500/5"
                >
                  <div className="flex items-center gap-1">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="text-xl font-bold text-yellow-500">{bb.toLocaleString()}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Barber Bucks</span>
                  <span className="text-sm font-semibold mt-1 text-foreground">
                    ${usd}
                  </span>
                </Button>
              ))}
            </div>

            <Button variant="outline" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </div>
        )}

        {checkingProfile && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
};
