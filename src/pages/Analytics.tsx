import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { BattleStatsCard } from '@/components/analytics/BattleStatsCard';
import { EarningsChart } from '@/components/analytics/EarningsChart';
import { TransactionHistory } from '@/components/analytics/TransactionHistory';
import { PerformanceMetrics } from '@/components/analytics/PerformanceMetrics';
import { Navigate } from 'react-router-dom';
import Header from '@/components/Header';

const Analytics = () => {
  const { user } = useAuth();
  const { isBarber } = useUserRole();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isBarber) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track your performance and earnings</p>
        </div>

        <div className="space-y-6">
          <BattleStatsCard />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EarningsChart />
            <PerformanceMetrics />
          </div>

          <TransactionHistory />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
