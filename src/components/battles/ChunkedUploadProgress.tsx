import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Pause, Play, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { UploadProgress, UploadController } from '@/lib/storage';

interface ChunkedUploadProgressProps {
  progress: UploadProgress;
  controller: UploadController | null;
}

export const ChunkedUploadProgress = ({ progress, controller }: ChunkedUploadProgressProps) => {
  const { status, completedChunks, totalChunks, percentage, speed, error } = progress;

  const formatSpeed = (bps: number) => {
    if (bps < 1024) return `${bps.toFixed(0)} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (status === 'idle') return null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {status === 'paused' && <Pause className="h-4 w-4 text-yellow-500" />}
          {status === 'completing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
          {status === 'cancelled' && <X className="h-4 w-4 text-muted-foreground" />}
          <span>
            {status === 'uploading' && `Uploading chunk ${completedChunks + 1} of ${totalChunks}`}
            {status === 'paused' && 'Upload paused'}
            {status === 'completing' && 'Stitching file on server...'}
            {status === 'done' && 'Upload complete!'}
            {status === 'error' && 'Upload failed'}
            {status === 'cancelled' && 'Upload cancelled'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatSize(progress.bytesUploaded)} / {formatSize(progress.totalBytes)}
        </span>
      </div>

      {/* Progress bar */}
      <Progress value={status === 'completing' ? 100 : percentage} className="h-2" />

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{percentage}%</span>
        {(status === 'uploading') && <span>{formatSpeed(speed)}</span>}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Control buttons */}
      {controller && (status === 'uploading' || status === 'paused') && (
        <div className="flex gap-2">
          {status === 'uploading' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => controller.pause()}
              className="text-yellow-600 border-yellow-600/30 hover:bg-yellow-600/10"
            >
              <Pause className="h-3 w-3 mr-1" /> Pause
            </Button>
          )}
          {status === 'paused' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => controller.resume()}
              className="text-green-600 border-green-600/30 hover:bg-green-600/10"
            >
              <Play className="h-3 w-3 mr-1" /> Resume
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => controller.cancel()}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <X className="h-3 w-3 mr-1" /> Cancel
          </Button>
        </div>
      )}
    </div>
  );
};
