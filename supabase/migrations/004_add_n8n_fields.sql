-- =====================================================
-- Migration 004: Add n8n Integration Fields
-- =====================================================
-- Adds fields to videos table for n8n workflow debugging and tracking

-- Add n8n_payload to store the transformed webhook payload (for debugging)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS n8n_payload JSONB;

-- Add n8n_webhook_url to track which webhook endpoint was used
ALTER TABLE videos ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT;

-- Add mls_dual_output flag for dual render (branded + unbranded)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mls_dual_output BOOLEAN DEFAULT TRUE;

-- Comment the new columns
COMMENT ON COLUMN videos.n8n_payload IS 'Transformed payload sent to n8n webhook (for debugging)';
COMMENT ON COLUMN videos.n8n_webhook_url IS 'n8n webhook URL used to trigger this video';
COMMENT ON COLUMN videos.mls_dual_output IS 'Whether to render both branded and unbranded versions';
