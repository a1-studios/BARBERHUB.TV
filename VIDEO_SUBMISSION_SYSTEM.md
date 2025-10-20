# Complete Video Submission System - Documentation

## Overview

The Video Submission System provides barbers with a comprehensive solution to submit, manage, and track their battle videos. The system includes YouTube video integration, validation, preview, and management features.

## Components

### 1. VideoSubmissionModal

**Location**: `src/components/battles/VideoSubmissionModal.tsx`

A modal dialog for submitting YouTube battle videos with validation and guidelines.

**Features**:
- Tabbed interface (Submit / Guidelines)
- YouTube URL validation using Zod schema
- Real-time URL validation with visual feedback
- Character limits on title (100) and description (500)
- Loading states during submission
- Success/error toast notifications
- Instructions and examples

**Props**:
```typescript
interface VideoSubmissionModalProps {
  battleId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Validation Schema**:
```typescript
const videoSubmissionSchema = z.object({
  videoUrl: z.string()
    .trim()
    .url({ message: "Please enter a valid URL" })
    .regex(
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      { message: "Please enter a valid YouTube URL" }
    ),
  title: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
});
```

### 2. SubmissionPreview

**Location**: `src/components/battles/SubmissionPreview.tsx`

Displays submitted video with thumbnail, details, and management options.

**Features**:
- YouTube thumbnail preview (with fallbacks)
- Video title and description display
- Submission timestamp
- Edit button (when voting hasn't started)
- Delete button with confirmation dialog
- Direct link to YouTube video
- Hover overlay for video preview

**Props**:
```typescript
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
```

### 3. SubmissionGuidelines

**Location**: `src/components/battles/SubmissionGuidelines.tsx`

Comprehensive guidelines for battle video submissions.

**Sections**:
1. **Video Requirements**
   - Platform: YouTube only
   - Quality: 720p HD minimum
   - Content: Must demonstrate barbering skills

2. **Battle Process**
   - Go live on YouTube
   - Save VOD after streaming
   - Submit URL
   - Voting opens after both submissions

3. **Voting Period**
   - 7 days duration
   - Weighted voting system
   - Winner by total weighted votes

**Features**:
- Clear step-by-step instructions
- Visual icons for each section
- Important alerts and pro tips
- Professional formatting

### 4. MyBattlesSection Integration

**Location**: `src/components/barber/MyBattlesSection.tsx`

Barber dashboard section showing active battles with submission management.

**Features**:
- Separate sections for "Pending Submissions" and "Live for Voting"
- Submission status indicators for both barbers
- Upload buttons for pending submissions
- View battle buttons for completed submissions
- Real-time refetch after submission
- Empty state with create battle CTA

## Edge Function

### submit-battle-video

**Location**: `supabase/functions/submit-battle-video/index.ts`

Backend function handling video submissions with the "Airlock" mechanism.

**Flow**:
1. **Authentication**: Verify user is signed in
2. **Validation**: Check YouTube URL format
3. **Authorization**: Verify user is battle participant
4. **Status Check**: Ensure battle accepts submissions
5. **Submission**: Create/update battle_submissions record
6. **Battle Update**: Update barber_1_video_url or barber_2_video_url
7. **Airlock Check**: If both barbers submitted, open voting

**The Airlock Mechanism**:
```typescript
const bothSubmitted = 
  updatedBattle.barber_1_video_url && 
  updatedBattle.barber_2_video_url;

