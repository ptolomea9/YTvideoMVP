-- =====================================================
-- Edge AI Luxury Video Suite - Row Level Security Policies
-- =====================================================
-- Run this migration AFTER 001_initial_schema.sql
-- https://supabase.com/dashboard/project/_/sql

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================
-- Users can only access their own profile
-- INSERT handled by trigger on auth.users creation

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- LISTINGS POLICIES
-- =====================================================
-- Users have full CRUD on their own listings

CREATE POLICY "Users can read own listings"
  ON listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
  ON listings FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- VIDEOS POLICIES
-- =====================================================
-- Users can read/create/update their own videos
-- No DELETE - videos are permanent records

CREATE POLICY "Users can read own videos"
  ON videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own videos"
  ON videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos"
  ON videos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: No DELETE policy - videos are permanent records for audit trail

-- =====================================================
-- CREDITS POLICIES
-- =====================================================
-- Users can only read their credit history
-- INSERT is service role only (webhooks/server actions)
-- No UPDATE/DELETE - append-only ledger

CREATE POLICY "Users can read own credits"
  ON credits FOR SELECT
  USING (auth.uid() = user_id);

-- Note: Credits INSERT is handled by service role (server-side only)
-- No policies for INSERT/UPDATE/DELETE to enforce append-only pattern

-- =====================================================
-- PROFILE CREATION TRIGGER
-- =====================================================
-- Auto-create profile when user signs up via Supabase Auth

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- COMMENTS
-- =====================================================
-- RLS Pattern: User isolation (auth.uid() = user_id)
--
-- Security notes:
-- - Profiles: READ/UPDATE only (INSERT via trigger)
-- - Listings: Full CRUD for owner
-- - Videos: No DELETE (audit trail)
-- - Credits: READ only (append-only ledger, INSERT via service role)
--
-- Future: Agency team access patterns are OUT OF SCOPE for MVP
-- When needed, add agency_id to profiles and adjust policies
