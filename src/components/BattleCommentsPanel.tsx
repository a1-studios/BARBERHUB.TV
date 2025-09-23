import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Users, TrendingUp, Crown } from "lucide-react";

interface BattleVote {
  id: string;
  voter_id: string;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url?: string;
    country_code?: string;
    user_type: string;
  };
}

interface LeaderboardUser {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  country_code?: string;
  vote_count: number;
  user_type: string;
}

interface BattleCommentsPanelProps {
  battleId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export const BattleCommentsPanel = ({ battleId, isOpen, onToggle }: BattleCommentsPanelProps) => {
  const [activeTab, setActiveTab] = useState<'votes' | 'leaderboard'>('votes');

  // Fetch recent votes
  const { data: recentVotes, isLoading: votesLoading } = useQuery({
    queryKey: ['battleVotes', battleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battle_votes')
        .select(`
          id,
          voter_id,
          created_at,
          profiles!inner(display_name, avatar_url, country_code, user_type)
        `)
        .eq('battle_id', battleId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as BattleVote[];
    },
    refetchInterval: 3000 // Refresh every 3 seconds
  });

  // Fetch leaderboard data
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['battleLeaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          display_name,
          avatar_url,
          country_code,
          user_type
        `)
        .eq('user_type', 'barber')
        .limit(10);

      if (error) throw error;
      return data.map(user => ({
        ...user,
        vote_count: Math.floor(Math.random() * 100) // Mock vote count for demo
      })) as LeaderboardUser[];
    }
  });

  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return "🌍";
    return countryCode.toUpperCase().replace(/./g, char => 
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'barber':
        return <Crown className="w-3 h-3 text-yellow-500" />;
      default:
        return <Users className="w-3 h-3 text-blue-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className={`relative transition-all duration-300 ease-in-out ${isOpen ? 'w-80' : 'w-12'} bg-card border-l border-border h-screen`}>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="absolute -left-6 top-1/2 transform -translate-y-1/2 z-10 bg-card border border-border rounded-full w-12 h-12 p-0"
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </Button>

      {/* Panel Content */}
      {isOpen && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Live Activity</h3>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setActiveTab('votes')}
                className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-colors ${
                  activeTab === 'votes' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Recent Votes
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-colors ${
                  activeTab === 'leaderboard' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Leaderboard
              </button>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            {activeTab === 'votes' && (
              <div className="p-4 space-y-3">
                {votesLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                        <div className="flex-1 space-y-1">
                          <div className="w-20 h-3 bg-muted rounded animate-pulse" />
                          <div className="w-16 h-2 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentVotes?.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No votes yet</p>
                    <p className="text-xs mt-1">Be the first to vote!</p>
                  </div>
                ) : (
                  recentVotes?.map((vote) => (
                    <div key={vote.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={vote.profiles.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {vote.profiles.display_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm font-medium truncate">
                            {vote.profiles.display_name}
                          </span>
                          {getUserTypeIcon(vote.profiles.user_type)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{getCountryFlag(vote.profiles.country_code)}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(vote.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="p-4 space-y-2">
                {leaderboardLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <div className="w-6 h-4 bg-muted rounded animate-pulse" />
                        <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                        <div className="flex-1 space-y-1">
                          <div className="w-20 h-3 bg-muted rounded animate-pulse" />
                          <div className="w-16 h-2 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  leaderboard?.map((user, index) => (
                    <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="w-6 text-center">
                        <span className={`text-sm font-bold ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          index === 2 ? 'text-amber-600' :
                          'text-muted-foreground'
                        }`}>
                          #{index + 1}
                        </span>
                      </div>
                      
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {user.display_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm font-medium truncate">
                            {user.display_name}
                          </span>
                          {index < 3 && <Crown className="w-3 h-3 text-yellow-500" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{getCountryFlag(user.country_code)}</span>
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {user.vote_count} votes
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">
                Live updates every 3 seconds
              </p>
              <div className="flex items-center justify-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-600 font-medium">Live</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};