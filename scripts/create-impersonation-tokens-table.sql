-- Create impersonation tokens table for secure, short-lived access links
CREATE TABLE IF NOT EXISTS impersonation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  -- Support both master admin and superuser (admin) authentication
  created_by_email TEXT NOT NULL,
  created_by_type TEXT NOT NULL CHECK (created_by_type IN ('master_admin', 'superuser')),
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_email TEXT NOT NULL,
  target_user_role TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  ip_address INET,
  user_agent TEXT
);

-- Add index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_token ON impersonation_tokens(token) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_expires ON impersonation_tokens(expires_at) WHERE is_active = TRUE;

-- RLS policies
ALTER TABLE impersonation_tokens ENABLE ROW LEVEL SECURITY;

-- Allow service role (used by API routes) to manage impersonation tokens
CREATE POLICY "Service role can manage impersonation tokens"
ON impersonation_tokens FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- Anyone (including anon) can read valid, non-expired tokens for verification
CREATE POLICY "Anyone can read valid tokens"
ON impersonation_tokens FOR SELECT
TO anon, authenticated
USING (
  is_active = TRUE 
  AND expires_at > NOW()
);

-- Anyone can update tokens to mark as used (needed for token consumption)
CREATE POLICY "Anyone can mark tokens as used"
ON impersonation_tokens FOR UPDATE
TO anon, authenticated
USING (
  is_active = TRUE 
  AND expires_at > NOW()
  AND used_at IS NULL
)
WITH CHECK (
  used_at IS NOT NULL
);

-- Clean up expired tokens automatically (run this as a cron job or manually)
CREATE OR REPLACE FUNCTION cleanup_expired_impersonation_tokens()
RETURNS void AS $$
BEGIN
  UPDATE impersonation_tokens
  SET is_active = FALSE
  WHERE expires_at < NOW() AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE impersonation_tokens IS 'Stores secure, short-lived tokens for admin impersonation (both master admins and superusers)';
COMMENT ON FUNCTION cleanup_expired_impersonation_tokens IS 'Deactivates expired impersonation tokens';
