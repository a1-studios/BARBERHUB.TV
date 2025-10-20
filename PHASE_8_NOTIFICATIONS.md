# Phase 8: Real-Time Notifications System

## Overview

Phase 8 implements a comprehensive real-time notifications system that alerts users about important battle events, including voting completion, winners announced, and tournament updates.

## Features Implemented

### 1. Database Schema

**Notifications Table**
- Stores all user notifications with metadata
- Fields: id, user_id, type, title, message, data (JSONB), read, created_at
- Indexed for efficient queries by user_id, created_at, and read status
- RLS policies ensure users can only see their own notifications

**Database Functions**
- `create_battle_notification()` - Creates a single notification
- `notify_battle_participants()` - Notifies all battle participants
- `notify_battle_voters()` - Notifies all users who voted

### 2. Edge Function Updates

**auto-close-voting**
Enhanced to send notifications when battles automatically close:
- Fetches winner information from match results
- Sends notifications to all participants with winner details
- Sends notifications to all voters with battle results
- Includes battle_id in notification data for navigation

**close-voting**
Enhanced to send notifications when organizer manually closes voting:
- Same notification logic as auto-close
- Provides consistent user experience

### 3. Frontend Components

**useNotifications Hook** (`src/hooks/useNotifications.tsx`)
- Fetches user notifications with real-time updates
- Tracks unread count
- Provides mark as read functionality
- Real-time subscription to new notifications
- Shows toast notifications when new notifications arrive

**NotificationBell Component** (`src/components/NotificationBell.tsx`)
- Bell icon with unread count badge
- Popover dropdown with scrollable notification list
- Click to mark individual notifications as read
- "Mark all read" button for bulk actions
- Click notification to navigate to battle details
- Beautiful UI with proper spacing and formatting

**Header Integration**
- Notification bell displayed next to menu for authenticated users
- Accessible from anywhere in the app

## Notification Types

### battle_completed
Sent to battle participants when voting ends:
- **Title**: "🏆 Battle Results"
- **Message**: "Voting has ended for [Battle Title]. [Winner] won!"
- **Data**: { battle_id, winner_name }

### battle_result
Sent to all voters when voting ends:
- **Title**: "🎉 Battle Results Are In!"
- **Message**: "The battle [Battle Title] has ended. [Winner] won!"
- **Data**: { battle_id, winner_name }

### battle_update (extensible)
Can be used for other battle events:
- Battle started
- Opponent submitted video
- Tournament advancement
- etc.

## Real-Time Features

### Supabase Realtime
- Enabled on notifications table via `supabase_realtime` publication
- Frontend subscribes to INSERT events filtered by user_id
- New notifications appear instantly without page refresh

### Toast Notifications
When new notification arrives:
- Toast appears with title and message
- "View" button navigates to battle details
- Non-intrusive but attention-grabbing

## User Experience

### For Battle Participants (Barbers)
1. Submit video and wait for voting to end
2. Receive notification when voting closes
3. See winner announcement in notification
4. Click notification to view detailed results

### For Voters (Fans)
1. Cast vote in battle
2. Receive notification when results are in
3. See who won directly in notification
4. Click to see full results and statistics

### Notification Management
- Unread count shows in bell badge (e.g., "3" or "9+")
- Notifications marked as read automatically when clicked
- "Mark all read" button for cleanup
- Notifications sorted by newest first
- Limited to 50 most recent for performance

## Technical Details

### Database Indexes
```sql
-- Efficient query by user
idx_notifications_user_id ON notifications(user_id)

-- Sort by date
idx_notifications_created_at ON notifications(created_at DESC)

-- Filter unread quickly
idx_notifications_read ON notifications(read) WHERE read = false
```

### RLS Policies
- Users can only SELECT their own notifications
- Users can UPDATE their own notifications (mark as read)
- System can INSERT notifications (via SECURITY DEFINER functions)

### Real-Time Subscription
```typescript
supabase
  .channel('notifications-changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${user.id}`
  }, handleNewNotification)
  .subscribe()
```

## Testing

### Manual Testing

1. **Create a battle**
2. **Submit videos as two barbers**
3. **Cast votes as fans**
4. **Wait for voting to expire** OR **manually close as organizer**
5. **Check notifications** for all participants and voters

### Automatic Testing (via auto-close-voting)

1. Set up pg_cron job (see AUTOMATIC_VOTING_CLOSURE.md)
2. Wait for cron to run every 5 minutes
3. Check edge function logs for notification creation
4. Verify notifications appear in UI

## Future Enhancements

### Notification Types to Add
- `battle_started` - Battle has begun, submit your video
- `video_submitted` - Your opponent submitted their video
- `tournament_qualified` - You qualified for elimination rounds
- `tournament_eliminated` - You've been eliminated from tournament
- `battle_reminder` - Voting ends in 1 hour
- `new_follower` - Someone followed you
- `donation_received` - You received a donation

### Settings Page
- Email notification preferences
- Push notification preferences
- Notification frequency settings
- Mute specific notification types

### Notification History
- Dedicated page for all notifications
- Filter by type
- Search functionality
- Delete/archive options

### Push Notifications
- Web Push API integration
- Mobile push notifications
- Service worker implementation

## Troubleshooting

### Notifications Not Appearing

1. **Check database**:
   ```sql
   SELECT * FROM notifications WHERE user_id = 'user-id' ORDER BY created_at DESC;
   ```

2. **Check realtime publication**:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```

3. **Check browser console** for realtime subscription errors

4. **Verify edge function logs** for notification creation

### Unread Count Not Updating

- Check if real-time subscription is active
- Verify RLS policies allow reading notifications
- Check browser network tab for realtime websocket connection

### Toast Not Showing

- Verify toast component is properly imported from sonner
- Check if notification data includes battle_id
- Ensure toast handler is not blocked by browser

## Performance Considerations

### Database Queries
- Indexes on user_id and created_at ensure fast queries
- Limit to 50 notifications prevents large data transfers
- Partial index on unread status optimizes badge count

### Real-Time Subscriptions
- Filtered by user_id at database level
- Only receives notifications for current user
- Automatic cleanup on component unmount

### Notification Cleanup
Consider adding a scheduled job to delete old notifications:
```sql
-- Delete notifications older than 90 days
DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '90 days';
```

## Security

### RLS Policies
- Users cannot read other users' notifications
- Users cannot create notifications (only system can)
- Users can only mark their own notifications as read

### Data Privacy
- Notification content doesn't include sensitive data
- Winner names are display names, not personal info
- Battle IDs are UUIDs, not sequential

### JSONB Data
- Used for flexible notification data
- Allows adding new fields without schema changes
- Properly indexed for query performance

## Benefits

✅ **Instant Feedback** - Users know immediately when battles end
✅ **Engagement** - Notifications bring users back to the platform
✅ **Transparency** - Clear communication about battle outcomes
✅ **User Experience** - No need to constantly check battle status
✅ **Scalability** - Real-time system handles thousands of users
✅ **Extensibility** - Easy to add new notification types

## Conclusion

Phase 8 completes the battle system with real-time notifications, ensuring users stay informed about all important events. The system is performant, secure, and provides an excellent user experience with instant updates and beautiful UI.
