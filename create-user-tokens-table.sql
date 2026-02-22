-- Create user_tokens table for storing Google OAuth tokens
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_tokens (
  user_id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_expires_at ON user_tokens(expires_at);

-- Add comment
COMMENT ON TABLE user_tokens IS 'Stores Google OAuth tokens for calendar export functionality';

-- Enable Row Level Security (optional - adjust based on your needs)
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
-- IMPORTANT: Adjust this policy based on your security requirements
CREATE POLICY "Enable all operations for authenticated users"
  ON user_tokens
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- If you want to allow service role (backend) full access
CREATE POLICY "Enable all operations for service role"
  ON user_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
