import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";

const PaymentCanceled = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 sm:pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center">
              <CardHeader className="pb-8">
                <div className="mx-auto mb-6">
                  <XCircle className="h-16 w-16 text-orange-500" />
                </div>
                <CardTitle className="text-3xl font-bold text-foreground mb-2">
                  Payment Canceled
                </CardTitle>
                <CardDescription className="text-lg">
                  Your tournament entry was not processed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-orange-50 dark:bg-orange-950/20 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2">No Charges Applied</h3>
                  <p className="text-muted-foreground">
                    Your payment was canceled and no charges were made to your account. 
                    You can try again anytime to join the tournament.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">Want to Join the Tournament?</h4>
                  <p className="text-muted-foreground">
                    The Barber Battle Tournament entry fee is $50. This gives you access to:
                  </p>
                  <div className="text-left space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <p className="text-sm text-muted-foreground">Year-round tournament participation</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <p className="text-sm text-muted-foreground">Live battles every Sunday</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <p className="text-sm text-muted-foreground">Single-elimination bracket competition</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <p className="text-sm text-muted-foreground">Prize opportunities and recognition</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button 
                    onClick={() => navigate('/portal')}
                    size="lg"
                    className="flex-1"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => navigate('/')}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentCanceled;