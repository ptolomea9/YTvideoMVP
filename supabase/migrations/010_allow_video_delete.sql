-- =====================================================
-- Allow users to delete their own videos
-- =====================================================
-- This migration adds DELETE policy for videos table
-- Previously videos were treated as permanent audit records

CREATE POLICY "Users can delete own videos"
  ON videos FOR DELETE
  USING (auth.uid() = user_id);
