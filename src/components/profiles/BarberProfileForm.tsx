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
    phone_number: existingProfile?.phone_number || '',
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!validate()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        user_id: user.id,
        name: formData.name.trim(),
        specialty: formData.specialty || null,
        bio: formData.bio || null,
        location: formData.location || null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        portfolio_url: formData.portfolio_url || null,
        phone_number: formData.phone_number.trim(),
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
