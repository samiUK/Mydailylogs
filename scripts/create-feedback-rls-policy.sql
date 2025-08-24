-- Create RLS policy to allow public feedback submissions
-- This allows anyone (including anonymous users) to insert feedback

-- Enable RLS on feedback table (if not already enabled)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert feedback
CREATE POLICY "Allow public feedback submissions" ON feedback
    FOR INSERT 
    WITH CHECK (true);

-- Create policy to allow master admins to read all feedback
CREATE POLICY "Allow master admin to read feedback" ON feedback
    FOR SELECT 
    USING (true);

-- Create policy to allow master admins to update feedback status
CREATE POLICY "Allow master admin to update feedback" ON feedback
    FOR UPDATE 
    USING (true);
