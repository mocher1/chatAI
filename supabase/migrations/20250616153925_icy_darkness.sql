/*
  # System monitoringu i analityki CareerGPT

  1. Nowe tabele
    - `chat_interactions` - logowanie wszystkich interakcji z chatem
    - `prompt_variants` - różne wersje promptów do A/B testingu
    - `performance_metrics` - metryki wydajności systemu
    - `popular_questions` - analiza popularnych pytań
    - `user_sessions` - śledzenie sesji użytkowników

  2. Bezpieczeństwo
    - Włączenie RLS na wszystkich tabelach
    - Polityki dostępu dla różnych ról
    - Indeksy dla wydajności zapytań

  3. Funkcje analityczne
    - Automatyczne kategoryzowanie pytań
    - Obliczanie metryk wydajności
    - Generowanie raportów
*/

-- Tabela interakcji z chatem
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

-- Tabela wariantów promptów dla A/B testingu
CREATE TABLE IF NOT EXISTS prompt_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  prompt_content text NOT NULL,
  is_active boolean DEFAULT true,
  traffic_percentage integer DEFAULT 50 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela metryk wydajności
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL, -- 'response_time', 'success_rate', 'error_rate', 'user_satisfaction'
  metric_value numeric NOT NULL,
  time_period text NOT NULL, -- 'hourly', 'daily', 'weekly'
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  additional_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tabela popularnych pytań
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

-- Tabela sesji użytkowników
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
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

-- Włączenie RLS
ALTER TABLE chat_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE popular_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Polityki RLS - dostęp dla wszystkich do odczytu metryk publicznych
CREATE POLICY "Public read access to performance metrics"
  ON performance_metrics
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access to popular questions"
  ON popular_questions
  FOR SELECT
  TO public
  USING (true);

-- Polityki dla aplikacji (authenticated users)
CREATE POLICY "App can insert chat interactions"
  ON chat_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "App can read own interactions"
  ON chat_interactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "App can read active prompt variants"
  ON prompt_variants
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "App can manage user sessions"
  ON user_sessions
  FOR ALL
  TO authenticated
  USING (true);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_chat_interactions_session_id ON chat_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_interactions_created_at ON chat_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_interactions_category ON chat_interactions(question_category);
CREATE INDEX IF NOT EXISTS idx_chat_interactions_success ON chat_interactions(success);

CREATE INDEX IF NOT EXISTS idx_prompt_variants_active ON prompt_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_period ON performance_metrics(metric_type, time_period, period_start);
CREATE INDEX IF NOT EXISTS idx_popular_questions_category ON popular_questions(question_category);
CREATE INDEX IF NOT EXISTS idx_popular_questions_count ON popular_questions(question_count DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);

-- Funkcja do automatycznego kategoryzowania pytań
CREATE OR REPLACE FUNCTION categorize_question(question_text text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Kategoryzacja na podstawie słów kluczowych
  IF question_text ~* '\b(cv|życiorys|curriculum)\b' THEN
    RETURN 'CV';
  ELSIF question_text ~* '\b(rozmowa|rekrutacja|interview)\b' THEN
    RETURN 'Rozmowa kwalifikacyjna';
  ELSIF question_text ~* '\b(wynagrodzenie|pensja|zarobki|płaca)\b' THEN
    RETURN 'Wynagrodzenie';
  ELSIF question_text ~* '\b(kariera|awans|rozwój)\b' THEN
    RETURN 'Rozwój kariery';
  ELSIF question_text ~* '\b(zmiana|nowa praca|przejście)\b' THEN
    RETURN 'Zmiana pracy';
  ELSIF question_text ~* '\b(prawo|kodeks|umowa)\b' THEN
    RETURN 'Prawo pracy';
  ELSE
    RETURN 'Inne';
  END IF;
END;
$$;

-- Funkcja do aktualizacji popularnych pytań
CREATE OR REPLACE FUNCTION update_popular_questions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  question_cat text;
  similar_question_id uuid;
BEGIN
  -- Kategoryzuj pytanie
  question_cat := categorize_question(NEW.user_message);
  NEW.question_category := question_cat;

  -- Sprawdź czy podobne pytanie już istnieje
  SELECT id INTO similar_question_id
  FROM popular_questions
  WHERE question_category = question_cat
    AND similarity(question_text, NEW.user_message) > 0.7
  ORDER BY similarity(question_text, NEW.user_message) DESC
  LIMIT 1;

  IF similar_question_id IS NOT NULL THEN
    -- Aktualizuj istniejące pytanie
    UPDATE popular_questions
    SET question_count = question_count + 1,
        last_asked_at = now(),
        updated_at = now()
    WHERE id = similar_question_id;
  ELSE
    -- Dodaj nowe pytanie
    INSERT INTO popular_questions (question_text, question_category, question_count)
    VALUES (NEW.user_message, question_cat, 1);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger do automatycznego kategoryzowania i śledzenia popularnych pytań
CREATE OR REPLACE TRIGGER trigger_update_popular_questions
  BEFORE INSERT ON chat_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_popular_questions();

-- Funkcja do obliczania metryk wydajności
CREATE OR REPLACE FUNCTION calculate_performance_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_hour timestamptz;
  hour_start timestamptz;
  hour_end timestamptz;
  avg_response_time numeric;
  success_rate numeric;
  total_interactions integer;
  successful_interactions integer;
BEGIN
  current_hour := date_trunc('hour', now());
  hour_start := current_hour;
  hour_end := current_hour + interval '1 hour';

  -- Oblicz średni czas odpowiedzi
  SELECT AVG(response_time_ms), COUNT(*), COUNT(*) FILTER (WHERE success = true)
  INTO avg_response_time, total_interactions, successful_interactions
  FROM chat_interactions
  WHERE created_at >= hour_start AND created_at < hour_end;

  IF total_interactions > 0 THEN
    -- Zapisz metryki czasu odpowiedzi
    INSERT INTO performance_metrics (metric_type, metric_value, time_period, period_start, period_end)
    VALUES ('response_time', COALESCE(avg_response_time, 0), 'hourly', hour_start, hour_end);

    -- Oblicz i zapisz success rate
    success_rate := (successful_interactions::numeric / total_interactions::numeric) * 100;
    INSERT INTO performance_metrics (metric_type, metric_value, time_period, period_start, period_end)
    VALUES ('success_rate', success_rate, 'hourly', hour_start, hour_end);

    -- Zapisz liczbę interakcji
    INSERT INTO performance_metrics (metric_type, metric_value, time_period, period_start, period_end)
    VALUES ('total_interactions', total_interactions, 'hourly', hour_start, hour_end);
  END IF;
END;
$$;

-- Wstaw domyślne warianty promptów
INSERT INTO prompt_variants (name, description, prompt_content, traffic_percentage) VALUES
('default', 'Standardowy prompt CareerGPT', 'Jesteś CareerGPT - ekspertem od polskiego rynku pracy i doradcą zawodowym...', 50),
('enhanced', 'Ulepszony prompt z większym naciskiem na praktyczne przykłady', 'Jesteś CareerGPT - ekspertem od polskiego rynku pracy. Zawsze podawaj konkretne przykłady...', 50)
ON CONFLICT (name) DO NOTHING;