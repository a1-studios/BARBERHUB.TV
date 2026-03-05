import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, CheckCircle2, Clock, Edit, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SubmissionPreviewProps {
  submission: {
    id: string;
    media_url?: string;
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
  const videoUrl = submission.media_url;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Your Submission
            </CardTitle>
            {submission.status === 'submitted' && (
              <Badge variant="default" className="mt-2">
                <CheckCircle2 className="h-3 w-3 mr-1" />Submitted
              </Badge>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={onEdit} className="h-8">
                  <Edit className="h-4 w-4 mr-1" />Edit
                </Button>
              )}
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Submission?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete} className="bg-destructive">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {videoUrl && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <video
              src={videoUrl}
              controls
              preload="metadata"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="space-y-3">
          {submission.title && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Title</p>
              <p className="font-medium">{submission.title}</p>
            </div>
          )}
          {submission.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{submission.description}</p>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Submitted {format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}
          </div>
          {videoUrl && (
            <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
              Open Video <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
