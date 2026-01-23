import { useState } from 'react';
import { Users, Shield, ShieldOff, UserX, UserCheck, BadgeCheck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  const [modalOpen, setModalOpen] = useState<'role' | 'freeze' | 'verify' | 'search' | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    role: '',
    action_type: 'assign',
    search_query: '',
    reason: ''
  });

  const executeAction = async (action: string, params: any) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-user-control', {
        body: { action, ...params }
      });

      if (response.error) throw response.error;
      
      toast.success(`User ${action.replace('_', ' ')} completed`);
      onRefresh();
      setModalOpen(null);
      setFormData({ user_id: '', role: '', action_type: 'assign', search_query: '', reason: '' });
      setSelectedUser(null);
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('sovereign-user-control', {
        body: { action: 'search_users', search_query: formData.search_query, limit: 20 }
      });

      if (response.error) throw response.error;
      setSearchResults(response.data.users || []);
    } catch (error: any) {
      toast.error(error.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-[#1a1a2e] border border-purple-900/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-bold text-purple-400">USER CONTROL</h3>
        </div>

        {/* Stats Row */}
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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="bg-indigo-950/30 border-indigo-700 text-indigo-400 hover:bg-indigo-900/50"
            onClick={() => setModalOpen('search')}
          >
            <Search className="h-4 w-4 mr-2" />
            Search Users
          </Button>
          <Button
            variant="outline"
            className="bg-blue-950/30 border-blue-700 text-blue-400 hover:bg-blue-900/50"
            onClick={() => setModalOpen('role')}
          >
            <Shield className="h-4 w-4 mr-2" />
            Manage Roles
          </Button>
          <Button
            variant="outline"
            className="bg-red-950/30 border-red-700 text-red-400 hover:bg-red-900/50"
            onClick={() => setModalOpen('freeze')}
          >
            <UserX className="h-4 w-4 mr-2" />
            Freeze Account
          </Button>
          <Button
            variant="outline"
            className="bg-green-950/30 border-green-700 text-green-400 hover:bg-green-900/50"
            onClick={() => setModalOpen('verify')}
          >
            <BadgeCheck className="h-4 w-4 mr-2" />
            Toggle Verify
          </Button>
        </div>
      </div>

      {/* Search Modal */}
      <Dialog open={modalOpen === 'search'} onOpenChange={() => { setModalOpen(null); setSearchResults([]); }}>
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
                value={formData.search_query}
                onChange={(e) => setFormData({ ...formData, search_query: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white flex-1"
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              />
              <Button onClick={searchUsers} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="bg-[#0f0f1a] p-3 rounded-lg border border-gray-800 flex items-center justify-between cursor-pointer hover:border-indigo-600"
                  onClick={() => {
                    setSelectedUser(user);
                    setFormData({ ...formData, user_id: user.user_id });
                  }}
                >
                  <div>
                    <div className="text-white font-medium">{user.display_name || user.username || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{user.user_id}</div>
                    <div className="text-xs text-gray-400">
                      Roles: {user.roles?.join(', ') || 'none'} | BB: {user.barber_bucks || 0}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {user.is_verified && <BadgeCheck className="h-4 w-4 text-blue-400" />}
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && formData.search_query && !loading && (
                <div className="text-gray-500 text-center py-4">No users found</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Roles Modal */}
      <Dialog open={modalOpen === 'role'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-blue-900/50">
          <DialogHeader>
            <DialogTitle className="text-blue-400 flex items-center gap-2">
              <Shield className="h-5 w-5" /> Manage Roles
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Assign or remove roles from a user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">User ID</Label>
              <Input
                placeholder="UUID of user"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Action</Label>
              <Select
                value={formData.action_type}
                onValueChange={(value) => setFormData({ ...formData, action_type: value })}
              >
                <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-gray-700">
                  <SelectItem value="assign">Assign Role</SelectItem>
                  <SelectItem value="remove">Remove Role</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="bg-[#0f0f1a] border-gray-700 text-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-gray-700">
                  <SelectItem value="fan">Fan</SelectItem>
                  <SelectItem value="barber">Barber</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading || !formData.user_id || !formData.role}
              onClick={() => executeAction(formData.action_type === 'assign' ? 'assign_role' : 'remove_role', {
                user_id: formData.user_id,
                role: formData.role,
                reason: formData.reason
              })}
            >
              {loading ? 'Processing...' : formData.action_type === 'assign' ? 'Assign Role' : 'Remove Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freeze Account Modal */}
      <Dialog open={modalOpen === 'freeze'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-red-900/50">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <UserX className="h-5 w-5" /> Freeze/Unfreeze Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">User ID</Label>
              <Input
                placeholder="UUID of user"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Reason</Label>
              <Textarea
                placeholder="Reason for action"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={loading || !formData.user_id}
              onClick={() => executeAction('unfreeze_account', { user_id: formData.user_id, reason: formData.reason })}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Unfreeze
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={loading || !formData.user_id}
              onClick={() => executeAction('freeze_account', { user_id: formData.user_id, reason: formData.reason })}
            >
              <UserX className="h-4 w-4 mr-2" />
              Freeze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Verification Modal */}
      <Dialog open={modalOpen === 'verify'} onOpenChange={() => setModalOpen(null)}>
        <DialogContent className="bg-[#1a1a2e] border-green-900/50">
          <DialogHeader>
            <DialogTitle className="text-green-400 flex items-center gap-2">
              <BadgeCheck className="h-5 w-5" /> Toggle Verification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">User ID</Label>
              <Input
                placeholder="UUID of user"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Reason</Label>
              <Textarea
                placeholder="Reason for action"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={loading || !formData.user_id}
              onClick={() => executeAction('remove_verify', { user_id: formData.user_id, reason: formData.reason })}
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Remove
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={loading || !formData.user_id}
              onClick={() => executeAction('force_verify', { user_id: formData.user_id, reason: formData.reason })}
            >
              <BadgeCheck className="h-4 w-4 mr-2" />
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserControlPanel;
