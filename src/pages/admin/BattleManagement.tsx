import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Calendar, Users } from "lucide-react";
import { toast } from "sonner";

export default function BattleManagement() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: battles, refetch } = useQuery({
    queryKey: ['admin-battles', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('battles')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: battlesData, error } = await query.limit(50);
      if (error) throw error;

      // Fetch user details separately
      const userIds = new Set<string>();
      battlesData?.forEach(b => {
        if (b.organizer_id) userIds.add(b.organizer_id);
        if (b.barber1_id) userIds.add(b.barber1_id);
        if (b.barber2_id) userIds.add(b.barber2_id);
      });

      const { data: users } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', Array.from(userIds));

      return battlesData?.map(battle => ({
        ...battle,
        organizer_name: users?.find(u => u.user_id === battle.organizer_id)?.display_name,
        barber1_name: users?.find(u => u.user_id === battle.barber1_id)?.display_name,
        barber2_name: users?.find(u => u.user_id === battle.barber2_id)?.display_name
      }));
    }
  });

  const handleStatusChange = async (battleId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('battles')
        .update({ status: newStatus })
        .eq('id', battleId);

      if (error) throw error;
      toast.success(`Battle status updated to ${newStatus}`);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to update battle status");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'upcoming': 'bg-blue-500',
      'active': 'bg-green-500',
      'voting': 'bg-purple-500',
      'completed': 'bg-gray-500',
      'cancelled': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Battle Management</h1>
          <p className="text-muted-foreground">Monitor and control all battles</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'upcoming' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('upcoming')}
            >
              Upcoming
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === 'voting' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('voting')}
            >
              Voting
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('completed')}
            >
              Completed
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Battles Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Prize</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {battles?.map((battle) => (
                <TableRow key={battle.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <div>
                        <div className="font-medium">{battle.title}</div>
                        {battle.category && (
                          <div className="text-xs text-muted-foreground">
                            {battle.category}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {battle.organizer_name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {[battle.barber1_name, battle.barber2_name]
                          .filter(Boolean)
                          .length}
                        {battle.max_participants ? ` / ${battle.max_participants}` : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono">
                      {battle.prize_amount} {battle.currency}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(battle.status)}>
                      {battle.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(battle.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={battle.status}
                      onValueChange={(value) => handleStatusChange(battle.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="voting">Voting</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(!battles || battles.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No battles found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}