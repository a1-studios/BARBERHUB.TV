import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountrySelector } from '@/components/CountrySelector';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Users, Globe, Info } from 'lucide-react';

interface ClientProfileFormProps {
  onProfileCreated?: () => void;
  existingProfile?: any;
}

export function ClientProfileForm({ onProfileCreated, existingProfile }: ClientProfileFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: existingProfile?.username || '',
    avatar_url: existingProfile?.avatar_url || '',
    country_code: existingProfile?.country_code || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
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
        ...formData,
        user_id: user.id
      };

      if (existingProfile) {
        const { error } = await supabase
          .from('client_profiles')
          .update(profileData)
          .eq('id', existingProfile.id);

        if (error) throw error;
        toast.success('Profile updated successfully!');
      } else {
        const { error } = await supabase
          .from('client_profiles')
          .insert(profileData);

        if (error) throw error;
        toast.success('Profile created successfully!');
      }

      // Also update profiles table
      await supabase
        .from('profiles')
        .update({ 
          username: formData.username,
          country_code: formData.country_code || null 
        })
        .eq('user_id', user.id);

      onProfileCreated?.();
    } catch (error: any) {
      console.error('Error saving client profile:', error);
      if (error.code === '23505') {
        toast.error('This username is already taken. Please choose another.');
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
          <div className="p-2 bg-secondary/50 rounded-lg">
            <Users className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <CardTitle>
              {existingProfile ? 'Update Your Profile' : 'Create Your Profile'}
            </CardTitle>
            <CardDescription>
              Set up your fan profile to vote and support barbers
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Simple Profile Notice */}
        <div className="bg-muted/50 border border-border rounded-lg p-3 mb-6 flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p>Quick setup! Just pick a username to get started. You can add more details later when purchasing Barber Bucks.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Choose a unique username"
              className={errors.username ? 'border-destructive' : ''}
            />
            {errors.username && <p className="text-xs text-destructive mt-1">{errors.username}</p>}
            <p className="text-xs text-muted-foreground mt-1">This will be your display name in the community</p>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Country (optional)
            </Label>
            <CountrySelector
              value={formData.country_code}
              onChange={(code) => setFormData({ ...formData, country_code: code || '' })}
              placeholder="Select your country"
            />
            <p className="text-xs text-muted-foreground mt-1">Show your flag when voting and cheering</p>
          </div>

          <div>
            <Label htmlFor="avatar_url">Avatar URL (optional)</Label>
            <Input
              id="avatar_url"
              value={formData.avatar_url}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              placeholder="https://your-avatar-image.com"
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
