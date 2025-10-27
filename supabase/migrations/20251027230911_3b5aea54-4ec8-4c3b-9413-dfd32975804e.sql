-- Enable realtime for community_notes table
ALTER TABLE community_notes REPLICA IDENTITY FULL;

-- Add community_notes to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE community_notes;