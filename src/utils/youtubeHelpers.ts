/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - Just the video ID itself
 */
export const extractYouTubeVideoId = (input: string): string | null => {
  if (!input) return null;
  
  // If it's already just an ID (11 characters alphanumeric)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }
  
  // Extract from URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Validate if a string is a valid YouTube video ID or URL
 */
export const isValidYouTubeInput = (input: string): boolean => {
  return extractYouTubeVideoId(input) !== null;
};

/**
 * Build a public YouTube watch URL from video ID
 * This ensures we always use the public watch page, not studio URLs
 */
export const buildYouTubeWatchUrl = (videoId: string): string => {
  return `https://www.youtube.com/watch?v=${videoId}`;
};

/**
 * Format YouTube video ID input helper text
 */
export const getYouTubeInputHelperText = () => {
  return "Paste your YouTube Live Stream URL or just the video ID (e.g., dQw4w9WgXcQ)";
};
