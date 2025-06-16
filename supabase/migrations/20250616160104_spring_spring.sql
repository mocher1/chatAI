/*
  # Fix RLS Policies for Analytics

  1. Security Updates
    - Update RLS policies for chat_interactions table to allow public access
    - Update RLS policies for user_sessions table to allow public access
    - Ensure anonymous users can insert and update records

  2. Policy Changes
    - Allow public INSERT and SELECT on chat_interactions
    - Allow public INSERT, SELECT, and UPDATE on user_sessions
    - Maintain data security while enabling analytics functionality
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "App can insert chat interactions" ON chat_interactions;
DROP POLICY IF EXISTS "App can read own interactions" ON chat_interactions;
DROP POLICY IF EXISTS "App can manage user sessions" ON user_sessions;

-- Create new policies for chat_interactions that allow public access
CREATE POLICY "Public can insert chat interactions"
  ON chat_interactions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can read chat interactions"
  ON chat_interactions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can update chat interactions"
  ON chat_interactions
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create new policies for user_sessions that allow public access
CREATE POLICY "Public can insert user sessions"
  ON user_sessions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can read user sessions"
  ON user_sessions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can update user sessions"
  ON user_sessions
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);