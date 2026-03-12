import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RotatingBBCoin } from '@/components/economy/RotatingBBCoin';
import { RoleBadge } from '@/components/RoleBadge';

import { SubCategoryBadge } from '@/components/SubCategoryBadge';
import { Plus, Edit3, Check, X, Award, Lock, Users, Vote, LogOut, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FanProfileHeaderProps {
  userId: string;
  avatar_url?: string | null;
  display_name: string;
  username?: string | null;
  bio?: string | null;
  country_code?: string | null;
  sub_category?: string | null;
  barberBucks: number;
  stats: {
    votes_cast: number;
    voting_power: number;
  };
  onAddFundsClick: () => void;
  onBecomeSponsorClick: () => void;
  onSignOutClick?: () => void;
  onDeleteAccountClick?: () => void;
}

export function FanProfileHeader({
  userId,
  avatar_url,
  display_name,
  username,
  bio,
  country_code,
  sub_category,
  barberBucks,
  stats,
  onAddFundsClick,
  onBecomeSponsorClick,
  onSignOutClick,
  onDeleteAccountClick,
}: FanProfileHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    display_name: display_name || '',
    username: username || '',
    bio: bio || '',
  });
  const queryClient = useQueryClient();

  const getCountryFlag = (code: string) => {
    const codePoints = code
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: data.display_name, username: data.username, bio: data.bio })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      toast.success('Profile updated!');
      setIsEditing(false);
    },
    onError: (error: any) => {
      if (error.code === '23505' || error.message?.includes('profiles_username_key')) {
        toast.error('Username already taken.');
      } else {
        toast.error('Failed to update profile.');
      }
    },
  });

  const handleSave = () => updateMutation.mutate(editData);
  const handleCancel = () => {
    setEditData({ display_name: display_name || '', username: username || '', bio: bio || '' });
    setIsEditing(false);
  };

  return (
    <Card className="relative overflow-hidden border-primary/20">
      {/* Country flag background */}
      {country_code && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] text-[12rem] md:text-[18rem] select-none pointer-events-none z-0">
          {getCountryFlag(country_code)}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-primary/20 z-[1]" />

      {/* BB Display - Top Right */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-cyan-500/20">
        <RotatingBBCoin avatarUrl={avatar_url} displayName={display_name} size="xs" animate={true} />
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-foreground">{barberBucks.toLocaleString()}</span>
            <span className="text-xs text-cyan-400">BB</span>
          </div>
        </div>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-cyan-500/20" onClick={onAddFundsClick}>
          <Plus className="h-3 w-3 text-cyan-400" />
        </Button>
      </div>

      <CardContent className="relative p-4 md:p-8 z-10">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
          <Avatar className="w-20 h-20 md:w-32 md:h-32 border-4 border-primary/30">
            <AvatarImage src={avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-3xl md:text-4xl font-bold">
              {(display_name || 'F').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3 w-full">
            {/* Name + Badges */}
            {!isEditing ? (
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-4xl font-bold text-foreground">{display_name || 'Fan'}</h1>
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    <Users className="w-3 h-3 mr-1" />
                    Fan
                  </Badge>
                  <SubCategoryBadge subCategory={sub_category} size="md" />
                  {country_code && (
                    <span className="text-2xl md:text-3xl">{getCountryFlag(country_code)}</span>
                  )}
                </div>
                {username && (
                  <p className="text-sm text-muted-foreground mt-1">@{username}</p>
                )}
                {bio && (
                  <p className="text-sm text-muted-foreground mt-1 max-w-lg">{bio}</p>
                )}
                {country_code && (
                  <div className="flex items-center gap-1 mt-1">
                    <Lock className="h-3 w-3 text-amber-500/60" />
                    <span className="text-[10px] text-amber-500/60">Nationality locked</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-w-md">
                <div>
                  <Label className="text-xs text-muted-foreground">Display Name</Label>
                  <Input
                    value={editData.display_name}
                    onChange={e => setEditData(prev => ({ ...prev, display_name: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Username</Label>
                  <Input
                    value={editData.username}
                    onChange={e => setEditData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="@username"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Bio</Label>
                  <Input
                    value={editData.bio}
                    onChange={e => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Stats Row */}
            <div className="flex gap-4 md:gap-6 flex-wrap">
              <div className="text-center">
                <div className="text-lg md:text-3xl font-bold text-foreground">{stats.votes_cast}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Votes Cast</div>
              </div>
              <div className="text-center">
                <div className="text-lg md:text-3xl font-bold text-primary">{stats.voting_power}x</div>
                <div className="text-xs md:text-sm text-muted-foreground">Vote Power</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap pt-1">
              {!isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditData({ display_name: display_name || '', username: username || '', bio: bio || '' });
                    setIsEditing(true);
                  }}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                  {sub_category !== 'official_sponsor' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20"
                      onClick={onBecomeSponsorClick}
                    >
                      <Award className="w-4 h-4 mr-1.5" />
                      Become Sponsor
                    </Button>
                  )}
                  {onSignOutClick && (
                    <Button variant="ghost" size="sm" onClick={onSignOutClick} className="text-muted-foreground hover:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                    <Check className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
