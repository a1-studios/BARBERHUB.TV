import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Scissors, Eye, Vote, Trophy, Play, DollarSign, 
  Users, ArrowRight, Sparkles, Calendar, Globe 
} from "lucide-react";
import { motion } from "framer-motion";

export const HowItWorks = () => {
  const { isBarber, isLoading } = useUserRole();
  const navigate = useNavigate();

  if (isLoading) return null;

  const barberFlow = [
    {
      icon: Calendar,
      title: "Register for Battles",
      description: "Choose your category, pay entry fee, and get matched with an opponent",
      color: "from-orange-500/20 to-orange-600/10",
      iconColor: "text-orange-500",
    },
    {
      icon: Play,
      title: "Go Live on Battle Day",
      description: "Stream your 1-hour haircut live from your shop every Sunday",
      color: "from-cyan-500/20 to-cyan-600/10",
      iconColor: "text-cyan-500",
    },
    {
      icon: Trophy,
      title: "Win & Climb Rankings",
      description: "Earn points, collect Barber Bucks, and qualify for the Grand Final",
      color: "from-yellow-500/20 to-yellow-600/10",
      iconColor: "text-yellow-500",
    },
  ];

  const fanFlow = [
    {
      icon: Eye,
      title: "Watch Live Battles",
      description: "View split-screen competitions between top barbers worldwide",
      color: "from-orange-500/20 to-orange-600/10",
      iconColor: "text-orange-500",
    },
    {
      icon: Vote,
      title: "Vote for Winners",
      description: "Cast your vote after battles end and influence who wins",
      color: "from-cyan-500/20 to-cyan-600/10",
      iconColor: "text-cyan-500",
    },
    {
      icon: DollarSign,
      title: "Support Barbers",
      description: "Donate Barber Bucks, react, and chat during live streams",
      color: "from-green-500/20 to-green-600/10",
      iconColor: "text-green-500",
    },
  ];

  const steps = isBarber ? barberFlow : fanFlow;

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {isBarber ? "Barber Guide" : "Fan Guide"}
            </span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold text-foreground mb-3"
          >
            How It Works
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-2xl mx-auto"
          >
            {isBarber 
              ? "Compete from your shop, build your brand, and win prizes in the 2026 Global Championship."
              : "Watch barbers battle live, vote for your favorites, and support the community."
            }
          </motion.p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
            >
              <Card className={`relative p-6 h-full bg-gradient-to-br ${step.color} border-border/50 hover:border-primary/30 transition-all duration-300`}>
                {/* Step Number */}
                <div className="absolute top-4 right-4 text-4xl font-bold text-muted-foreground/20">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className={`h-12 w-12 rounded-xl bg-background/80 border border-border/50 flex items-center justify-center mb-4`}>
                  <step.icon className={`h-6 w-6 ${step.iconColor}`} />
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>

                {/* Arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <div className="h-6 w-6 rounded-full bg-muted border border-border flex items-center justify-center">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          {isBarber ? (
            <Button 
              size="lg"
              onClick={() => navigate("/portal")}
              className="bg-primary hover:bg-primary/90"
            >
              <Scissors className="mr-2 h-5 w-5" />
              Enter Battle Portal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              <Button 
                size="lg"
                onClick={() => navigate("/battles")}
                className="bg-primary hover:bg-primary/90"
              >
                <Eye className="mr-2 h-5 w-5" />
                Watch Battles
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate("/barbers")}
              >
                <Users className="mr-2 h-5 w-5" />
                Find Barbers
              </Button>
            </div>
          )}
        </motion.div>

        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-12 grid grid-cols-3 gap-4 p-6 rounded-2xl bg-muted/30 border border-border/50"
        >
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">50+</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Countries</div>
          </div>
          <div className="text-center border-x border-border/50">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">5</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Categories</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-primary">2026</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Championship</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
