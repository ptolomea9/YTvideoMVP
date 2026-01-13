-- =====================================================
-- Edge AI Luxury Video Suite - Initial Database Schema
-- =====================================================
-- Run this migration in Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql

-- =====================================================
-- Helper Functions
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PROFILES TABLE
-- =====================================================
-- User metadata and agency branding
-- Linked 1:1 with auth.users

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  agency_logo_url TEXT,
  agency_name TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'agency')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamp trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- LISTINGS TABLE
-- =====================================================
-- Property data for video generation

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  price INTEGER,
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  sqft INTEGER,
  property_type TEXT CHECK (property_type IN ('single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial', 'other')),
  description TEXT,
  neighborhood_pois JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);

-- Auto-update timestamp trigger
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIDEOS TABLE
-- =====================================================
-- Generated video records with status tracking

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'sorting_images',
    'generating_motion',
    'generating_audio',
    'rendering',
    'completed',
    'failed'
  )),
  script_sections JSONB DEFAULT '[]'::jsonb,
  voice_id TEXT,
  music_enabled BOOLEAN DEFAULT TRUE,
  branded_url TEXT,
  unbranded_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  error_message TEXT,
  n8n_execution_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_listing_id ON videos(listing_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);

-- Auto-update timestamp trigger
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREDITS TABLE
-- =====================================================
-- Subscription-based usage tracking (append-only ledger)

CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'subscription_renewal',
    'video_generation',
    'overage_purchase',
    'manual_adjustment',
    'refund'
  )),
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user balance queries
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);

-- =====================================================
-- COMMENTS
-- =====================================================
-- Table structure:
-- - profiles: User metadata linked to Supabase Auth
-- - listings: Property data entered in wizard Step 1
-- - videos: Generated video records with full status tracking
-- - credits: Append-only ledger for subscription/usage tracking
--
-- Next step: Apply RLS policies from 002_rls_policies.sql
