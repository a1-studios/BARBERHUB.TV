import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <BackButton fallbackPath="/" />
        <Card className="text-center">
          <CardContent className="p-8">
            <AlertTriangle className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
            <h1 className="text-4xl font-bold mb-4 text-white">404</h1>
            <p className="text-xl text-muted-foreground mb-6">
              Oops! This page doesn't exist
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              The page you're looking for might have been moved or deleted.
            </p>
            <Button asChild className="w-full">
              <Link to="/battles">
                <Home className="h-4 w-4 mr-2" />
                Go to Battles
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
