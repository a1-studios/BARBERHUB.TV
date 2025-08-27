import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Clock, Vote } from "lucide-react";

const battles = [
  {
    id: 1,
    title: "Best Fade Competition",
    description: "Show us your cleanest fade technique and compete for the monthly crown",
    status: "active",
    participants: 24,
    timeLeft: "3 days left",
    prize: "$500",
    category: "Technical Skills"
  },
  {
    id: 2,
    title: "Creative Color Challenge",
    description: "Push the boundaries with innovative color combinations and artistic flair",
    status: "upcoming",
    participants: 18,
    timeLeft: "Starting soon",
    prize: "$750",
    category: "Creativity"
  },
  {
    id: 3,
    title: "Speed Cut Championship",
    description: "Precision meets speed in this ultimate barber showdown",
    status: "voting",
    participants: 32,
    timeLeft: "Voting ends in 2 days",
    prize: "$1000",
    category: "Speed & Precision"
  }
];

const BattlesSection = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "upcoming": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "voting": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <Trophy className="w-4 h-4" />;
      case "upcoming": return <Clock className="w-4 h-4" />;
      case "voting": return <Vote className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <section id="battles" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">BARBER </span>
            <span className="text-primary">BATTLES</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Compete with the best barbers worldwide. Show your skills, win prizes, and earn legendary status.
          </p>
        </div>

        {/* Battles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {battles.map((battle) => (
            <Card key={battle.id} className="border border-border/50 shadow-lg backdrop-blur-sm bg-card/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(24_100%_52%/0.5),inset_0_0_20px_hsl(24_100%_52%/0.15)] hover:border-primary/30" style={{ borderRadius: '1.5rem' }}>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className={`${getStatusColor(battle.status)} flex items-center gap-1`}>
                    {getStatusIcon(battle.status)}
                    {battle.status.charAt(0).toUpperCase() + battle.status.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="text-primary border-primary/30">
                    {battle.category}
                  </Badge>
                </div>
                <CardTitle className="text-white">{battle.title}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {battle.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    {battle.participants} participants
                  </div>
                  <div className="text-primary font-semibold">
                    {battle.prize}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {battle.timeLeft}
                </div>
                <Button 
                  className="w-full"
                  variant={battle.status === "voting" ? "outline" : "default"}
                >
                  {battle.status === "active" && "Enter Battle"}
                  {battle.status === "upcoming" && "Join Waitlist"}
                  {battle.status === "voting" && "Vote Now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="p-8 border border-border/50 shadow-lg backdrop-blur-sm bg-card/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(24_100%_52%/0.5),inset_0_0_20px_hsl(24_100%_52%/0.15)] hover:border-primary/30" style={{ borderRadius: '1.5rem' }}>
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Join the Battle?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Create your profile, showcase your skills, and compete with barbers from around the world. 
              Every battle is a chance to prove you're among the legends.
            </p>
            <Button size="lg" className="text-lg px-8">
              Start Your Journey
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default BattlesSection;