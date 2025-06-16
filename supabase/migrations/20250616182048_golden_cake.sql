/*
  # Fix Missing Database Tables and Functions

  1. New Tables
    - `chat_interactions` - Store chat conversation data
    - `user_sessions` - Track user session information  
    - `prompt_variants` - A/B testing for different prompts
    - `performance_metrics` - Aggregated performance data
    - `popular_questions` - Most frequently asked questions

  2. Extensions
    - Enable pg_trgm for text similarity functions

  3. Security
    - Enable RLS on all tables
    - Add appropriate policies for public access

  4. Functions and Triggers
    - Auto-update timestamps
    - Popular questions aggregation
*/

-- Enable pg_trgm extension for text similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create chat_interactions table
CREATE TABLE IF NOT EXISTS chat_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  thread_id text,
  user_message text NOT NULL,
  assistant_message text,
  response_time_ms integer,
  success boolean DEFAULT true,
  error_message text,
  prompt_variant_id uuid,
  question_category text,
  user_satisfaction integer CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for chat_interactions
CREATE INDEX IF NOT EXISTS idx_chat_interactions_session_id ON chat_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_interactions_created_at ON chat_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_interactions_category ON chat_interactions(question_category);
CREATE INDEX IF NOT EXISTS idx_chat_interactions_success ON chat_interactions(success);

-- Enable RLS and create policies for chat_interactions
ALTER TABLE chat_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public can insert chat interactions"
  ON chat_interactions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Public can read chat interactions"
  ON chat_interactions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY IF NOT EXISTS "Public can update chat interactions"
  ON chat_interactions
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  user_agent text,
  ip_address inet,
  country text,
  city text,
  started_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  total_interactions integer DEFAULT 0,
  session_duration_minutes integer,
  ended_at timestamptz
);

-- Create indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at);

-- Enable RLS and create policies for user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public can insert user sessions"
  ON user_sessions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Public can read user sessions"
  ON user_sessions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY IF NOT EXISTS "Public can update user sessions"
  ON user_sessions
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create prompt_variants table
CREATE TABLE IF NOT EXISTS prompt_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  prompt_content text NOT NULL,
  is_active boolean DEFAULT true,
  traffic_percentage integer DEFAULT 50 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for prompt_variants
CREATE INDEX IF NOT EXISTS idx_prompt_variants_active ON prompt_variants(is_active);

-- Enable RLS and create policies for prompt_variants
ALTER TABLE prompt_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "App can read active prompt variants"
  ON prompt_variants
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Insert default prompt variants
INSERT INTO prompt_variants (name, description, prompt_content, is_active, traffic_percentage)
VALUES
('Default', 'Standard prompt instructions', 'Jesteś CareerGPT - ekspertem od polskiego rynku pracy i kariery zawodowej.', true, 100)
ON CONFLICT (name) DO NOTHING;

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_value numeric NOT NULL,
  time_period text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  additional_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance_metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_period ON performance_metrics(metric_type, time_period, period_start);

-- Enable RLS and create policies for performance_metrics
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public read access to performance metrics"
  ON performance_metrics
  FOR SELECT
  TO public
  USING (true);

-- Create popular_questions table
CREATE TABLE IF NOT EXISTS popular_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  question_category text NOT NULL,
  question_count integer DEFAULT 1,
  avg_response_time_ms numeric,
  avg_satisfaction numeric,
  last_asked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for popular_questions
CREATE INDEX IF NOT EXISTS idx_popular_questions_category ON popular_questions(question_category);
CREATE INDEX IF NOT EXISTS idx_popular_questions_count ON popular_questions(question_count DESC);

-- Enable RLS and create policies for popular_questions
ALTER TABLE popular_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public read access to popular questions"
  ON popular_questions
  FOR SELECT
  TO public
  USING (true);

-- Create or replace function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to update popular questions
CREATE OR REPLACE FUNCTION update_popular_questions()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update popular questions based on new chat interaction
    INSERT INTO popular_questions (question_text, question_category, question_count, avg_response_time_ms, last_asked_at)
    VALUES (
        NEW.user_message,
        COALESCE(NEW.question_category, 'general'),
        1,
        NEW.response_time_ms,
        NEW.created_at
    )
    ON CONFLICT (question_text) DO UPDATE SET
        question_count = popular_questions.question_count + 1,
        avg_response_time_ms = CASE 
            WHEN NEW.response_time_ms IS NOT NULL THEN 
                (COALESCE(popular_questions.avg_response_time_ms, 0) * popular_questions.question_count + NEW.response_time_ms) / (popular_questions.question_count + 1)
            ELSE popular_questions.avg_response_time_ms
        END,
        last_asked_at = NEW.created_at,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_chat_interactions_updated_at'
    ) THEN
        CREATE TRIGGER set_chat_interactions_updated_at
        BEFORE UPDATE ON chat_interactions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_prompt_variants_updated_at'
    ) THEN
        CREATE TRIGGER set_prompt_variants_updated_at
        BEFORE UPDATE ON prompt_variants
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_popular_questions_updated_at'
    ) THEN
        CREATE TRIGGER set_popular_questions_updated_at
        BEFORE UPDATE ON popular_questions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_popular_questions'
    ) THEN
        CREATE TRIGGER trigger_update_popular_questions
        BEFORE INSERT ON chat_interactions
        FOR EACH ROW
        EXECUTE FUNCTION update_popular_questions();
    END IF;
END $$;