import { useState } from 'react';
import { Users, Shield, ShieldOff, UserX, UserCheck, BadgeCheck, Search, X, Save, Coins, Flame, Eye, BookOpen, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SubCategoryBadge } from '@/components/SubCategoryBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserControlPanelProps {
  stats: {
    total_users?: number;
    role_distribution?: Record<string, number>;
    verified_users?: number;
  };
  onRefresh: () => void;
}

const UserControlPanel = ({ stats, onRefresh }: UserControlPanelProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Profile inspector state
  const [userDetails, setUserDetails] = useState<any>(null);
  const [profileEdits, setProfileEdits] = useState<Record<string, any>>({});
  const [barberEdits, setBarberEdits] = useState<Record<string, any>>({});
  const [clientEdits, setClientEdits] = useState<Record<string, any>>({});
  const [bbAmount, setBbAmount] = useState('');
  const [bbReason, setBbReason] = useState('');
  const [roleToAdd, setRoleToAdd] = useState('');

  const searchUsers = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-user-control', {
        body: { action: 'search_users', search_query: searchQuery, limit: 20 }
      });
      if (response.error) throw response.error;
      setSearchResults(response.data.users || []);
    } catch (error: any) {
      toast.error(error.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const openProfile = async (userId: string) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-user-control', {
        body: { action: 'get_user_details', user_id: userId }
      });
      if (response.error) throw response.error;
      setUserDetails(response.data);
      setProfileEdits({});
      setBarberEdits({});
      setClientEdits({});
      setBbAmount('');
      setBbReason('');
      setSearchOpen(false);
      setProfileOpen(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    if (!userDetails?.profile?.user_id) return;
    setSaving(true);
    try {
      const hasChanges = Object.keys(profileEdits).length > 0 || Object.keys(barberEdits).length > 0 || Object.keys(clientEdits).length > 0;
      if (!hasChanges) { toast.info('No changes to save'); setSaving(false); return; }
      
      const response = await supabase.functions.invoke('sovereign-user-control', {
        body: {
          action: 'update_profile',
          user_id: userDetails.profile.user_id,
          updates: Object.keys(profileEdits).length > 0 ? profileEdits : undefined,
          barber_updates: Object.keys(barberEdits).length > 0 ? barberEdits : undefined,
          client_updates: Object.keys(clientEdits).length > 0 ? clientEdits : undefined,
        }
      });
      if (response.error) throw response.error;
      toast.success('Profile updated');
      // Refresh
      await openProfile(userDetails.profile.user_id);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const quickAction = async (action: string, params: any = {}) => {
    if (!userDetails?.profile?.user_id) return;
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-user-control', {
        body: { action, user_id: userDetails.profile.user_id, ...params }
      });
      if (response.error) throw response.error;
      toast.success(`${action.replace(/_/g, ' ')} completed`);
      await openProfile(userDetails.profile.user_id);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const getProfileVal = (field: string) => {
    return field in profileEdits ? profileEdits[field] : userDetails?.profile?.[field] ?? '';
  };
  const getBarberVal = (field: string) => {
    return field in barberEdits ? barberEdits[field] : userDetails?.barber_profile?.[field] ?? '';
  };
  const getClientVal = (field: string) => {
    return field in clientEdits ? clientEdits[field] : userDetails?.client_profile?.[field] ?? '';
  };

  const fieldInput = (label: string, field: string, editState: Record<string, any>, setEditState: (s: Record<string, any>) => void, getValue: (f: string) => any, type = 'text') => (
    <div className="space-y-1">
      <Label className="text-xs text-gray-400">{label}</Label>
      <Input
        type={type}
        value={getValue(field) ?? ''}
        onChange={(e) => setEditState({ ...editState, [field]: type === 'number' ? Number(e.target.value) : e.target.value })}
        className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm"
      />
    </div>
  );

  const fieldToggle = (label: string, field: string, editState: Record<string, any>, setEditState: (s: Record<string, any>) => void, getValue: (f: string) => any) => (
    <div className="flex items-center justify-between">
      <Label className="text-xs text-gray-400">{label}</Label>
      <Switch
        checked={!!getValue(field)}
        onCheckedChange={(v) => setEditState({ ...editState, [field]: v })}
      />
    </div>
  );

  return (
    <>
      <div className="bg-[#1a1a2e] border border-purple-900/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-bold text-purple-400">USER CONTROL</h3>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Users</div>
            <div className="text-2xl font-mono text-purple-400">{stats?.total_users || 0}</div>
          </div>
          <div className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Barbers</div>
            <div className="text-2xl font-mono text-blue-400">{stats?.role_distribution?.barber || 0}</div>
          </div>
          <div className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Verified</div>
            <div className="text-2xl font-mono text-green-400">{stats?.verified_users || 0}</div>
          </div>
        </div>

        <Button
          className="w-full bg-indigo-950/30 border border-indigo-700 text-indigo-400 hover:bg-indigo-900/50"
          variant="outline"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4 mr-2" />
          Search & Inspect Users
        </Button>
      </div>

      {/* Search Modal */}
      <Dialog open={searchOpen} onOpenChange={() => { setSearchOpen(false); setSearchResults([]); }}>
        <DialogContent className="bg-[#1a1a2e] border-indigo-900/50 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-indigo-400 flex items-center gap-2">
              <Search className="h-5 w-5" /> Search Users
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0f0f1a] border-gray-700 text-white flex-1"
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              />
              <Button onClick={searchUsers} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800 flex items-center justify-between cursor-pointer hover:border-indigo-600 transition-colors"
                  onClick={() => openProfile(u.user_id)}
                >
                  <div>
                    <div className="text-white font-medium">{u.display_name || u.username || 'Unknown'}</div>
                    <div className="text-xs text-gray-500 font-mono">{u.user_id}</div>
                    <div className="text-xs text-gray-400">
                      Roles: {u.roles?.join(', ') || 'none'} | BB: {u.barber_bucks || 0}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.is_verified_by_competition && <BadgeCheck className="h-4 w-4 text-blue-400" />}
                    <Eye className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && !loading && (
                <div className="text-gray-500 text-center py-4">No users found</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Inspector Modal */}
      <Dialog open={profileOpen} onOpenChange={() => setProfileOpen(false)}>
        <DialogContent className="bg-[#1a1a2e] border-purple-900/50 max-w-3xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-purple-400 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Profile Inspector: {userDetails?.profile?.display_name || userDetails?.profile?.username || 'Unknown'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-mono text-xs">
              {userDetails?.profile?.user_id}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="px-6 pb-6 max-h-[70vh]">
            {userDetails && (
              <div className="space-y-6">
                {/* Quick Actions Bar */}
                <div className="flex flex-wrap gap-2 p-3 bg-[#0f0f1a] rounded-lg border border-gray-800">
                  <Button size="sm" variant="outline" className="border-green-700 text-green-400 hover:bg-green-900/50 text-xs"
                    disabled={loading}
                    onClick={() => quickAction(userDetails.profile.is_verified_by_competition ? 'remove_verify' : 'force_verify')}>
                    <BadgeCheck className="h-3 w-3 mr-1" />
                    {userDetails.profile.is_verified_by_competition ? 'Unverify' : 'Verify'}
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-700 text-red-400 hover:bg-red-900/50 text-xs"
                    disabled={loading}
                    onClick={() => quickAction('freeze_account')}>
                    <UserX className="h-3 w-3 mr-1" /> Freeze
                  </Button>
                  <Button size="sm" variant="outline" className="border-blue-700 text-blue-400 hover:bg-blue-900/50 text-xs"
                    disabled={loading}
                    onClick={() => quickAction('unfreeze_account')}>
                    <UserCheck className="h-3 w-3 mr-1" /> Unfreeze
                  </Button>
                  <div className="flex items-center gap-1 ml-auto">
                    <Input
                      type="number"
                      placeholder="BB amount"
                      value={bbAmount}
                      onChange={(e) => setBbAmount(e.target.value)}
                      className="bg-[#1a1a2e] border-gray-700 text-white h-8 w-24 text-xs"
                    />
                    <Input
                      placeholder="Reason"
                      value={bbReason}
                      onChange={(e) => setBbReason(e.target.value)}
                      className="bg-[#1a1a2e] border-gray-700 text-white h-8 w-32 text-xs"
                    />
                    <Button size="sm" variant="outline" className="border-yellow-700 text-yellow-400 hover:bg-yellow-900/50 text-xs h-8"
                      disabled={loading || !bbAmount}
                      onClick={() => { quickAction('mint_bb', { amount: Number(bbAmount), reason: bbReason }); setBbAmount(''); setBbReason(''); }}>
                      <Coins className="h-3 w-3 mr-1" /> Mint
                    </Button>
                    <Button size="sm" variant="outline" className="border-orange-700 text-orange-400 hover:bg-orange-900/50 text-xs h-8"
                      disabled={loading || !bbAmount}
                      onClick={() => { quickAction('burn_bb', { amount: Number(bbAmount), reason: bbReason }); setBbAmount(''); setBbReason(''); }}>
                      <Flame className="h-3 w-3 mr-1" /> Burn
                    </Button>
                  </div>
                </div>

                {/* Identity Section */}
                <Section title="Identity">
                  <div className="grid grid-cols-2 gap-3">
                    {fieldInput('Display Name', 'display_name', profileEdits, setProfileEdits, getProfileVal)}
                    {fieldInput('Username', 'username', profileEdits, setProfileEdits, getProfileVal)}
                    {fieldInput('Avatar URL', 'avatar_url', profileEdits, setProfileEdits, getProfileVal)}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">User Type</Label>
                      <Select value={getProfileVal('user_type')} onValueChange={(v) => setProfileEdits({ ...profileEdits, user_type: v })}>
                        <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-gray-700">
                          <SelectItem value="fan">Fan</SelectItem>
                          <SelectItem value="barber">Barber</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {fieldInput('Country Code', 'country_code', profileEdits, setProfileEdits, getProfileVal)}
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs text-gray-400">Bio</Label>
                    <Textarea
                      value={getProfileVal('bio') ?? ''}
                      onChange={(e) => setProfileEdits({ ...profileEdits, bio: e.target.value })}
                      className="bg-[#0f0f1a] border-gray-700 text-white text-sm mt-1"
                      rows={2}
                    />
                  </div>
                </Section>

                {/* Economy Section */}
                <Section title="Economy">
                  <div className="grid grid-cols-2 gap-3">
                    {fieldInput('Barber Bucks', 'barber_bucks', profileEdits, setProfileEdits, getProfileVal, 'number')}
                    {fieldInput('Total Earnings', 'total_earnings', profileEdits, setProfileEdits, getProfileVal, 'number')}
                  </div>
                </Section>

                {/* Status Section */}
                <Section title="Status & Flags">
                  <div className="grid grid-cols-2 gap-3">
                    {fieldToggle('Verified by Competition', 'is_verified_by_competition', profileEdits, setProfileEdits, getProfileVal)}
                    {fieldToggle('Is Creator', 'is_creator', profileEdits, setProfileEdits, getProfileVal)}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">Creator Level</Label>
                      <Select value={getProfileVal('creator_level') || 'Bronze'} onValueChange={(v) => setProfileEdits({ ...profileEdits, creator_level: v })}>
                        <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-gray-700">
                          <SelectItem value="Bronze">Bronze</SelectItem>
                          <SelectItem value="Silver">Silver</SelectItem>
                          <SelectItem value="Gold">Gold</SelectItem>
                          <SelectItem value="Platinum">Platinum</SelectItem>
                          <SelectItem value="Diamond">Diamond</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {fieldInput('3x Vote Expires At', 'three_x_vote_expires_at', profileEdits, setProfileEdits, getProfileVal)}
                  </div>
                </Section>

                {/* Roles Section */}
                <Section title="Roles">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {userDetails.roles?.map((r: string) => (
                      <span key={r} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-900/40 text-purple-300 text-xs rounded-full border border-purple-700/50">
                        {r}
                        <button onClick={() => quickAction('remove_role', { role: r })} className="hover:text-red-400">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {(!userDetails.roles || userDetails.roles.length === 0) && (
                      <span className="text-xs text-gray-500">No roles assigned</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Select value={roleToAdd} onValueChange={setRoleToAdd}>
                      <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm w-40">
                        <SelectValue placeholder="Add role..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-gray-700">
                        <SelectItem value="fan">Fan</SelectItem>
                        <SelectItem value="barber">Barber</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="border-purple-700 text-purple-400 h-8 text-xs"
                      disabled={!roleToAdd || loading}
                      onClick={() => { quickAction('assign_role', { role: roleToAdd }); setRoleToAdd(''); }}>
                      <Shield className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                </Section>

                {/* Barber Profile Section */}
                {userDetails.barber_profile && (
                  <Section title="Barber Profile">
                    <div className="grid grid-cols-2 gap-3">
                      {fieldInput('Name', 'name', barberEdits, setBarberEdits, getBarberVal)}
                      {fieldInput('Nickname', 'nickname', barberEdits, setBarberEdits, getBarberVal)}
                      {fieldInput('Rating', 'rating', barberEdits, setBarberEdits, getBarberVal, 'number')}
                      {fieldInput('Specialty', 'specialty', barberEdits, setBarberEdits, getBarberVal)}
                      {fieldInput('Location', 'location', barberEdits, setBarberEdits, getBarberVal)}
                      {fieldInput('Years Experience', 'years_experience', barberEdits, setBarberEdits, getBarberVal, 'number')}
                      {fieldInput('Battles This Month', 'battles_created_this_month', barberEdits, setBarberEdits, getBarberVal, 'number')}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Subscription Tier</Label>
                        <Select value={getBarberVal('active_subscription_tier') || ''} onValueChange={(v) => setBarberEdits({ ...barberEdits, active_subscription_tier: v })}>
                          <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white h-8 text-sm">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a2e] border-gray-700">
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="contender">Contender</SelectItem>
                            <SelectItem value="champion">Champion</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {fieldToggle('Can Stream', 'can_stream', barberEdits, setBarberEdits, getBarberVal)}
                    </div>
                    <div className="mt-2">
                      <Label className="text-xs text-gray-400">Bio</Label>
                      <Textarea
                        value={getBarberVal('bio') ?? ''}
                        onChange={(e) => setBarberEdits({ ...barberEdits, bio: e.target.value })}
                        className="bg-[#0f0f1a] border-gray-700 text-white text-sm mt-1"
                        rows={2}
                      />
                    </div>
                  </Section>
                )}

                {/* Client Profile Section */}
                {userDetails.client_profile && (
                  <Section title="Client Profile">
                    <div className="grid grid-cols-2 gap-3">
                      {fieldInput('Voting Power', 'voting_power', clientEdits, setClientEdits, getClientVal, 'number')}
                      {fieldInput('Total Votes Cast', 'total_votes_cast', clientEdits, setClientEdits, getClientVal, 'number')}
                    </div>
                  </Section>
                )}

                {/* Recent Transactions */}
                {userDetails.recent_transactions?.length > 0 && (
                  <Section title="Recent Transactions">
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {userDetails.recent_transactions.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-800">
                          <span className="text-gray-400">{t.transaction_type}</span>
                          <span className={t.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {t.amount >= 0 ? '+' : ''}{t.amount} BB
                          </span>
                          <span className="text-gray-500">{new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Recent Battles */}
                {userDetails.recent_battles?.length > 0 && (
                  <Section title="Recent Battles">
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {userDetails.recent_battles.map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-800">
                          <span className="text-white truncate max-w-[200px]">{b.title}</span>
                          <span className="text-gray-400 uppercase">{b.status}</span>
                          <span className="text-gray-500">{new Date(b.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="px-6 py-4 border-t border-gray-800 flex justify-between">
            <Button variant="ghost" onClick={() => setProfileOpen(false)} className="text-gray-400">
              Close
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              disabled={saving || (Object.keys(profileEdits).length === 0 && Object.keys(barberEdits).length === 0 && Object.keys(clientEdits).length === 0)}
              onClick={saveChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider border-b border-gray-800 pb-1">{title}</h4>
    {children}
  </div>
);

export default UserControlPanel;
