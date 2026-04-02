import { useState } from 'react';
import { Users, Shield, ShieldOff, UserX, UserCheck, BadgeCheck, Search, X, Save, Coins, Flame, Eye, BookOpen, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SubCategoryBadge } from '@/components/SubCategoryBadge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserControlPanelProps {
  stats: { total_users?: number; role_distribution?: Record<string, number>; verified_users?: number };
  onRefresh: () => void;
}

const UserControlPanel = ({ stats, onRefresh }: UserControlPanelProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [allBarbers, setAllBarbers] = useState<any[]>([]);
  const [allFans, setAllFans] = useState<any[]>([]);
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
      const response = await supabase.functions.invoke('sovereign-user-control', { body: { action: 'search_users', search_query: searchQuery, limit: 20 } });
      if (response.error) throw response.error;
      setSearchResults(response.data.users || []);
    } catch (error: any) { toast.error(error.message || 'Search failed'); }
    finally { setLoading(false); }
  };

  const loadDirectory = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-user-control', { body: { action: 'list_all_users' } });
      if (response.error) throw response.error;
      setAllBarbers(response.data.barbers || []);
      setAllFans(response.data.fans || []);
      setDirectoryOpen(true);
    } catch (error: any) { toast.error(error.message || 'Failed to load directory'); }
    finally { setLoading(false); }
  };

  const openProfile = async (userId: string) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-user-control', { body: { action: 'get_user_details', user_id: userId } });
      if (response.error) throw response.error;
      setUserDetails(response.data);
      setProfileEdits({}); setBarberEdits({}); setClientEdits({});
      setBbAmount(''); setBbReason('');
      setSearchOpen(false); setProfileOpen(true);
    } catch (error: any) { toast.error(error.message || 'Failed to load profile'); }
    finally { setLoading(false); }
  };

  const saveChanges = async () => {
    if (!userDetails?.profile?.user_id) return;
    setSaving(true);
    try {
      const hasChanges = Object.keys(profileEdits).length > 0 || Object.keys(barberEdits).length > 0 || Object.keys(clientEdits).length > 0;
      if (!hasChanges) { toast.info('No changes to save'); setSaving(false); return; }
      const response = await supabase.functions.invoke('sovereign-user-control', {
        body: { action: 'update_profile', user_id: userDetails.profile.user_id,
          updates: Object.keys(profileEdits).length > 0 ? profileEdits : undefined,
          barber_updates: Object.keys(barberEdits).length > 0 ? barberEdits : undefined,
          client_updates: Object.keys(clientEdits).length > 0 ? clientEdits : undefined }
      });
      if (response.error) throw response.error;
      toast.success('Profile updated');
      await openProfile(userDetails.profile.user_id);
      onRefresh();
    } catch (error: any) { toast.error(error.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const quickAction = async (action: string, params: any = {}) => {
    if (!userDetails?.profile?.user_id) return;
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-user-control', { body: { action, user_id: userDetails.profile.user_id, ...params } });
      if (response.error) throw response.error;
      toast.success(`${action.replace(/_/g, ' ')} completed`);
      await openProfile(userDetails.profile.user_id);
      onRefresh();
    } catch (error: any) { toast.error(error.message || 'Action failed'); }
    finally { setLoading(false); }
  };

  const getProfileVal = (field: string) => field in profileEdits ? profileEdits[field] : userDetails?.profile?.[field] ?? '';
  const getBarberVal = (field: string) => field in barberEdits ? barberEdits[field] : userDetails?.barber_profile?.[field] ?? '';
  const getClientVal = (field: string) => field in clientEdits ? clientEdits[field] : userDetails?.client_profile?.[field] ?? '';

  const inputClass = "bg-[#0a0a0f] border-white/10 text-white h-8 text-sm";
  const labelClass = "text-xs text-white/40";

  const fieldInput = (label: string, field: string, editState: Record<string, any>, setEditState: (s: Record<string, any>) => void, getValue: (f: string) => any, type = 'text') => (
    <div className="space-y-1">
      <Label className={labelClass}>{label}</Label>
      <Input type={type} value={getValue(field) ?? ''} onChange={(e) => setEditState({ ...editState, [field]: type === 'number' ? Number(e.target.value) : e.target.value })} className={inputClass} />
    </div>
  );

  const fieldToggle = (label: string, field: string, editState: Record<string, any>, setEditState: (s: Record<string, any>) => void, getValue: (f: string) => any) => (
    <div className="flex items-center justify-between">
      <Label className={labelClass}>{label}</Label>
      <Switch checked={!!getValue(field)} onCheckedChange={(v) => setEditState({ ...editState, [field]: v })} />
    </div>
  );

  return (
    <>
      <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-white">Users</h3>
        </div>

        <div className="space-y-3 mb-4">
          {[
            { label: 'Total Users', value: stats?.total_users || 0 },
            { label: 'Barbers', value: stats?.role_distribution?.barber || 0 },
            { label: 'Verified', value: stats?.verified_users || 0 },
          ].map((s, i) => (
            <div key={i} className="bg-[#0a0a0f] p-3 rounded-lg border border-white/[0.06]">
              <div className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</div>
              <div className="text-xl font-semibold text-white mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button className="flex-1 border-white/10 text-white hover:bg-white/[0.04] bg-transparent text-xs" variant="outline" onClick={() => setSearchOpen(true)}>
            <Search className="h-3 w-3 mr-1.5" /> Search
          </Button>
          <Button className="flex-1 border-white/10 text-white hover:bg-white/[0.04] bg-transparent text-xs" variant="outline" onClick={loadDirectory} disabled={loading}>
            <BookOpen className="h-3 w-3 mr-1.5" /> Browse
          </Button>
        </div>
      </div>

      {/* Search Modal */}
      <Dialog open={searchOpen} onOpenChange={() => { setSearchOpen(false); setSearchResults([]); }}>
        <DialogContent className="bg-[#12121a] border-white/[0.06] max-w-2xl">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Search className="h-4 w-4 text-orange-500" /> Search Users</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Search by name or username" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-[#0a0a0f] border-white/10 text-white flex-1" onKeyDown={(e) => e.key === 'Enter' && searchUsers()} />
              <Button onClick={searchUsers} disabled={loading} className="bg-orange-500 hover:bg-orange-600">{loading ? 'Searching...' : 'Search'}</Button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {searchResults.map((u) => (
                <div key={u.id} className="bg-[#0a0a0f] p-3 rounded-lg border border-white/[0.06] flex items-center justify-between cursor-pointer hover:border-orange-500/30 transition-colors" onClick={() => openProfile(u.user_id)}>
                  <div>
                    <div className="text-white font-medium text-sm">{u.display_name || u.username || 'Unknown'}</div>
                    <div className="text-xs text-white/20 font-mono">{u.user_id}</div>
                    <div className="text-xs text-white/40">Roles: {u.roles?.join(', ') || 'none'} | BB: {u.barber_bucks || 0}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.is_verified_by_competition && <BadgeCheck className="h-4 w-4 text-cyan-400" />}
                    <Eye className="h-4 w-4 text-white/20" />
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && !loading && <div className="text-white/30 text-center py-4">No users found</div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Directory Modal */}
      <Dialog open={directoryOpen} onOpenChange={() => setDirectoryOpen(false)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06] max-w-2xl max-h-[80vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-white flex items-center gap-2"><BookOpen className="h-4 w-4 text-orange-500" /> User Directory</DialogTitle>
            <DialogDescription className="text-white/30 text-xs">{allBarbers.length + allFans.length} users total</DialogDescription>
          </DialogHeader>
          <ScrollArea className="px-6 pb-6 max-h-[60vh]">
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-2">Barbers ({allBarbers.length})</h4>
              <div className="space-y-1">
                {allBarbers.map((u: any) => (
                  <div key={u.user_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0a0a0f] border border-white/[0.06] cursor-pointer hover:border-orange-500/30 transition-colors" onClick={() => { setDirectoryOpen(false); openProfile(u.user_id); }}>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{u.display_name || u.username || 'Unknown'}</span>
                      <SubCategoryBadge subCategory={u.sub_category} size="sm" />
                    </div>
                    <span className="text-xs text-white/40 font-mono">{u.barber_bucks || 0} BB</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Fans ({allFans.length})</h4>
              <div className="space-y-1">
                {allFans.map((u: any) => (
                  <div key={u.user_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0a0a0f] border border-white/[0.06] cursor-pointer hover:border-cyan-400/30 transition-colors" onClick={() => { setDirectoryOpen(false); openProfile(u.user_id); }}>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{u.display_name || u.username || 'Unknown'}</span>
                      <SubCategoryBadge subCategory={u.sub_category} size="sm" />
                    </div>
                    <span className="text-xs text-white/40 font-mono">{u.barber_bucks || 0} BB</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Profile Inspector Modal */}
      <Dialog open={profileOpen} onOpenChange={() => setProfileOpen(false)}>
        <DialogContent className="bg-[#12121a] border-white/[0.06] max-w-3xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              {userDetails?.profile?.display_name || userDetails?.profile?.username || 'Unknown'}
            </DialogTitle>
            <DialogDescription className="text-white/20 font-mono text-xs">{userDetails?.profile?.user_id}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="px-6 pb-6 max-h-[70vh]">
            {userDetails && (
              <div className="space-y-6">
                {/* Quick Actions Bar */}
                <div className="flex flex-wrap gap-2 p-3 bg-[#0a0a0f] rounded-lg border border-white/[0.06]">
                  <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/[0.04] text-xs" disabled={loading}
                    onClick={() => quickAction(userDetails.profile.is_verified_by_competition ? 'remove_verify' : 'force_verify')}>
                    <BadgeCheck className="h-3 w-3 mr-1" /> {userDetails.profile.is_verified_by_competition ? 'Unverify' : 'Verify'}
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs" disabled={loading} onClick={() => quickAction('freeze_account')}>
                    <UserX className="h-3 w-3 mr-1" /> Freeze
                  </Button>
                  <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/[0.04] text-xs" disabled={loading} onClick={() => quickAction('unfreeze_account')}>
                    <UserCheck className="h-3 w-3 mr-1" /> Unfreeze
                  </Button>
                  <div className="flex items-center gap-1 ml-auto">
                    <Input type="number" placeholder="BB" value={bbAmount} onChange={(e) => setBbAmount(e.target.value)} className="bg-[#12121a] border-white/10 text-white h-8 w-20 text-xs" />
                    <Input placeholder="Reason" value={bbReason} onChange={(e) => setBbReason(e.target.value)} className="bg-[#12121a] border-white/10 text-white h-8 w-28 text-xs" />
                    <Button size="sm" variant="outline" className="border-white/10 text-orange-400 hover:bg-white/[0.04] text-xs h-8" disabled={loading || !bbAmount}
                      onClick={() => { quickAction('mint_bb', { amount: Number(bbAmount), reason: bbReason }); setBbAmount(''); setBbReason(''); }}>
                      <Coins className="h-3 w-3 mr-1" /> Mint
                    </Button>
                    <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/[0.04] text-xs h-8" disabled={loading || !bbAmount}
                      onClick={() => { quickAction('burn_bb', { amount: Number(bbAmount), reason: bbReason }); setBbAmount(''); setBbReason(''); }}>
                      <Flame className="h-3 w-3 mr-1" /> Burn
                    </Button>
                  </div>
                </div>

                <Section title="Identity">
                  <div className="grid grid-cols-2 gap-3">
                    {fieldInput('Display Name', 'display_name', profileEdits, setProfileEdits, getProfileVal)}
                    {fieldInput('Username', 'username', profileEdits, setProfileEdits, getProfileVal)}
                    {fieldInput('Avatar URL', 'avatar_url', profileEdits, setProfileEdits, getProfileVal)}
                    <div className="space-y-1">
                      <Label className={labelClass}>User Type</Label>
                      <Select value={getProfileVal('user_type')} onValueChange={(v) => setProfileEdits({ ...profileEdits, user_type: v })}>
                        <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#12121a] border-white/10"><SelectItem value="fan">Fan</SelectItem><SelectItem value="barber">Barber</SelectItem></SelectContent>
                      </Select>
                    </div>
                    {fieldInput('Country Code', 'country_code', profileEdits, setProfileEdits, getProfileVal)}
                    <div className="space-y-1">
                      <Label className={labelClass}>Sub-Category</Label>
                      <Select value={getProfileVal('sub_category') || 'none'} onValueChange={(v) => setProfileEdits({ ...profileEdits, sub_category: v === 'none' ? null : v })}>
                        <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#12121a] border-white/10">
                          <SelectItem value="none">None</SelectItem>
                          {(getProfileVal('user_type') === 'barber' || userDetails?.roles?.includes('barber')) && <SelectItem value="educator">🎓 Educator</SelectItem>}
                          {(getProfileVal('user_type') === 'fan' || (!userDetails?.roles?.includes('barber'))) && <SelectItem value="official_sponsor">🏆 Official Sponsor</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className={labelClass}>Bio</Label>
                    <Textarea value={getProfileVal('bio') ?? ''} onChange={(e) => setProfileEdits({ ...profileEdits, bio: e.target.value })} className="bg-[#0a0a0f] border-white/10 text-white text-sm mt-1" rows={2} />
                  </div>
                </Section>

                <Section title="Economy">
                  <div className="grid grid-cols-2 gap-3">
                    {fieldInput('Barber Bucks', 'barber_bucks', profileEdits, setProfileEdits, getProfileVal, 'number')}
                    {fieldInput('Total Earnings', 'total_earnings', profileEdits, setProfileEdits, getProfileVal, 'number')}
                  </div>
                </Section>

                <Section title="Status & Flags">
                  <div className="grid grid-cols-2 gap-3">
                    {fieldToggle('Verified by Competition', 'is_verified_by_competition', profileEdits, setProfileEdits, getProfileVal)}
                    {fieldToggle('Is Creator', 'is_creator', profileEdits, setProfileEdits, getProfileVal)}
                    <div className="space-y-1">
                      <Label className={labelClass}>Creator Level</Label>
                      <Select value={getProfileVal('creator_level') || 'Bronze'} onValueChange={(v) => setProfileEdits({ ...profileEdits, creator_level: v })}>
                        <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#12121a] border-white/10">
                          {['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {fieldInput('3x Vote Expires At', 'three_x_vote_expires_at', profileEdits, setProfileEdits, getProfileVal)}
                  </div>
                </Section>

                <Section title="Roles">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {userDetails.roles?.map((r: string) => (
                      <span key={r} className="inline-flex items-center gap-1 px-2 py-1 bg-white/[0.06] text-white/60 text-xs rounded-full border border-white/10">
                        {r}
                        <button onClick={() => quickAction('remove_role', { role: r })} className="hover:text-red-400"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                    {(!userDetails.roles || userDetails.roles.length === 0) && <span className="text-xs text-white/30">No roles assigned</span>}
                  </div>
                  <div className="flex gap-2">
                    <Select value={roleToAdd} onValueChange={setRoleToAdd}>
                      <SelectTrigger className={`${inputClass} w-40`}><SelectValue placeholder="Add role..." /></SelectTrigger>
                      <SelectContent className="bg-[#12121a] border-white/10"><SelectItem value="fan">Fan</SelectItem><SelectItem value="barber">Barber</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="border-white/10 text-orange-400 h-8 text-xs" disabled={!roleToAdd || loading}
                      onClick={() => { quickAction('assign_role', { role: roleToAdd }); setRoleToAdd(''); }}>
                      <Shield className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                </Section>

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
                        <Label className={labelClass}>Subscription Tier</Label>
                        <Select value={getBarberVal('active_subscription_tier') || 'none'} onValueChange={(v) => setBarberEdits({ ...barberEdits, active_subscription_tier: v === 'none' ? null : v })}>
                          <SelectTrigger className={inputClass}><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent className="bg-[#12121a] border-white/10">
                            {['none', 'bronze', 'silver', 'gold', 'diamond'].map(t => <SelectItem key={t} value={t}>{t === 'none' ? 'None' : t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {fieldToggle('Can Stream', 'can_stream', barberEdits, setBarberEdits, getBarberVal)}
                    </div>
                    <div className="mt-2">
                      <Label className={labelClass}>Bio</Label>
                      <Textarea value={getBarberVal('bio') ?? ''} onChange={(e) => setBarberEdits({ ...barberEdits, bio: e.target.value })} className="bg-[#0a0a0f] border-white/10 text-white text-sm mt-1" rows={2} />
                    </div>
                  </Section>
                )}

                {userDetails.client_profile && (
                  <Section title="Client Profile">
                    <div className="grid grid-cols-2 gap-3">
                      {fieldInput('Voting Power', 'voting_power', clientEdits, setClientEdits, getClientVal, 'number')}
                      {fieldInput('Total Votes Cast', 'total_votes_cast', clientEdits, setClientEdits, getClientVal, 'number')}
                    </div>
                  </Section>
                )}

                {userDetails.recent_transactions?.length > 0 && (
                  <Section title="Recent Transactions">
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {userDetails.recent_transactions.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.06]">
                          <span className="text-white/40">{t.transaction_type}</span>
                          <span className={t.amount >= 0 ? 'text-green-400' : 'text-red-400'}>{t.amount >= 0 ? '+' : ''}{t.amount} BB</span>
                          <span className="text-white/20">{new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {userDetails.recent_battles?.length > 0 && (
                  <Section title="Recent Battles">
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {userDetails.recent_battles.map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.06]">
                          <span className="text-white truncate max-w-[200px]">{b.title}</span>
                          <span className="text-white/40 uppercase">{b.status}</span>
                          <span className="text-white/20">{new Date(b.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="px-6 py-4 border-t border-white/[0.06] flex justify-between">
            <Button variant="ghost" onClick={() => setProfileOpen(false)} className="text-white/40">Close</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" disabled={saving || (Object.keys(profileEdits).length === 0 && Object.keys(barberEdits).length === 0 && Object.keys(clientEdits).length === 0)} onClick={saveChanges}>
              <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider border-b border-white/[0.06] pb-1">{title}</h4>
    {children}
  </div>
);

export default UserControlPanel;
