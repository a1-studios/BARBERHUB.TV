import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Trophy, Medal, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PrizePoolCardProps {
  totalPrize: number;
  currency?: string;
  distribution?: {
    first: number;
    second: number;
    third: number;
    [key: string]: number;
  };
}

export const PrizePoolCard = ({ 
  totalPrize, 
  currency = "USD",
  distribution 
}: PrizePoolCardProps) => {
  const formatAmount = (cents: number) => {
    return `$${(cents / 100).toLocaleString()}`;
  };

  const defaultDistribution = {
    first: Math.floor(totalPrize * 0.5),
    second: Math.floor(totalPrize * 0.3),
    third: Math.floor(totalPrize * 0.2),
  };

  const prizes = distribution || defaultDistribution;

  return (
    <Card className="bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 border-yellow-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-yellow-500" />
              Prize Pool
            </CardTitle>
            <CardDescription>Tournament rewards</CardDescription>
          </div>
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
            {currency}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Prize */}
        <div className="text-center p-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
          <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
            {formatAmount(totalPrize)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">Total Prize Pool</p>
        </div>

        {/* Prize Distribution */}
        <div className="space-y-3">
          {/* 1st Place */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 rounded-lg border border-yellow-500/20">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <div>
                <p className="font-semibold">1st Place</p>
                <p className="text-xs text-muted-foreground">Champion</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {formatAmount(prizes.first)}
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.round((prizes.first / totalPrize) * 100)}%
              </p>
            </div>
          </div>

          {/* 2nd Place */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-400/10 to-gray-400/5 rounded-lg border border-gray-400/20">
            <div className="flex items-center gap-3">
              <Medal className="h-6 w-6 text-gray-400" />
              <div>
                <p className="font-semibold">2nd Place</p>
                <p className="text-xs text-muted-foreground">Runner-up</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-600 dark:text-gray-400">
                {formatAmount(prizes.second)}
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.round((prizes.second / totalPrize) * 100)}%
              </p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-700/10 to-orange-700/5 rounded-lg border border-orange-700/20">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-orange-700 dark:text-orange-400" />
              <div>
                <p className="font-semibold">3rd Place</p>
                <p className="text-xs text-muted-foreground">Third place</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-orange-700 dark:text-orange-400">
                {formatAmount(prizes.third)}
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.round((prizes.third / totalPrize) * 100)}%
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          Prize distribution is final upon tournament completion
        </div>
      </CardContent>
    </Card>
  );
};