import { useNavigate } from 'react-router-dom';
import { DollarSign, Gift } from "lucide-react";

const GrantsSection = () => {
  const navigate = useNavigate();

  return (
    <section id="grants" className="py-20 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <button 
          onClick={() => navigate('/grants')}
          className="w-full bg-background/95 backdrop-blur border-2 border-primary/30 rounded-xl p-8 hover:border-primary/50 transition-all duration-300 shadow-[0_0_30px_rgba(255,107,5,0.3)] hover:shadow-[0_0_50px_rgba(255,107,5,0.5)]"
        >
          <div className="flex items-center justify-center gap-3">
            <Gift className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold">
              <span className="text-white">BARBER</span>
              <span className="text-primary">-GRANTS</span>
            </span>
          </div>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            Unlock funding opportunities to grow your business, enhance your skills, and give back to your community. Over $50K in grants available.
          </p>
          <div className="flex items-center justify-center space-x-2 text-xl font-bold text-primary mt-6">
            <DollarSign className="w-6 h-6" />
            <span>Up to $50,000 Available</span>
          </div>
        </button>
      </div>
    </section>
  );
};

export default GrantsSection;