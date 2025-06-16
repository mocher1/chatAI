/*
  # Tabele dla integracji z rynkiem pracy

  1. Nowe tabele
    - `job_offers` - oferty pracy z portali rekrutacyjnych
    - `market_trends` - trendy rynkowe dla umiejętności
    - `job_categories` - kategorie zawodowe
    - `scraping_logs` - logi procesu scrapingu

  2. Indeksy wydajnościowe
    - GIN indeksy dla JSONB i wyszukiwania pełnotekstowego
    - B-tree indeksy dla często używanych kolumn

  3. Bezpieczeństwo
    - RLS włączone dla wszystkich tabel
    - Publiczny dostęp do odczytu
    - Authenticated dostęp do zapisu (Edge Functions)

  4. Automatyzacja
    - Triggery dla auto-update timestamp
    - Podstawowe kategorie zawodowe
*/

-- Tabela ofert pracy
CREATE TABLE IF NOT EXISTS job_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  salary_min integer,
  salary_max integer,
  salary_currency text DEFAULT 'PLN',
  employment_type text, -- 'full-time', 'part-time', 'contract', 'internship'
  experience_level text, -- 'junior', 'mid', 'senior', 'lead'
  requirements jsonb DEFAULT '[]'::jsonb,
  nice_to_have jsonb DEFAULT '[]'::jsonb,
  benefits jsonb DEFAULT '[]'::jsonb,
  description text,
  technologies jsonb DEFAULT '[]'::jsonb,
  source_portal text NOT NULL DEFAULT 'justjoin',
  source_url text,
  posted_date timestamptz,
  scraped_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela trendów rynkowych
CREATE TABLE IF NOT EXISTS market_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name text NOT NULL,
  skill_category text DEFAULT 'other', -- 'programming', 'framework', 'database', 'tool', 'soft-skill'
  demand_score numeric DEFAULT 0, -- 0-100, jak często wymagana
  avg_salary_min numeric,
  avg_salary_max numeric,
  job_count integer DEFAULT 0, -- ile ofert zawiera tę umiejętność
  period_start date NOT NULL,
  period_end date NOT NULL,
  location text DEFAULT 'all', -- 'warszawa', 'krakow', 'wroclaw', 'gdansk', 'poznan', 'all'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela kategorii zawodowych
CREATE TABLE IF NOT EXISTS job_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  parent_category_id uuid REFERENCES job_categories(id),
  keywords jsonb DEFAULT '[]'::jsonb, -- słowa kluczowe do kategoryzacji
  created_at timestamptz DEFAULT now()
);

-- Tabela logów scrapingu
CREATE TABLE IF NOT EXISTS scraping_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_portal text NOT NULL,
  status text NOT NULL, -- 'success', 'error', 'partial'
  offers_scraped integer DEFAULT 0,
  offers_new integer DEFAULT 0,
  offers_updated integer DEFAULT 0,
  error_message text,
  execution_time_ms integer,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Indeksy wydajnościowe
CREATE INDEX IF NOT EXISTS idx_job_offers_technologies ON job_offers USING GIN (technologies);
CREATE INDEX IF NOT EXISTS idx_job_offers_location ON job_offers(location);
CREATE INDEX IF NOT EXISTS idx_job_offers_posted_date ON job_offers(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_job_offers_salary ON job_offers(salary_min, salary_max);
CREATE INDEX IF NOT EXISTS idx_job_offers_source ON job_offers(source_portal, is_active);
CREATE INDEX IF NOT EXISTS idx_job_offers_external_id ON job_offers(external_id);

CREATE INDEX IF NOT EXISTS idx_market_trends_skill ON market_trends(skill_name, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_market_trends_location ON market_trends(location, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_market_trends_category ON market_trends(skill_category, demand_score DESC);

CREATE INDEX IF NOT EXISTS idx_scraping_logs_portal ON scraping_logs(source_portal, started_at DESC);

-- Wyszukiwanie pełnotekstowe (używamy 'simple' zamiast 'polish')
CREATE INDEX IF NOT EXISTS idx_job_offers_search ON job_offers USING GIN (
  to_tsvector('simple', title || ' ' || company || ' ' || COALESCE(description, ''))
);

-- Enable RLS
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_logs ENABLE ROW LEVEL SECURITY;

-- Polityki RLS - publiczny dostęp do odczytu
CREATE POLICY "Public read access to job offers"
  ON job_offers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access to market trends"
  ON market_trends
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access to job categories"
  ON job_categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access to scraping logs"
  ON scraping_logs
  FOR SELECT
  TO public
  USING (true);

-- Polityki dla Edge Functions (authenticated role)
CREATE POLICY "Edge Functions can insert job offers"
  ON job_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Edge Functions can update job offers"
  ON job_offers
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Edge Functions can insert market trends"
  ON market_trends
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Edge Functions can update market trends"
  ON market_trends
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Edge Functions can insert scraping logs"
  ON scraping_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Edge Functions can update scraping logs"
  ON scraping_logs
  FOR UPDATE
  TO authenticated
  USING (true);

-- Funkcja do automatycznego update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggery dla auto-update timestamp
CREATE TRIGGER update_job_offers_updated_at 
  BEFORE UPDATE ON job_offers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_trends_updated_at 
  BEFORE UPDATE ON market_trends 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Wstaw podstawowe kategorie zawodowe
INSERT INTO job_categories (name, keywords) VALUES
('Frontend Development', '["react", "vue", "angular", "javascript", "typescript", "css", "html", "frontend"]'),
('Backend Development', '["node.js", "python", "java", "php", "ruby", "backend", "api", "server"]'),
('Full Stack Development', '["full stack", "fullstack", "full-stack"]'),
('Mobile Development', '["react native", "flutter", "ios", "android", "mobile", "swift", "kotlin"]'),
('DevOps', '["docker", "kubernetes", "aws", "azure", "devops", "ci/cd", "jenkins"]'),
('Data Science', '["python", "r", "machine learning", "data science", "analytics", "sql"]'),
('QA/Testing', '["testing", "qa", "quality assurance", "selenium", "cypress"]'),
('UI/UX Design', '["ui", "ux", "design", "figma", "sketch", "adobe"]'),
('Project Management', '["project manager", "scrum master", "agile", "pm"]'),
('Cybersecurity', '["security", "cybersecurity", "penetration testing", "infosec"]')
ON CONFLICT (name) DO NOTHING;