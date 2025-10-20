import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Youtube, CheckCircle2, Clock, Edit, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SubmissionPreviewProps {
  submission: {
    id: string;
    youtube_vod_url: string;
    title?: string;
    description?: string;
    status: string;
    created_at: string;
  };
  canEdit: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const SubmissionPreview = ({ submission, canEdit, onEdit, onDelete }: SubmissionPreviewProps) => {
  // Extract YouTube video ID
  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const videoId = getYouTubeVideoId(submission.youtube_vod_url);
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              Your Submission
            </CardTitle>
            {submission.status === 'submitted' && (
              <Badge variant="default" className="mt-2">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Submitted
              </Badge>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  className="h-8"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Submission?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete your video submission? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete} className="bg-destructive">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video Thumbnail */}
        {thumbnailUrl && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <a
                href={submission.youtube_vod_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/90 hover:bg-white text-black px-4 py-2 rounded-full flex items-center gap-2 font-semibold"
              >
                <Youtube className="h-5 w-5 text-red-500" />
                Watch on YouTube
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* Video Details */}
        <div className="space-y-3">
          {submission.title && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Title</p>
              <p className="font-medium text-white">{submission.title}</p>
            </div>
          )}

          {submission.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {submission.description}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Submitted {format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}
          </div>

          {/* Direct Link */}
          <a
            href={submission.youtube_vod_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View on YouTube
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};