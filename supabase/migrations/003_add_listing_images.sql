-- =====================================================
-- Add images column to listings table
-- =====================================================
-- Stores the WizardImage array as JSONB for video generation
-- Each image contains: id, url, filename, order, label, roomType, features, enhancement

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN listings.images IS 'Array of WizardImage objects with url, label, roomType, features, and enhancement settings';
