# Automatic Voting Closure System

## Overview

Phase 7 implements an automatic voting closure system that periodically checks for battles with expired voting periods and automatically closes them, calculates results, and updates tournament standings.

## Components

### 1. Edge Function: `auto-close-voting`

This edge function runs periodically to:
- Find all battles in 'voting' status with expired `voting_ends_at` timestamps
- Update battle status to 'completed'
- For tournament matches:
  - Calculate match results using weighted votes
  - Update tournament standings
  - Update bracket matches with winner information

**Location**: `supabase/functions/auto-close-voting/index.ts`

**Authentication**: Public (verify_jwt = false) - Designed to be called by cron job

### 2. How It Works

1. **Scheduled Check**: The function queries for battles where:
   - `status = 'voting'`
   - `voting_ends_at < NOW()`

2. **Battle Closure**: For each expired battle:
   - Updates `status` to 'completed'
   - If tournament match, calls database functions:
     - `calculate_match_result()` - Determines winner based on weighted votes
     - `update_tournament_standings()` - Updates standings table with points
     - Updates `bracket_matches` table with winner

3. **Response**: Returns summary of processed battles with success/failure counts

## Setup Instructions

### Option 1: Using pg_cron (Recommended)

Run this SQL in your Supabase SQL Editor to schedule automatic voting closure every 5 minutes:

```sql
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the auto-close-voting function to run every 5 minutes
SELECT cron.schedule(
  'auto-close-expired-battles',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://msuepyfssovvkjzpfjzu.supabase.co/functions/v1/auto-close-voting',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

### Option 2: External Cron Service

If pg_cron is not available, use an external service like:
- **Cron-job.org**
- **EasyCron**
- **GitHub Actions**

Configure it to call:
```
POST https://msuepyfssovvkjzpfjzu.supabase.co/functions/v1/auto-close-voting
```

Every 5 minutes with:
- Header: `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
- Header: `Content-Type: application/json`
- Body: `{}`

### Option 3: Manual Trigger

For testing, you can manually trigger the function:

```bash
curl -X POST \
  https://msuepyfssovvkjzpfjzu.supabase.co/functions/v1/auto-close-voting \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{}'
```

## Verifying Setup

### Check Cron Job Status

```sql
-- View scheduled cron jobs
SELECT * FROM cron.job WHERE jobname = 'auto-close-expired-battles';

-- View cron job run history
SELECT * FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'auto-close-expired-battles'
)
ORDER BY start_time DESC 
LIMIT 10;
```

### Monitor Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to Edge Functions → auto-close-voting → Logs
3. Check for successful executions and any errors

**Direct Link**: https://supabase.com/dashboard/project/msuepyfssovvkjzpfjzu/functions/auto-close-voting/logs

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Processed 3 expired battles",
  "processed": 3,
  "successful": 2,
  "failed": 1,
  "results": [
    {
      "battleId": "uuid-1",
      "title": "Battle Title 1",
      "success": true,
      "isTournamentMatch": true
    },
    {
      "battleId": "uuid-2",
      "title": "Battle Title 2",
      "success": true,
      "isTournamentMatch": false
    },
    {
      "battleId": "uuid-3",
      "success": false,
      "error": "Error message"
    }
  ]
}
```

### No Expired Battles

```json
{
  "success": true,
  "message": "No expired battles to close",
  "processed": 0
}
```

## Database Functions Used

### `calculate_match_result(battle_id_param UUID)`

Calculates weighted vote totals for each barber and determines the winner:
- Returns: barber1_weighted_votes, barber2_weighted_votes, winner_id, is_draw, points
- Barber votes are weighted 3x
- Fan votes are weighted 1x (3x if verified by competition and within bonus period)

### `update_tournament_standings(battle_id_param UUID)`

Updates tournament standings table with match results:
- Adds points (3 for win, 1 for draw, 0 for loss)
- Increments wins/draws/losses counters
- Updates votes_for and votes_against
- Recalculates rankings based on points → vote difference → votes for

## Troubleshooting

### Battles Not Closing Automatically

1. **Check if cron job is running**:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-close-expired-battles')
   ORDER BY start_time DESC LIMIT 5;
   ```

2. **Check edge function logs** for errors

3. **Verify voting_ends_at timestamps**:
   ```sql
   SELECT id, title, status, voting_ends_at 
   FROM battles 
   WHERE status = 'voting' 
   AND voting_ends_at < NOW();
   ```

4. **Test function manually** using the curl command above

### Permission Errors

Ensure the edge function uses `SUPABASE_SERVICE_ROLE_KEY` for elevated permissions to update battle statuses and call database functions.

## Security Considerations

- Function is public (no JWT verification) but should only be called by cron job
- Uses service role key for database operations
- Consider adding IP whitelist or secret token for production

## Benefits

- **No Manual Intervention**: Battles close automatically when voting ends
- **Accurate Timing**: Runs every 5 minutes to catch expired battles promptly
- **Tournament Integration**: Automatically calculates standings and updates brackets
- **Scalable**: Handles multiple expired battles in a single execution
- **Reliable**: Database functions ensure consistent result calculation

## Maintenance

- Monitor edge function logs regularly
- Check cron job execution history
- Adjust schedule frequency if needed (currently 5 minutes)
- Consider adding notifications for failed closures

## Next Steps

After setup, the system will automatically:
1. Close voting when `voting_ends_at` is reached
2. Calculate winners based on weighted votes
3. Update tournament standings
4. Mark bracket matches as completed
5. Set winner_id for advancing barbers

No manual intervention required!