if (bothSubmitted) {
  // 🎉 BOTH SUBMITTED - OPEN THE AIRLOCK!
  const votingEndsAt = new Date();
  votingEndsAt.setDate(votingEndsAt.getDate() + 7); // 7 days
  
  await supabaseClient
    .from('battles')
    .update({
      status: 'voting',
      voting_ends_at: votingEndsAt.toISOString(),
    })
    .eq('id', battleId);
}
```

**Response Types**:
```typescript
interface SubmitVideoResponse {
  success: boolean;
  message: string;
  battleStatus: 'pending' | 'voting';
  votingEndsAt?: string;
}
```

**Success Messages**:
- Both submitted: "Success! Both videos submitted. Your battle is now LIVE for voting!"
- Waiting: "Video submitted! Waiting for your opponent. Voting begins once they submit."

**Error Handling**:
- 401: Not authenticated
- 400: Missing fields or invalid URL
- 403: Not a battle participant
- 400: Battle not accepting submissions
- 404: Battle not found
- 500: Server error

## Database Schema

### battle_submissions Table

```sql
CREATE TABLE battle_submissions (
  id UUID PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES battles(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  youtube_vod_url TEXT,
  media_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  is_live_stream BOOLEAN DEFAULT false,
  stream_started_at TIMESTAMPTZ,
  stream_ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### battles Table (Relevant Columns)

```sql
-- Video URL columns
barber_1_video_url TEXT,
barber_2_video_url TEXT,

-- Battle status
status TEXT NOT NULL DEFAULT 'awaiting_submissions',
voting_ends_at TIMESTAMPTZ,
```

## User Flows

### Flow 1: First Submission

1. Barber A creates a battle
2. Barber B accepts battle
3. **Barber A submits video**
   - Opens VideoSubmissionModal
   - Pastes YouTube URL
   - Adds optional title/description
   - Clicks "Submit Video"
   - Edge function creates submission
   - Updates barber_1_video_url
   - Status remains "awaiting_submissions"
   - Message: "Waiting for opponent..."

### Flow 2: Second Submission (Airlock Opens)

4. **Barber B submits video**
   - Same submission process
   - Edge function creates submission
   - Updates barber_2_video_url
   - **Airlock check passes!**
   - Status changes to "voting"
   - voting_ends_at set to +7 days
   - Message: "Battle is now LIVE!"
   - Both barbers receive notifications

### Flow 3: Editing Submission

1. Before voting starts (status ≠ 'voting')
2. Click "Edit" on SubmissionPreview
3. VideoSubmissionModal opens with current data
4. Update URL, title, or description
5. Submit updates existing submission
6. Airlock check runs again

### Flow 4: Deleting Submission

1. Before voting starts
2. Click trash icon on SubmissionPreview
3. Confirm deletion in AlertDialog
4. Submission removed from battle_submissions
5. Battle video URL cleared
6. Battle status may revert if was voting

## Features & Benefits

### For Barbers

✅ **Easy Submission**: Simple YouTube URL paste
✅ **Live Preview**: See thumbnail before voting
✅ **Edit Capability**: Update before voting starts
✅ **Clear Status**: Know when opponent submits
✅ **Guidelines**: Built-in help and instructions
✅ **Validation**: Prevents invalid submissions
✅ **Real-time Updates**: Instant status changes

### For Fans

✅ **Quality Assurance**: Only valid YouTube videos
✅ **Fair Competition**: Both must submit before voting
✅ **Transparency**: See submission timestamps
✅ **Rich Content**: Titles and descriptions
✅ **Easy Access**: Direct YouTube links

### System Benefits

✅ **Automated Workflow**: Airlock opens voting automatically
✅ **Data Integrity**: Validation at multiple levels
✅ **User Experience**: Clear feedback and guidance
✅ **Security**: Authorization checks at every step
✅ **Scalability**: Efficient edge function processing

## Validation Rules

### Client-Side (Zod)

```typescript
// URL validation
z.string()
  .trim()
  .url()
  .regex(/youtube\.com|youtu\.be/)

// Title validation
z.string()
  .trim()
  .max(100)
  .optional()

// Description validation
z.string()
  .trim()
  .max(500)
  .optional()
```

### Server-Side (Edge Function)

```typescript
// YouTube URL regex
const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

// Participant verification
const isBarber1 = battle.barber1_id === user.id;
const isBarber2 = battle.barber2_id === user.id;

// Status verification
if (battle.status !== 'awaiting_submissions' && 
    battle.status !== 'active' && 
    battle.status !== 'upcoming') {
  throw new Error('Battle not accepting submissions');
}
```

## Security Considerations

### Authorization

- ✅ JWT token required for edge function
- ✅ User must be battle participant
- ✅ RLS policies on battle_submissions
- ✅ Can only edit/delete own submissions

### Data Validation

- ✅ YouTube URL format strictly validated
- ✅ XSS prevention through character limits
- ✅ SQL injection prevented by parameterized queries
- ✅ CSRF protection via Supabase auth

### Rate Limiting

Consider adding:
- Max submissions per user per day
- Cooldown between submission updates
- IP-based rate limiting on edge function

## Error Handling

### User-Friendly Messages

```typescript
// Invalid URL
"Please enter a valid YouTube URL"

// Not a participant
"You are not a participant in this battle"

// Battle status
"Battle is not accepting submissions (status: voting)"

// Network error
"Failed to submit video. Please try again."
```

### Logging

All edge function logs include:
- User ID
- Battle ID
- Action performed
- Success/failure status
- Error details

## Testing Checklist

### Manual Testing

- [ ] Submit with valid YouTube URL
- [ ] Submit with invalid URL
- [ ] Submit with very long title (>100 chars)
- [ ] Submit with very long description (>500 chars)
- [ ] Edit submission before voting
- [ ] Try to edit during voting (should fail)
- [ ] Delete submission
- [ ] Submit as first barber
- [ ] Submit as second barber (airlock)
- [ ] Try to submit when not participant
- [ ] Submit without authentication

### Automated Testing

```typescript
// Example test cases
describe('VideoSubmissionModal', () => {
  it('validates YouTube URLs correctly');
  it('shows error for invalid URLs');
  it('enforces character limits');
  it('calls edge function on submit');
  it('shows success message');
  it('resets form after success');
});
```

## Future Enhancements

### Short-term

1. **Video Preview**: Embed YouTube player in modal
2. **Drag-and-Drop**: Drag URL into input field
3. **Auto-fetch Title**: Get title from YouTube API
4. **Thumbnail Upload**: Allow custom thumbnails
5. **Progress Tracking**: Visual progress indicator

### Long-term

1. **Direct Upload**: Support direct video uploads to Supabase Storage
2. **Multi-platform**: Support Vimeo, TikTok, Instagram
3. **Video Editing**: Built-in trim/crop tools
4. **Analytics**: View submission metrics
5. **Templates**: Pre-filled descriptions for different battle types
6. **Batch Upload**: Submit multiple videos at once
7. **AI Analysis**: Auto-detect video quality and content

## Troubleshooting

### Common Issues

**"Invalid YouTube URL"**
- Check URL format (must include `/watch?v=` or `/youtu.be/`)
- Ensure video is public or unlisted, not private
- Remove any extra parameters from URL

**"Not a participant"**
- Verify you're logged in as correct user
- Check battle participants list
- Ensure battle wasn't cancelled

**"Battle not accepting submissions"**
- Check battle status (must be awaiting_submissions/active/upcoming)
- Voting may have already started
- Battle may be completed

**Submission not appearing**
- Refresh the page
- Check browser console for errors
- Verify edge function logs in Supabase

**Airlock not opening**
- Ensure both barber_1_video_url and barber_2_video_url are set
- Check edge function logs for errors
- Verify battle status update succeeded

## Performance Optimization

### Frontend

- Lazy load VideoSubmissionModal
- Debounce URL validation
- Cache submission previews
- Optimize thumbnail loading
- Use React Query for caching

### Backend

- Index battle_id in battle_submissions
- Index user_id in battle_submissions
- Use database functions for complex queries
- Cache YouTube thumbnails
- Implement CDN for video thumbnails

## Conclusion

The Video Submission System provides a robust, user-friendly solution for barbers to submit and manage their battle videos. With comprehensive validation, clear guidelines, and automated workflow management, it ensures a smooth experience for both barbers and fans while maintaining security and data integrity.
