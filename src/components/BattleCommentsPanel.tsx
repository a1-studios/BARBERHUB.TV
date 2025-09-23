import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Users, Trophy, Crown, Medal, Award } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface BattleCommentsPanelProps {
  battleId: string;
  onToggle: () => void;
  isMobile?: boolean;
}

interface LeaderboardUser {
  id: string;
  display_name: string;
  avatar_url?: string;
  country_code?: string;
  votes_cast: number;
  rank: number;
}

interface LiveComment {
  id: string;
  user_name: string;
  user_avatar?: string;
  country_code?: string;
  message: string;
  timestamp: string;
}

export const BattleCommentsPanel = ({ battleId, onToggle, isMobile = false }: BattleCommentsPanelProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'comments'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [liveViewers, setLiveViewers] = useState(1247);

  useEffect(() => {
    // Fetch leaderboard data
    fetchLeaderboard();
    
    // Simulate live comments and viewer updates
    const commentsInterval = setInterval(() => {
      addRandomComment();
    }, 3000);

    const viewersInterval = setInterval(() => {
      setLiveViewers(prev => prev + Math.floor(Math.random() * 10) - 5);
    }, 5000);

    return () => {
      clearInterval(commentsInterval);
      clearInterval(viewersInterval);
    };
  }, [battleId]);

  const fetchLeaderboard = async () => {
    // Mock leaderboard data - in production this would query the database
    const mockLeaderboard: LeaderboardUser[] = [
      { id: '1', display_name: 'CutMaster_Pro', avatar_url: '', country_code: 'US', votes_cast: 847, rank: 1 },
      { id: '2', display_name: 'BarberKing_IT', avatar_url: '', country_code: 'IT', votes_cast: 723, rank: 2 },
      { id: '3', display_name: 'FadeExpert', avatar_url: '', country_code: 'BR', votes_cast: 651, rank: 3 },
      { id: '4', display_name: 'SharpCuts_UK', avatar_url: '', country_code: 'GB', votes_cast: 598, rank: 4 },
      { id: '5', display_name: 'StyleMaven', avatar_url: '', country_code: 'FR', votes_cast: 542, rank: 5 },
      { id: '6', display_name: 'PrecisionCut', avatar_url: '', country_code: 'DE', votes_cast: 487, rank: 6 },
      { id: '7', display_name: 'TrendSetter_CA', avatar_url: '', country_code: 'CA', votes_cast: 423, rank: 7 },
      { id: '8', display_name: 'ClipperKing', avatar_url: '', country_code: 'AU', votes_cast: 389, rank: 8 },
    ];
    setLeaderboard(mockLeaderboard);
  };

  const addRandomComment = () => {
    const mockComments = [
      "This battle is INSANE! 🔥",
      "Voting for the BLADE! 🇺🇸",
      "ARTISTA all the way! 🇮🇹",
      "These cuts are incredible!",
      "Best battle of the year!",
      "The precision is unreal",
      "My money's on Marcus!",
      "Alessandro's technique is flawless",
      "This is why I love barber battles!",
      "The crowd is going wild!"
    ];

    const mockUsers = [
      { name: 'StyleGuru92', country: 'US' },
      { name: 'Fademaster', country: 'IT' },
      { name: 'CutPro_BR', country: 'BR' },
      { name: 'BarberAce', country: 'GB' },
      { name: 'TrimExpert', country: 'FR' },
    ];

    const randomComment = mockComments[Math.floor(Math.random() * mockComments.length)];
    const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];

    const newComment: LiveComment = {
      id: Date.now().toString(),
      user_name: randomUser.name,
      country_code: randomUser.country,
      message: randomComment,
      timestamp: new Date().toISOString(),
    };

    setComments(prev => [newComment, ...prev].slice(0, 50)); // Keep only latest 50
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 text-yellow-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Award className="w-4 h-4 text-orange-600" />;
      default: return <Trophy className="w-4 h-4 text-orange-400" />;
    }
  };

  const getFlagEmoji = (countryCode?: string) => {
    if (!countryCode) return "🌍";
    const flags: Record<string, string> = {
      'US': '🇺🇸', 'IT': '🇮🇹', 'BR': '🇧🇷', 'FR': '🇫🇷', 'DE': '🇩🇪', 
      'GB': '🇬🇧', 'ES': '🇪🇸', 'JP': '🇯🇵', 'CA': '🇨🇦', 'AU': '🇦🇺'
    };
    return flags[countryCode.toUpperCase()] || "🌍";
  };

  return (
    <div className="h-full flex flex-col bg-black/95">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-400" />
            <span className="text-white font-semibold">Battle Arena</span>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-gray-300">{liveViewers.toLocaleString()} watching</span>
          </div>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            LIVE
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'leaderboard'
              ? 'text-orange-400 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'comments'
              ? 'text-orange-400 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Live Chat
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === 'leaderboard' ? (
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Top Voters</h3>
            {leaderboard.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  {getRankIcon(user.rank)}
                  <span className="text-orange-400 font-semibold text-sm">#{user.rank}</span>
                </div>
                
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-gray-700 text-white text-xs">
                    {user.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{getFlagEmoji(user.country_code)}</span>
                    <span className="text-white text-sm font-medium truncate">
                      {user.display_name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {user.votes_cast} votes cast
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {comments.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                  <Avatar className="w-6 h-6 flex-shrink-0">
                    <AvatarImage src={comment.user_avatar} />
                    <AvatarFallback className="bg-gray-700 text-white text-xs">
                      {comment.user_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs">{getFlagEmoji(comment.country_code)}</span>
                      <span className="text-orange-400 text-xs font-medium">
                        {comment.user_name}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {new Date(comment.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <p className="text-white text-sm leading-relaxed">
                      {comment.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};