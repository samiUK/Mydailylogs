-- Create superusers table for CS agent management
CREATE TABLE IF NOT EXISTS superusers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on superusers table
ALTER TABLE superusers ENABLE ROW LEVEL SECURITY;

-- Create policy for superuser access (only master admin can manage)
CREATE POLICY "Master admin can manage superusers" ON superusers
  FOR ALL USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_superusers_email ON superusers(email);
CREATE INDEX IF NOT EXISTS idx_superusers_active ON superusers(is_active);
