-- Impersonation tokens table already exists in database
-- This script ensures indexes and cleanup function are in place

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_token ON public.impersonation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_expires_at ON public.impersonation_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_organization ON public.impersonation_tokens(organization_id);

-- Auto-cleanup expired tokens (runs daily)
CREATE OR REPLACE FUNCTION cleanup_expired_impersonation_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.impersonation_tokens
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Impersonation tokens table is ready!';
END $$;
