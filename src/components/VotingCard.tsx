
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Vote, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { UserVotePowerIndicator } from './UserVotePowerIndicator';

interface VotingCardProps {
  submission: {
    id: string;
    user_id: string;
    media_url: string;
    thumbnail_url?: string;
    title?: string;
    description?: string;
    created_at: string;
    profiles: {
      display_name: string;
      avatar_url?: string;
    } | null;
  };
  voteResults: {
    submission_id: string;
    weighted_votes: number;
  }[];
  userVote: string | null;
  totalWeightedVotes: number;
  canVote: boolean;
  isVoting: boolean;
  onVote: (submissionId: string) => void;
}

const VotingCard = ({
  submission,
  voteResults,
  userVote,
  totalWeightedVotes,
  canVote,
  isVoting,
  onVote
}: VotingCardProps) => {
  const [imageError, setImageError] = useState(false);
  
  const submissionVotes = voteResults.find(r => r.submission_id === submission.id)?.weighted_votes || 0;
  const votePercentage = totalWeightedVotes > 0 ? Math.round((submissionVotes / totalWeightedVotes) * 100) : 0;
  const hasUserVoted = userVote === submission.id;
  const showResults = userVote !== null || !canVote;

  return (
    <Card className="border border-border/50 overflow-hidden relative">
      {/* Media Display */}
      <div className="aspect-square overflow-hidden relative">
        {!imageError ? (
          <img
            src={submission.thumbnail_url || submission.media_url}
            alt={submission.title || 'Submission'}
            className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
            onClick={() => window.open(submission.media_url, '_blank')}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Media unavailable</p>
            </div>
          </div>
        )}
        
        {/* Vote overlay for quick voting */}
        {canVote && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex flex-col items-center justify-center gap-2">
            {!hasUserVoted && (
              <div className="opacity-0 hover:opacity-100 transition-opacity">
                <UserVotePowerIndicator />
              </div>
            )}
            <Button
              size="lg"
              variant={hasUserVoted ? "default" : "secondary"}
              className={`opacity-0 hover:opacity-100 transition-opacity ${
                hasUserVoted ? 'opacity-100' : ''
              }`}
              onClick={() => onVote(submission.id)}
              disabled={isVoting}
            >
              {isVoting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Vote className="w-5 h-5 mr-2" />
                  {hasUserVoted ? 'Voted' : 'Vote'}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Creator Info */}
        <div className="flex items-center gap-2 mb-3">
          {submission.profiles?.avatar_url ? (
            <img
              src={submission.profiles.avatar_url}
              alt={submission.profiles.display_name || 'User'}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white text-sm truncate">
              {submission.profiles?.display_name || 'Anonymous'}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(submission.created_at), 'MMM d')}
            </p>
          </div>
          {hasUserVoted && (
            <Badge variant="default" className="text-xs">
              Your Vote
            </Badge>
          )}
        </div>

        {/* Title and Description */}
        {submission.title && (
          <h4 className="font-medium text-white mb-1 text-sm line-clamp-1">
            {submission.title}
          </h4>
        )}
        
        {submission.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {submission.description}
          </p>
        )}

        {/* Voting Results - Instagram Style */}
        {showResults ? (
          <div className="space-y-2">
            {/* Progress Bar */}
            <div className="relative">
              <Progress 
                value={votePercentage} 
                className="h-2"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-white mix-blend-difference">
                  {votePercentage}%
                </span>
              </div>
            </div>
            
            {/* Vote Stats */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {submissionVotes} weighted votes
              </span>
              {canVote && (
                <Button
                  size="sm"
                  variant={hasUserVoted ? "default" : "outline"}
                  onClick={() => onVote(submission.id)}
                  disabled={isVoting}
                  className="h-6 px-2 text-xs"
                >
                  {isVoting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : hasUserVoted ? (
                    'Change Vote'
                  ) : (
                    'Vote'
                  )}
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Vote to see results */
          <div className="space-y-2">
            <div className="flex justify-center">
              <UserVotePowerIndicator />
            </div>
            <Button
              onClick={() => onVote(submission.id)}
              disabled={isVoting}
              className="w-full"
              variant="outline"
            >
              {isVoting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Vote className="mr-2 h-4 w-4" />
              )}
              Vote to see results
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VotingCard;
