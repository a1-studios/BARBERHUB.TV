import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Trophy, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) return;
      
      try {
        const { data, error } = await supabase.functions.invoke("verify-tournament-payment", {
          body: { session_id: sessionId }
        });

        if (error) {
          console.error("Payment verification error:", error);
          toast({
            title: "Verification Issue",
            description: "Payment received but verification pending. Check your queue status.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Payment Successful!",
            description: "You've been added to the tournament queue!",
          });
        }
      } catch (err) {
        console.error("Payment verification failed:", err);
      }
    };

    verifyPayment();
  }, [sessionId, toast]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 sm:pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center">
              <CardHeader className="pb-8">
                <div className="mx-auto mb-6">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-3xl font-bold text-foreground mb-2">
                  Payment Successful!
                </CardTitle>
                <CardDescription className="text-lg">
                  Welcome to the Barber Battle Tournament
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-green-50 dark:bg-green-950/20 p-6 rounded-lg">
                  <div className="flex items-center justify-center mb-4">
                    <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Tournament Entry Confirmed</h3>
                  <p className="text-muted-foreground">
                    Your $50 entry fee has been processed. You're now eligible to participate 
                    in the year-round single-elimination tournament.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">What's Next?</h4>
                  <div className="text-left space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <p className="text-muted-foreground">
                        Check the portal for your match schedule and bracket position
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <p className="text-muted-foreground">
                        Prepare for live battles every Sunday from 10:00 AM - 6:00 PM
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <p className="text-muted-foreground">
                        Create battles and compete to advance in the tournament
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button 
                    onClick={() => navigate('/portal')}
                    size="lg"
                    className="flex-1"
                  >
                    Go to Portal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => navigate('/battles')}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                  >
                    View All Battles
                  </Button>
                </div>

                {sessionId && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Payment ID: {sessionId.substring(0, 20)}...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;