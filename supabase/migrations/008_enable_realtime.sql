-- =====================================================
-- Enable Supabase Realtime for Videos Table
-- =====================================================
-- Required for video status notifications via WebSocket

-- Add videos table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE videos;

-- =====================================================
-- COMMENTS
-- =====================================================
-- This enables Supabase Realtime for the videos table.
-- Clients can subscribe to INSERT, UPDATE, DELETE events.
--
-- Usage in client:
-- supabase.channel('videos')
--   .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos' }, callback)
--   .subscribe()
--
-- Filter by user_id to receive only relevant updates:
-- filter: 'user_id=eq.{userId}'
