-- Create system_config table for storing system-wide configuration
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Only service role can access system config
CREATE POLICY "Service role can manage system config"
  ON system_config
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial pause tracking
INSERT INTO system_config (key, value)
VALUES ('last_supabase_pause', NOW()::TEXT)
ON CONFLICT (key) DO NOTHING;
