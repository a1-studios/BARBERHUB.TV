import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Trophy, Users, Clock, Calendar, DollarSign, 
  UserPlus, UserMinus, Upload, Vote, 
  Image as ImageIcon, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Battle {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  prize_amount: number;
  currency: string;
  cover_image_url?: string;
  rules?: string;
  max_participants?: number;
  starts_at?: string;
  ends_at?: string;
  voting_ends_at?: string;
  created_at: string;
  organizer_id: string;
}

interface Participant {
  id: string;
  user_id: string;
  joined_at: string;
  profiles: {
    display_name: string;
    avatar_url?: string;
  } | null;
}

interface Submission {
  id: string;
  user_id: string;
  media_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  created_at: string;
  vote_count?: number;
  profiles: {
    display_name: string;
    avatar_url?: string;
  } | null;
}

const BattleDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [battle, setBattle] = useState<Battle | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userParticipation, setUserParticipation] = useState<Participant | null>(null);
  const [userSubmission, setUserSubmission] = useState<Submission | null>(null);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Submission form state
  const [submissionDialog, setSubmissionDialog] = useState(false);
  const [submissionForm, setSubmissionForm] = useState({
    media_url: '',
    thumbnail_url: '',
    title: '',
    description: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user && id) {
      fetchBattleData();
    }
  }, [user, loading, navigate, id]);

  const fetchBattleData = async () => {
    if (!id || !user) return;

    try {
      setPageLoading(true);

      // Fetch battle details
      const { data: battleData, error: battleError } = await supabase
        .from('battles')
        .select('*')
        .eq('id', id)
        .single();

      if (battleError) throw battleError;
      setBattle(battleData);

      // Fetch participants with profiles using manual join
      const { data: participantsData, error: participantsError } = await supabase
        .from('battle_participants')
        .select(`
          id,
          user_id,
          joined_at,
          battle_id,
          status
        `)
        .eq('battle_id', id);

      if (participantsError) throw participantsError;

      // Manually fetch profiles for participants
      const participantsWithProfiles = await Promise.all(
        (participantsData || []).map(async (participant) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', participant.user_id)
            .single();
          
          return {
            ...participant,
            profiles: profile
          };
        })
      );

      setParticipants(participantsWithProfiles);

      // Check if current user is participating
      const userParticipant = participantsWithProfiles?.find(p => p.user_id === user.id);
      setUserParticipation(userParticipant || null);

      // Fetch submissions with profiles using manual join
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('battle_submissions')
        .select(`
          id,
          user_id,
          battle_id,
          media_url,
          thumbnail_url,
          title,
          description,
          status,
          created_at
        `)
        .eq('battle_id', id);

      if (submissionsError) throw submissionsError;

      // Manually fetch profiles for submissions and get vote counts
      const submissionsWithVotes = await Promise.all(
        (submissionsData || []).map(async (submission) => {
          const [profileResult, voteResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('user_id', submission.user_id)
              .single(),
            supabase
              .from('battle_votes')
              .select('*', { count: 'exact', head: true })
              .eq('submission_id', submission.id)
          ]);
          
          return {
            ...submission,
            profiles: profileResult.data,
            vote_count: voteResult.count || 0
          };
        })
      );

      setSubmissions(submissionsWithVotes);

      // Check if user has submitted
      const userSub = submissionsWithVotes.find(s => s.user_id === user.id);
      setUserSubmission(userSub || null);

      // Check if user has voted
      const { data: voteData } = await supabase
        .from('battle_votes')
        .select('submission_id')
        .eq('battle_id', id)
        .eq('voter_id', user.id)
        .maybeSingle();

      setUserVote(voteData?.submission_id || null);

    } catch (error) {
      console.error('Error fetching battle data:', error);
      toast.error('Failed to load battle details');
      navigate('/battles');
    } finally {
      setPageLoading(false);
    }
  };

  const handleJoinBattle = async () => {
    if (!user || !battle) return;

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from('battle_participants')
        .insert([{
          battle_id: battle.id,
          user_id: user.id
        }]);

      if (error) throw error;

      toast.success('Successfully joined the battle!');
      fetchBattleData();
    } catch (error: any) {
      console.error('Error joining battle:', error);
      toast.error(error.message || 'Failed to join battle');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveBattle = async () => {
    if (!user || !battle || !userParticipation) return;

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from('battle_participants')
        .delete()
        .eq('id', userParticipation.id);

      if (error) throw error;

      toast.success('Left the battle successfully');
      fetchBattleData();
    } catch (error: any) {
      console.error('Error leaving battle:', error);
      toast.error(error.message || 'Failed to leave battle');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitEntry = async () => {
    if (!user || !battle || !submissionForm.media_url.trim()) return;

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from('battle_submissions')
        .insert([{
          battle_id: battle.id,
          user_id: user.id,
          media_url: submissionForm.media_url.trim(),
          thumbnail_url: submissionForm.thumbnail_url.trim() || null,
          title: submissionForm.title.trim() || null,
          description: submissionForm.description.trim() || null
        }]);

      if (error) throw error;

      toast.success('Submission uploaded successfully!');
      setSubmissionDialog(false);
      setSubmissionForm({ media_url: '', thumbnail_url: '', title: '', description: '' });
      fetchBattleData();
    } catch (error: any) {
      console.error('Error submitting entry:', error);
      toast.error(error.message || 'Failed to submit entry');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVote = async (submissionId: string) => {
    if (!user || !battle) return;

    try {
      setActionLoading(true);

      if (userVote === submissionId) {
        // Remove vote
        const { error } = await supabase
          .from('battle_votes')
          .delete()
          .eq('battle_id', battle.id)
          .eq('voter_id', user.id);

        if (error) throw error;
        toast.success('Vote removed');
      } else {
        // Add or change vote
        if (userVote) {
          // Update existing vote
          const { error } = await supabase
            .from('battle_votes')
            .update({ submission_id: submissionId })
            .eq('battle_id', battle.id)
            .eq('voter_id', user.id);

          if (error) throw error;
        } else {
          // Insert new vote
          const { error } = await supabase
            .from('battle_votes')
            .insert([{
              battle_id: battle.id,
              submission_id: submissionId,
              voter_id: user.id
            }]);

          if (error) throw error;
        }
        toast.success('Vote cast successfully!');
      }

      fetchBattleData();
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error(error.message || 'Failed to cast vote');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'voting': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'completed': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const canJoin = battle?.status === 'upcoming' || battle?.status === 'active';
  const canSubmit = battle?.status === 'active' && userParticipation && !userSubmission;
  const canVote = battle?.status === 'voting' && submissions.length > 0;

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-24 flex items-center justify-center">
          <div className="animate-pulse text-lg">Loading battle details...</div>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-24 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Battle Not Found</h2>
            <p className="text-muted-foreground mb-4">The battle you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/battles')}>Back to Battles</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Battle Header */}
          <div className="mb-8">
            {battle.cover_image_url && (
              <div className="aspect-video w-full max-w-4xl mx-auto mb-6 overflow-hidden rounded-3xl">
                <img
                  src={battle.cover_image_url}
                  alt={battle.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="text-center">
              <Badge className={`${getStatusColor(battle.status)} mb-4`}>
                {battle.status.charAt(0).toUpperCase() + battle.status.slice(1)}
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {battle.title}
              </h1>
              {battle.description && (
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {battle.description}
                </p>
              )}
            </div>
          </div>

          {/* Battle Info & Actions */}
          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              <Card className="border border-border/50 shadow-lg backdrop-blur-sm bg-card/50" style={{ borderRadius: '1.5rem' }}>
                <CardHeader>
                  <CardTitle>Battle Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      <span className="font-medium">Category:</span>
                      <span className="text-muted-foreground">{battle.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <span className="font-medium">Prize:</span>
                      <span className="text-muted-foreground">
                        {battle.prize_amount > 0 ? `${battle.currency} ${battle.prize_amount}` : 'No prize'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      <span className="font-medium">Participants:</span>
                      <span className="text-muted-foreground">
                        {participants.length}
                        {battle.max_participants && ` / ${battle.max_participants}`}
                      </span>
                    </div>
                    {battle.starts_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="font-medium">Starts:</span>
                        <span className="text-muted-foreground">
                          {format(new Date(battle.starts_at), 'PPP')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {battle.rules && (
                    <div>
                      <h4 className="font-medium mb-2">Rules & Guidelines</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap">{battle.rules}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="border border-border/50 shadow-lg backdrop-blur-sm bg-card/50" style={{ borderRadius: '1.5rem' }}>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!userParticipation && canJoin && (
                    <Button
                      onClick={handleJoinBattle}
                      disabled={actionLoading}
                      className="w-full"
                    >
                      {actionLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="mr-2 h-4 w-4" />
                      )}
                      Join Battle
                    </Button>
                  )}

                  {userParticipation && canJoin && (
                    <Button
                      onClick={handleLeaveBattle}
                      disabled={actionLoading}
                      variant="outline"
                      className="w-full"
                    >
                      {actionLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="mr-2 h-4 w-4" />
                      )}
                      Leave Battle
                    </Button>
                  )}

                  {canSubmit && (
                    <Dialog open={submissionDialog} onOpenChange={setSubmissionDialog}>
                      <DialogTrigger asChild>
                        <Button className="w-full">
                          <Upload className="mr-2 h-4 w-4" />
                          Submit Entry
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Submit Your Entry</DialogTitle>
                          <DialogDescription>
                            Upload your work for this battle
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="media_url">Media URL *</Label>
                            <Input
                              id="media_url"
                              placeholder="https://example.com/your-work.jpg"
                              value={submissionForm.media_url}
                              onChange={(e) => setSubmissionForm(prev => ({
                                ...prev,
                                media_url: e.target.value
                              }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                            <Input
                              id="thumbnail_url"
                              placeholder="https://example.com/thumbnail.jpg"
                              value={submissionForm.thumbnail_url}
                              onChange={(e) => setSubmissionForm(prev => ({
                                ...prev,
                                thumbnail_url: e.target.value
                              }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="title">Title</Label>
                            <Input
                              id="title"
                              placeholder="Enter a title for your submission"
                              value={submissionForm.title}
                              onChange={(e) => setSubmissionForm(prev => ({
                                ...prev,
                                title: e.target.value
                              }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              placeholder="Describe your work..."
                              value={submissionForm.description}
                              onChange={(e) => setSubmissionForm(prev => ({
                                ...prev,
                                description: e.target.value
                              }))}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setSubmissionDialog(false)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSubmitEntry}
                              disabled={actionLoading || !submissionForm.media_url.trim()}
                              className="flex-1"
                            >
                              {actionLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="mr-2 h-4 w-4" />
                              )}
                              Submit
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {userSubmission && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-sm text-green-400 text-center">
                        ✓ You have submitted your entry
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tabs for Participants and Submissions */}
          <Tabs defaultValue="participants" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="participants">
                Participants ({participants.length})
              </TabsTrigger>
              <TabsTrigger value="submissions">
                Submissions ({submissions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="participants" className="mt-6">
              {participants.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No participants yet</h3>
                  <p className="text-muted-foreground">Be the first to join this battle!</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {participants.map((participant) => (
                    <Card key={participant.id} className="border border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {participant.profiles?.avatar_url ? (
                            <img
                              src={participant.profiles.avatar_url}
                              alt={participant.profiles.display_name || 'User'}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">
                              {participant.profiles?.display_name || 'Anonymous'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Joined {format(new Date(participant.joined_at), 'PPP')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="submissions" className="mt-6">
              {submissions.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No submissions yet</h3>
                  <p className="text-muted-foreground">
                    {battle.status === 'active' 
                      ? 'Participants can start submitting their work!' 
                      : 'Submissions will appear here once the battle is active.'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {submissions.map((submission) => (
                    <Card key={submission.id} className="border border-border/50 overflow-hidden">
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={submission.thumbnail_url || submission.media_url}
                          alt={submission.title || 'Submission'}
                          className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => window.open(submission.media_url, '_blank')}
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {submission.profiles?.avatar_url ? (
                            <img
                              src={submission.profiles.avatar_url}
                              alt={submission.profiles.display_name || 'User'}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                              <Users className="w-3 h-3 text-primary" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-white">
                            {submission.profiles?.display_name || 'Anonymous'}
                          </span>
                        </div>
                        
                        {submission.title && (
                          <h4 className="font-medium text-white mb-1">{submission.title}</h4>
                        )}
                        
                        {submission.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {submission.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {submission.vote_count} votes
                          </span>
                          
                          {canVote && (
                            <Button
                              size="sm"
                              variant={userVote === submission.id ? "default" : "outline"}
                              onClick={() => handleVote(submission.id)}
                              disabled={actionLoading}
                            >
                              {actionLoading ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Vote className="mr-1 h-3 w-3" />
                              )}
                              {userVote === submission.id ? 'Voted' : 'Vote'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BattleDetails;
