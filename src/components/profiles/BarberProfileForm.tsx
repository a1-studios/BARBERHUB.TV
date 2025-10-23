import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
    portfolio_url: existingProfile?.portfolio_url || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const profileData = {
        user_id: user.id,
        name: formData.name,
        specialty: formData.specialty,
        bio: formData.bio || null,
        location: formData.location || null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        portfolio_url: formData.portfolio_url || null
      };

      const { error } = await supabase
        .from('barber_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;
      
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
        <CardTitle>
          {existingProfile ? 'Update Barber Profile' : 'Create Your Barber Profile'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Professional Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your professional name"
              required
            />
          </div>

          <div>
            <Label htmlFor="specialty">Specialty</Label>
            <Select value={formData.specialty} onValueChange={(value) => setFormData({ ...formData, specialty: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select your specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fades">Fades</SelectItem>
                <SelectItem value="cuts">Classic Cuts</SelectItem>
                <SelectItem value="beard">Beard Styling</SelectItem>
                <SelectItem value="color">Hair Color</SelectItem>
                <SelectItem value="texture">Texture Work</SelectItem>
                <SelectItem value="creative">Creative Styles</SelectItem>
              </SelectContent>
            </Select>
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