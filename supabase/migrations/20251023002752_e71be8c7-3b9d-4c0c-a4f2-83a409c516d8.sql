-- Assign CJ and AJ's barber_profile IDs to battles
-- CJ's barber_profile id: 75255dd3-1e7b-45bc-9b1d-f62a53fcbf62
-- AJ's barber_profile id: c9ced8c6-1206-417c-bcaa-ed11e3b6af43

UPDATE battles 
SET 
  barber1_id = '75255dd3-1e7b-45bc-9b1d-f62a53fcbf62',  -- CJ's barber_profile.id
  barber2_id = 'c9ced8c6-1206-417c-bcaa-ed11e3b6af43',  -- AJ's barber_profile.id
  updated_at = NOW()
WHERE id = '43aafe5c-b20f-4d30-854c-e446db068daa'  -- "2026 barber gramis" battle
  AND status = 'upcoming';

-- Also update the second battle
UPDATE battles 
SET 
  barber1_id = '75255dd3-1e7b-45bc-9b1d-f62a53fcbf62',  -- CJ's barber_profile.id
  barber2_id = 'c9ced8c6-1206-417c-bcaa-ed11e3b6af43',  -- AJ's barber_profile.id
  updated_at = NOW()
WHERE id = '3f98295a-3aa6-4fc6-92b8-71d8f04e9cc3'  -- "2026" battle
  AND status = 'upcoming';