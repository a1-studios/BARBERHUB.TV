-- Battle Reactions Table
CREATE TABLE battle_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES barber_profiles(id),
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '❤️', '😱', '💯', '✂️', '👏', '🎉', '🤩')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_battle_reactions_battle ON battle_reactions(battle_id, created_at DESC);
CREATE INDEX idx_battle_reactions_user ON battle_reactions(user_id);

ALTER TABLE battle_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions"
  ON battle_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add reactions"
  ON battle_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Battle Chat Messages Table
CREATE TABLE battle_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 300),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_battle ON battle_chat_messages(battle_id, created_at DESC);

ALTER TABLE battle_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view messages"
  ON battle_chat_messages FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Users can send messages"
  ON battle_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON battle_chat_messages FOR UPDATE
  USING (auth.uid() = user_id);

-- User Vote Combos Table
CREATE TABLE user_vote_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  combo_count INTEGER NOT NULL DEFAULT 1,
  bonus_bb_earned INTEGER NOT NULL DEFAULT 0,
  last_vote_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_combos_user ON user_vote_combos(user_id, battle_id);

ALTER TABLE user_vote_combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own combos"
  ON user_vote_combos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage combos"
  ON user_vote_combos FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE battle_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_chat_messages;