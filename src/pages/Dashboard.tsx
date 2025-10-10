import { GlobalLeagueDashboard } from '@/components/GlobalLeagueDashboard';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Dashboard() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <GlobalLeagueDashboard />
      </main>
      <Footer />
    </div>
  );
}
