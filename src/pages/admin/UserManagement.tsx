import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarberBucksAwardModal } from "@/components/admin/BarberBucksAwardModal";
import { Search, DollarSign, Shield, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [showAwardModal, setShowAwardModal] = useState(false);

  const { data: users, refetch } = useQuery({
    queryKey: ['admin-users', searchTerm, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          user_id,
          display_name,
          username,
          avatar_url,
          user_type,
          barber_bucks,
          is_verified_by_competition,
          three_x_vote_expires_at,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`display_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`);
      }

      if (roleFilter !== 'all') {
        query = query.eq('user_type', roleFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('admin-toggle-verification', {
        body: {
          user_id: userId,
          verified: !currentStatus,
          grant_3x_vote: !currentStatus
        }
      });

      if (error) throw error;
      toast.success(`User ${!currentStatus ? 'verified' : 'unverified'} successfully`);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to update verification");
    }
  };

  const handleAwardBB = (userId: string) => {
    setSelectedUserId(userId);
    setShowAwardModal(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage all platform users</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={roleFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setRoleFilter('all')}
            >
              All
            </Button>
            <Button
              variant={roleFilter === 'barber' ? 'default' : 'outline'}
              onClick={() => setRoleFilter('barber')}
            >
              Barbers
            </Button>
            <Button
              variant={roleFilter === 'fan' ? 'default' : 'outline'}
              onClick={() => setRoleFilter('fan')}
            >
              Fans
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Barber Bucks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.avatar_url && (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <div className="font-medium">
                          {user.display_name || user.username || 'Anonymous'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.username}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {user.user_type || 'fan'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono">
                      {user.barber_bucks || 0} BB
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_verified_by_competition ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="w-3 h-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAwardBB(user.user_id)}
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Award BB
                      </Button>
                      <Button
                        size="sm"
                        variant={user.is_verified_by_competition ? "destructive" : "default"}
                        onClick={() => handleToggleVerification(user.user_id, user.is_verified_by_competition || false)}
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        {user.is_verified_by_competition ? 'Unverify' : 'Verify'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(!users || users.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          )}
        </CardContent>
      </Card>

      <BarberBucksAwardModal
        open={showAwardModal}
        onOpenChange={(open) => {
          setShowAwardModal(open);
          if (!open) {
            setSelectedUserId(undefined);
            refetch();
          }
        }}
        preselectedUserId={selectedUserId}
      />
    </div>
  );
}