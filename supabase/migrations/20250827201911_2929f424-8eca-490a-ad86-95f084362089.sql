-- Add foreign key relationships for user_id columns to profiles table
ALTER TABLE battle_participants 
ADD CONSTRAINT fk_battle_participants_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE battle_submissions 
ADD CONSTRAINT fk_battle_submissions_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE battle_votes 
ADD CONSTRAINT fk_battle_votes_voter_id 
FOREIGN KEY (voter_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Add foreign key relationships between battle tables
ALTER TABLE battle_participants 
ADD CONSTRAINT fk_battle_participants_battle_id 
FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE CASCADE;

ALTER TABLE battle_submissions 
ADD CONSTRAINT fk_battle_submissions_battle_id 
FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE CASCADE;

ALTER TABLE battle_votes 
ADD CONSTRAINT fk_battle_votes_battle_id 
FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE CASCADE;

ALTER TABLE battle_votes 
ADD CONSTRAINT fk_battle_votes_submission_id 
FOREIGN KEY (submission_id) REFERENCES battle_submissions(id) ON DELETE CASCADE;