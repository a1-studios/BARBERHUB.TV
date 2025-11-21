import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { BarberBucksAwardModal } from "@/components/admin/BarberBucksAwardModal";
import { Users, Trophy, DollarSign, Zap, Award, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [showAwardModal, setShowAwardModal] = useState(false);

  // Fetch platform stats
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: totalBarbers },
        { count: totalFans },
        { count: totalBattles },
        { count: activeBattles },
        { count: votingBattles },
        { data: bbData }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'barber'),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'fan'),
        supabase.from('battles').select('*', { count: 'exact', head: true }),
        supabase.from('battles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('battles').select('*', { count: 'exact', head: true }).eq('status', 'voting'),
        supabase.from('profiles').select('barber_bucks').not('barber_bucks', 'is', null)
      ]);

      const totalBB = bbData?.reduce((sum, p) => sum + (p.barber_bucks || 0), 0) || 0;

      return {
        totalUsers: totalUsers || 0,
        totalBarbers: totalBarbers || 0,
        totalFans: totalFans || 0,
        totalBattles: totalBattles || 0,
        activeBattles: activeBattles || 0,
        votingBattles: votingBattles || 0,
        totalBB
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('admin_action_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch admin names separately
      const adminIds = [...new Set(logs?.map(l => l.admin_id))];
      const { data: admins } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', adminIds);

      return logs?.map(log => ({
        ...log,
        admin_name: admins?.find(a => a.user_id === log.admin_id)?.display_name
      }));
    }
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage your platform</p>
        </div>
        <Button onClick={() => setShowAwardModal(true)}>
          <DollarSign className="w-4 h-4 mr-2" />
          Award Barber Bucks
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AdminStatsCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          description={`${stats?.totalBarbers || 0} barbers, ${stats?.totalFans || 0} fans`}
          icon={Users}
        />
        <AdminStatsCard
          title="Total Battles"
          value={stats?.totalBattles || 0}
          description={`${stats?.activeBattles || 0} active, ${stats?.votingBattles || 0} voting`}
          icon={Trophy}
        />
        <AdminStatsCard
          title="Barber Bucks in Circulation"
          value={`${stats?.totalBB || 0} BB`}
          description="Total platform currency"
          icon={DollarSign}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" onClick={() => navigate('/admin/users')} className="justify-start">
            <Users className="w-4 h-4 mr-2" />
            Manage Users
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/battles')} className="justify-start">
            <Trophy className="w-4 h-4 mr-2" />
            Manage Battles
          </Button>
          <Button variant="outline" onClick={() => setShowAwardModal(true)} className="justify-start">
            <Award className="w-4 h-4 mr-2" />
            Award BB
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/analytics')} className="justify-start">
            <TrendingUp className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-sm font-medium">
                        {activity.action_type.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        by {activity.admin_name || 'Admin'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>

      <BarberBucksAwardModal
        open={showAwardModal}
        onOpenChange={setShowAwardModal}
      />
    </div>
  );
}