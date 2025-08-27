import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, DollarSign, CheckCircle } from "lucide-react";

const grants = [
  {
    id: 1,
    title: "Small Business Equipment Grant",
    category: "Equipment",
    amount: "$5,000",
    description: "Fund new equipment purchases for your barber shop including chairs, tools, and styling equipment.",
    eligibility: ["Licensed barber", "Shop owner", "1+ years experience"],
    deadline: "March 15, 2024",
    location: "Nationwide",
    featured: true
  },
  {
    id: 2,
    title: "Community Outreach Initiative",
    category: "Community",
    amount: "$2,500",
    description: "Support community service projects and free haircut programs for underserved populations.",
    eligibility: ["Active community involvement", "Verified barber", "Local recommendations"],
    deadline: "April 1, 2024",
    location: "Local communities",
    featured: false
  },
  {
    id: 3,
    title: "Professional Development Fund",
    category: "Education",
    amount: "$3,000",
    description: "Advance your skills with educational courses, workshops, and certification programs.",
    eligibility: ["2+ years experience", "Portfolio submission", "Skills assessment"],
    deadline: "March 30, 2024",
    location: "Online & In-person",
    featured: false
  },
  {
    id: 4,
    title: "Youth Mentorship Program",
    category: "Mentorship",
    amount: "$4,000",
    description: "Train the next generation of barbers through structured mentorship and apprenticeship programs.",
    eligibility: ["Master barber status", "Teaching experience", "Background check"],
    deadline: "April 15, 2024",
    location: "Regional",
    featured: true
  }
];

const GrantsSection = () => {
  return (
    <section id="grants" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-gradient">Barber Grants</span> Available
          </h2>
          <p className="text-xl text-muted-foreground">
            Unlock funding opportunities to grow your business, enhance your skills, 
            and give back to your community. Over $50K in grants available.
          </p>
        </div>

        {/* Grants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {grants.map((grant) => (
            <Card 
              key={grant.id} 
              className={`card-gradient relative overflow-hidden ${
                grant.featured ? 'ring-2 ring-primary/50' : ''
              }`}
            >
              {grant.featured && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-success text-success-foreground">
                    Featured
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2 text-primary border-primary">
                      {grant.category}
                    </Badge>
                    <CardTitle className="text-xl font-bold mb-2">
                      {grant.title}
                    </CardTitle>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-2xl font-bold text-primary">
                  <DollarSign className="w-6 h-6" />
                  <span>{grant.amount}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  {grant.description}
                </p>

                {/* Grant Details */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Deadline:</span>
                    <span className="font-medium">{grant.deadline}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">{grant.location}</span>
                  </div>
                </div>

                {/* Eligibility Requirements */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Eligibility Requirements</span>
                  </h4>
                  <ul className="space-y-2">
                    {grant.eligibility.map((requirement, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <span className="text-muted-foreground">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <Button className="w-full btn-primary">
                  Start 60-Second Check
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">
              Don't See What You're Looking For?
            </h3>
            <p className="text-muted-foreground mb-6">
              New grants are added regularly. Get notified when grants matching your profile become available.
            </p>
            <Button className="btn-primary">
              Set Grant Alerts
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GrantsSection;