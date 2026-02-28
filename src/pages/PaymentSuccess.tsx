import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Trophy, ArrowRight, Coins, Wallet, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  const sessionId = searchParams.get('session_id');
  const paymentType = searchParams.get('type');

  const [bbVerifying, setBbVerifying] = useState(false);
  const [bbResult, setBbResult] = useState<{ bb_credited: number; new_balance: number } | null>(null);
  const [bbError, setBbError] = useState<string | null>(null);
  const hasTriggeredVerify = useRef(false);

  // Wait for auth to restore before verifying BB purchase
  useEffect(() => {
    if (!sessionId) return;

    if (paymentType === 'bb') {
      // Wait until auth is done loading
      if (authLoading) return;
      // Prevent double-trigger
      if (hasTriggeredVerify.current) return;
      hasTriggeredVerify.current = true;
      verifyBbPurchase();
    } else {
      if (authLoading) return;
      verifyTournament();
    }
  }, [sessionId, paymentType, authLoading, user]);

  const verifyBbPurchase = async (retryCount = 0) => {
    setBbVerifying(true);
    setBbError(null);

    // Wait before first attempt — Stripe redirects before payment fully processes
    const delayMs = retryCount === 0 ? 3000 : 4000;
    await new Promise(r => setTimeout(r, delayMs));

    try {
      const { data, error } = await supabase.functions.invoke('verify-bb-purchase', {
        body: { session_id: sessionId }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Verification failed');

      setBbResult({ bb_credited: data.bb_credited, new_balance: data.new_balance });

      // Clear pending purchase from localStorage
      try { localStorage.removeItem('pending_bb_purchase'); } catch {}

      // Refresh BB balance everywhere
      queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
      queryClient.invalidateQueries({ queryKey: ['barber-bucks'] });
      queryClient.invalidateQueries({ queryKey: ['barber_bucks_transactions'] });

      toast({
        title: "Barber Bucks Added!",
        description: `+${data.bb_credited} BB credited to your account`,
      });
    } catch (err: any) {
      console.error("BB verification error:", err);
      // Retry up to 5 times with increasing delay (Stripe may take time to process)
      if (retryCount < 5) {
        console.log(`[verify-bb] Retrying in ${delayMs / 1000}s (attempt ${retryCount + 1}/5)...`);
        return verifyBbPurchase(retryCount + 1);
      }
      setBbError(err.message || "Verification failed. Your balance may update shortly.");
    } finally {
      setBbVerifying(false);
    }
  };

  const verifyTournament = async () => {
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

  // Barber Bucks success content
  if (paymentType === 'bb') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-20 sm:pt-24 pb-12">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <Card className="text-center">
                <CardHeader className="pb-8">
                  {bbVerifying ? (
                    <>
                      <div className="mx-auto mb-6">
                        <Loader2 className="h-16 w-16 text-primary animate-spin" />
                      </div>
                      <CardTitle className="text-3xl font-bold text-foreground mb-2">
                        Verifying Purchase...
                      </CardTitle>
                      <CardDescription className="text-lg">
                        Confirming your payment with Stripe
                      </CardDescription>
                    </>
                  ) : bbError ? (
                    <>
                      <div className="mx-auto mb-6">
                        <AlertCircle className="h-16 w-16 text-destructive" />
                      </div>
                      <CardTitle className="text-3xl font-bold text-foreground mb-2">
                        Verification Issue
                      </CardTitle>
                      <CardDescription className="text-lg text-destructive">
                        {bbError}
                      </CardDescription>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto mb-6">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                      </div>
                      <CardTitle className="text-3xl font-bold text-foreground mb-2">
                        Barber Bucks Added!
                      </CardTitle>
                      <CardDescription className="text-lg">
                        Your purchase is complete
                      </CardDescription>
                    </>
                  )}
                </CardHeader>

                <CardContent className="space-y-6">
                  {bbResult && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-lg">
                      <div className="flex items-center justify-center mb-4">
                        <Coins className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">
                        +{bbResult.bb_credited} BB Credited
                      </h3>
                      <p className="text-2xl font-bold text-primary">
                        New Balance: {bbResult.new_balance.toLocaleString()} BB
                      </p>
                    </div>
                  )}

                  {bbError && (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        Your payment was received. If your balance doesn't update within a few minutes, please contact support.
                      </p>
                      <Button onClick={() => verifyBbPurchase()} variant="outline">
                        Retry Verification
                      </Button>
                    </div>
                  )}

                  {!bbVerifying && (
                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                      <Button
                        onClick={() => navigate('/profile')}
                        size="lg"
                        className="flex-1"
                      >
                        <Wallet className="mr-2 h-4 w-4" />
                        View Profile
                      </Button>
                      <Button
                        onClick={() => navigate('/')}
                        variant="outline"
                        size="lg"
                        className="flex-1"
                      >
                        Back to Home
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}

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
  }

  // Tournament success content
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
                    {[
                      "Check the portal for your match schedule and bracket position",
                      "Prepare for live battles every Sunday from 10:00 AM - 6:00 PM",
                      "Create battles and compete to advance in the tournament",
                    ].map((text, i) => (
                      <div key={i} className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </div>
                        <p className="text-muted-foreground">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button onClick={() => navigate('/portal')} size="lg" className="flex-1">
                    Go to Portal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button onClick={() => navigate('/battles')} variant="outline" size="lg" className="flex-1">
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
