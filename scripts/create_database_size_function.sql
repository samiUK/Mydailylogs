-- Create a function to get the database size
-- This function returns the total database size in a human-readable format

CREATE OR REPLACE FUNCTION get_database_size()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    db_size BIGINT;
    result TEXT;
BEGIN
    -- Get the size of the current database in bytes
    SELECT pg_database_size(current_database()) INTO db_size;
    
    -- Convert to human-readable format
    IF db_size >= 1073741824 THEN
        result := ROUND(db_size::NUMERIC / 1073741824, 2) || ' GB';
    ELSIF db_size >= 1048576 THEN
        result := ROUND(db_size::NUMERIC / 1048576, 2) || ' MB';
    ELSIF db_size >= 1024 THEN
        result := ROUND(db_size::NUMERIC / 1024, 2) || ' KB';
    ELSE
        result := db_size || ' bytes';
    END IF;
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_database_size() TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_size() TO service_role;
