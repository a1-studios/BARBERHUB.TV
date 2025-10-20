import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  AlertCircle, 
  Video, 
  Clock, 
  Youtube, 
  Scissors,
  Trophy,
  Users
} from 'lucide-react';

export const SubmissionGuidelines = () => {
  return (
    <div className="space-y-4">
      {/* Main Guidelines */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Battle Submission Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Requirements */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Youtube className="h-4 w-4 text-red-500" />
              Video Requirements
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Platform:</strong> YouTube videos only (public or unlisted)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Quality:</strong> Minimum 720p HD recommended</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Duration:</strong> Showcase your best work (no minimum length)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Content:</strong> Must demonstrate your barbering skills</span>
              </li>
            </ul>
          </div>

          {/* Battle Process */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Scissors className="h-4 w-4 text-primary" />
              Battle Process
            </h4>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li className="flex items-start gap-2">
                <span className="min-w-[20px]">1.</span>
                <span><strong>Go Live:</strong> Stream your battle performance on YouTube</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="min-w-[20px]">2.</span>
                <span><strong>Save VOD:</strong> After streaming, YouTube saves your video automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="min-w-[20px]">3.</span>
                <span><strong>Submit URL:</strong> Copy the video link and submit it here</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="min-w-[20px]">4.</span>
                <span><strong>Voting Opens:</strong> Once both barbers submit, fans can vote!</span>
              </li>
            </ol>
          </div>

          {/* Voting Info */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Voting Period
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Voting lasts <strong>7 days</strong> after both submissions</span>
              </li>
              <li className="flex items-start gap-2">
                <Users className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Fans and barbers can vote with <strong>weighted voting</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Trophy className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>Winner determined by total weighted votes</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Important Alerts */}
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="text-sm">
          <strong>Important:</strong> You can edit your submission before voting begins. 
          Once voting starts, submissions are locked to ensure fair competition.
        </AlertDescription>
      </Alert>

      <Alert className="border-blue-500/50 bg-blue-500/10">
        <AlertCircle className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-sm">
          <strong>Pro Tip:</strong> Engage with your audience! Share your battle link on social media 
          to get more votes and grow your following.
        </AlertDescription>
      </Alert>
    </div>
  );
};