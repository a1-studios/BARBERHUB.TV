-- Add preferred time slot to tournament queue
ALTER TABLE tournament_queue 
ADD COLUMN preferred_time_slot text DEFAULT 'flexible' CHECK (preferred_time_slot IN ('morning', 'afternoon', 'flexible'));

-- Add index for queue timestamp to efficiently find old entries
CREATE INDEX idx_tournament_queue_timestamp ON tournament_queue(queue_timestamp);

-- Add comment explaining the time slots
COMMENT ON COLUMN tournament_queue.preferred_time_slot IS 'Barber preferred time slot: morning (10 AM - 1 PM), afternoon (2 PM - 6 PM), or flexible';