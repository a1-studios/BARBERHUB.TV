import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SpecialtyPillSelector } from './SpecialtyPillSelector';
import { CountrySelector } from '@/components/CountrySelector';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AlertCircle, Scissors, Phone, Globe, Lock, MapPin, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fbqTrack } from '@/lib/metaPixel';
import { getCountryFromUrl } from '@/lib/urlParams';

interface BarberProfileFormProps {
  onProfileCreated?: () => void;
  existingProfile?: any;
}

export function BarberProfileForm({ onProfileCreated, existingProfile }: BarberProfileFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: existingProfile?.name || '',
    specialty: existingProfile?.specialty || '',
    bio: existingProfile?.bio || '',
    years_experience: existingProfile?.years_experience || '',
    location: existingProfile?.location || '',
    portfolio_url: existingProfile?.portfolio_url || '',
    phone_number: '',
    country_code: existingProfile?.country_code || '',
    shop_address: existingProfile?.shop_address || '',
    shop_city: existingProfile?.shop_city || '',
    shop_state: existingProfile?.shop_state || '',
    shop_postal_code: existingProfile?.shop_postal_code || '',
    address_visibility: existingProfile?.address_visibility || 'approximate',
    latitude: existingProfile?.latitude ?? null as number | null,
    longitude: existingProfile?.longitude ?? null as number | null,
  });
  const [geocoding, setGeocoding] = useState(false);

  // Load own phone from private contacts table
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_private_contacts')
      .select('phone_number')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.phone_number) {
          setFormData((p) => ({ ...p, phone_number: data.phone_number || '' }));
        }
      });
  }, [user]);


  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Professional name is required';
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required for battle coordination';
    } else if (formData.phone_number.length < 10) {
      newErrors.phone_number = 'Please enter a valid phone number';
    }

    if (!formData.country_code) {
      newErrors.country_code = 'Country/nationality is required for tournament matching';
    }
      const profileData = {
        user_id: user.id,
        name: formData.name.trim(),
        specialty: formData.specialty || null,
        bio: formData.bio || null,
        location: formData.location || null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        portfolio_url: formData.portfolio_url || null,
        country_code: formData.country_code,
        shop_address: formData.shop_address || null,
        shop_city: formData.shop_city || null,
        shop_state: formData.shop_state || null,
        shop_postal_code: formData.shop_postal_code || null,
        address_visibility: formData.address_visibility,
        latitude: formData.latitude,
        longitude: formData.longitude,
      };

      const { error } = await supabase
        .from('barber_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      // Save phone number to private contacts (owner-only RLS)
      await supabase
        .from('user_private_contacts')
        .upsert(
          { user_id: user.id, phone_number: formData.phone_number.trim(), updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );

      // Also update country_code in profiles table
      await supabase
        .from('profiles')
        .update({ country_code: formData.country_code })
        .eq('user_id', user.id);

        address_visibility: formData.address_visibility,
        latitude: formData.latitude,
        longitude: formData.longitude,
      };

      const { error } = await supabase
        .from('barber_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      // Also update country_code in profiles table
      await supabase
        .from('profiles')
        .update({ country_code: formData.country_code })
        .eq('user_id', user.id);
      
      toast.success(existingProfile ? 'Profile updated successfully!' : 'Barber profile created successfully!');
      onProfileCreated?.();
    } catch (error: any) {
      console.error('Error saving barber profile:', error);
      if (error.message?.includes('row-level security')) {
        toast.error('You must be a Barber to save barber profile. Please switch your role.');
      } else {
        toast.error(error.message || 'Failed to save profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGeocodeAddress = async () => {
    const parts = [formData.shop_address, formData.shop_city, formData.shop_state, formData.shop_postal_code, formData.country_code]
      .filter(Boolean)
      .join(', ');
    if (!parts.trim()) {
      toast.error('Enter at least a city or street before locating');
      return;
    }
    setGeocoding(true);
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        toast.error('Google Maps API key not configured');
        return;
      }
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(parts)}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.status === 'OK' && data.results?.length > 0) {
        const r = data.results[0];
        const { lat, lng } = r.geometry.location;
        setFormData((p) => ({
          ...p,
          latitude: lat,
          longitude: lng,
          location: p.location || r.formatted_address,
        }));
        toast.success('Address located — fans will now see your distance.');
      } else {
        toast.error('Could not locate that address');
      }
    } catch (err) {
      toast.error('Geocoding failed');
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Scissors className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>
              {existingProfile ? 'Update Barber Profile' : 'Create Your Barber Profile'}
            </CardTitle>
            <CardDescription>
              Complete your professional profile to compete in battles
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Required Fields Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-500">Required for Competition</p>
            <p className="text-muted-foreground">Phone number and nationality are required for tournament coordination and country vs country matchmaking.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Professional Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your professional name"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="phone_number" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number *
            </Label>
            <Input
              id="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder="+1 (555) 123-4567"
              className={errors.phone_number ? 'border-destructive' : ''}
            />
            {errors.phone_number && <p className="text-xs text-destructive mt-1">{errors.phone_number}</p>}
            <p className="text-xs text-muted-foreground mt-1">For battle coordination only - not shared publicly</p>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Nationality *
              {existingProfile?.country_code && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
            </Label>
            <CountrySelector
              value={formData.country_code}
              onChange={(code) => {
                if (!existingProfile?.country_code) {
                  setFormData({ ...formData, country_code: code || '' });
                }
              }}
              placeholder="Select your country"
              disabled={!!existingProfile?.country_code}
            />
            {errors.country_code && <p className="text-xs text-destructive mt-1">{errors.country_code}</p>}
            {existingProfile?.country_code ? (
              <p className="text-xs text-amber-500/80 mt-1 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Nationality cannot be changed after initial setup
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Used for country vs country tournament matchmaking</p>
            )}
          </div>

          <div>
            <Label>Specialties</Label>
            <SpecialtyPillSelector
              value={formData.specialty}
              onChange={(value) => setFormData({ ...formData, specialty: value })}
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="City, State/Country"
            />
          </div>

          {/* Shop address — drives distance to fans */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold m-0">Shop Address</Label>
              {formData.latitude && formData.longitude ? (
                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                  Located
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
                  Not located
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Fans see your distance from them. Exact address only shown if you allow it below.
            </p>

            <Input
              placeholder="Street address"
              value={formData.shop_address}
              onChange={(e) => setFormData({ ...formData, shop_address: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="City"
                value={formData.shop_city}
                onChange={(e) => setFormData({ ...formData, shop_city: e.target.value })}
              />
              <Input
                placeholder="State / Region"
                value={formData.shop_state}
                onChange={(e) => setFormData({ ...formData, shop_state: e.target.value })}
              />
            </div>
            <Input
              placeholder="Postal code"
              value={formData.shop_postal_code}
              onChange={(e) => setFormData({ ...formData, shop_postal_code: e.target.value })}
            />

            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.address_visibility === 'exact'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address_visibility: e.target.checked ? 'exact' : 'approximate',
                    })
                  }
                />
                Show exact street address publicly
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeocodeAddress}
                disabled={geocoding}
              >
                {geocoding ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                ) : (
                  <MapPin className="h-3 w-3 mr-1.5" />
                )}
                Locate
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="years_experience">Years of Experience</Label>
            <Input
              id="years_experience"
              type="number"
              value={formData.years_experience}
              onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
              placeholder="e.g., 5"
              min="0"
              max="50"
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell people about your style and experience..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="portfolio_url">Portfolio URL</Label>
            <Input
              id="portfolio_url"
              value={formData.portfolio_url}
              onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
              placeholder="https://your-portfolio-site.com"
              type="url"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : (existingProfile ? 'Update Profile' : 'Create Profile')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
