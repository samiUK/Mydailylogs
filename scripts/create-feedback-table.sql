-- Create feedback table for storing user feedback
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'Feedback!',
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for feedback table
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow service role to access all feedback (for master admin)
CREATE POLICY "Service role can access all feedback" ON feedback
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated users to insert their own feedback
CREATE POLICY "Users can insert their own feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
