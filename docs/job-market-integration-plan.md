# Plan implementacji integracji z rynkiem pracy

## 🎯 Cel projektu

Wzbogacenie CareerGPT o aktualne dane z polskiego rynku pracy poprzez automatyczne zbieranie i analizę ogłoszeń o pracę z głównych portali rekrutacyjnych.

## 📋 Faza 1: Proof of Concept (2-3 tygodnie)

### 1.1 Przygotowanie infrastruktury

**Nowe tabele w bazie danych:**
```sql
-- Tabela ofert pracy
CREATE TABLE job_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE, -- ID z portalu źródłowego
  title text NOT NULL,
  company text NOT NULL,
  location text,
  salary_min integer,
  salary_max integer,
  salary_currency text DEFAULT 'PLN',
  employment_type text, -- 'full-time', 'part-time', 'contract', 'internship'
  experience_level text, -- 'junior', 'mid', 'senior', 'lead'
  requirements jsonb, -- lista wymagań
  nice_to_have jsonb, -- lista nice-to-have
  benefits jsonb, -- lista benefitów
  description text,
  technologies jsonb, -- lista technologii
  source_portal text NOT NULL, -- 'justjoin', 'pracuj', 'nofluff'
  source_url text,
  posted_date timestamptz,
  scraped_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tabela trendów rynkowych
CREATE TABLE market_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name text NOT NULL,
  skill_category text, -- 'programming', 'framework', 'tool', 'soft-skill'
  demand_score numeric, -- 0-100, jak często wymagana
  avg_salary_min numeric,
  avg_salary_max numeric,
  job_count integer, -- ile ofert zawiera tę umiejętność
  period_start date NOT NULL,
  period_end date NOT NULL,
  location text, -- 'warszawa', 'krakow', 'wroclaw', 'gdansk', 'poznan', 'all'
  created_at timestamptz DEFAULT now()
);

-- Tabela kategorii zawodowych
CREATE TABLE job_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  parent_category_id uuid REFERENCES job_categories(id),
  keywords jsonb, -- słowa kluczowe do kategoryzacji
  created_at timestamptz DEFAULT now()
);
```

**Indeksy dla wydajności:**
```sql
CREATE INDEX idx_job_offers_technologies ON job_offers USING GIN (technologies);
CREATE INDEX idx_job_offers_location ON job_offers(location);
CREATE INDEX idx_job_offers_posted_date ON job_offers(posted_date);
CREATE INDEX idx_job_offers_salary ON job_offers(salary_min, salary_max);
CREATE INDEX idx_market_trends_skill ON market_trends(skill_name, period_start);
```

### 1.2 Implementacja scrapera

**Edge Function: job-scraper**
```typescript
// supabase/functions/job-scraper/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface JobOffer {
  externalId: string;
  title: string;
  company: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  employmentType?: string;
  experienceLevel?: string;
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  description: string;
  technologies: string[];
  sourcePortal: string;
  sourceUrl: string;
  postedDate: string;
}

class JobScraper {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    this.supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  }

  async scrapeJustJoinIt(): Promise<JobOffer[]> {
    try {
      // JustJoin.it ma publiczne API
      const response = await fetch('https://api.justjoin.it/v2/user-panel/offers');
      const data = await response.json();
      
      return data.data.map((offer: any) => ({
        externalId: offer.id,
        title: offer.title,
        company: offer.companyName,
        location: offer.city,
        salaryMin: offer.employmentTypes?.[0]?.salary?.from,
        salaryMax: offer.employmentTypes?.[0]?.salary?.to,
        employmentType: offer.employmentTypes?.[0]?.type,
        experienceLevel: offer.experienceLevel,
        requirements: this.extractRequirements(offer.body),
        niceToHave: this.extractNiceToHave(offer.body),
        benefits: [],
        description: offer.body,
        technologies: offer.requiredSkills?.map((skill: any) => skill.name) || [],
        sourcePortal: 'justjoin',
        sourceUrl: `https://justjoin.it/offers/${offer.id}`,
        postedDate: offer.publishedAt,
      }));
    } catch (error) {
      console.error('Error scraping JustJoin.it:', error);
      return [];
    }
  }

  async scrapePracujPl(): Promise<JobOffer[]> {
    // Implementacja dla Pracuj.pl (wymaga bardziej zaawansowanego scrapingu)
    // Używamy headless browser lub proxy service
    return [];
  }

  private extractRequirements(description: string): string[] {
    // Regex do wyciągania wymagań z opisu
    const requirementPatterns = [
      /wymagania:?\s*([^\.]+)/gi,
      /wymagamy:?\s*([^\.]+)/gi,
      /musisz znać:?\s*([^\.]+)/gi,
    ];
    
    const requirements: string[] = [];
    requirementPatterns.forEach(pattern => {
      const matches = description.match(pattern);
      if (matches) {
        requirements.push(...matches);
      }
    });
    
    return requirements;
  }

  private extractNiceToHave(description: string): string[] {
    const niceToHavePatterns = [
      /mile widziane:?\s*([^\.]+)/gi,
      /dodatkowo:?\s*([^\.]+)/gi,
      /nice to have:?\s*([^\.]+)/gi,
    ];
    
    const niceToHave: string[] = [];
    niceToHavePatterns.forEach(pattern => {
      const matches = description.match(pattern);
      if (matches) {
        niceToHave.push(...matches);
      }
    });
    
    return niceToHave;
  }

  async saveOffers(offers: JobOffer[]): Promise<void> {
    for (const offer of offers) {
      try {
        await fetch(`${this.supabaseUrl}/rest/v1/job_offers`, {
          method: 'POST',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            external_id: offer.externalId,
            title: offer.title,
            company: offer.company,
            location: offer.location,
            salary_min: offer.salaryMin,
            salary_max: offer.salaryMax,
            employment_type: offer.employmentType,
            experience_level: offer.experienceLevel,
            requirements: offer.requirements,
            nice_to_have: offer.niceToHave,
            benefits: offer.benefits,
            description: offer.description,
            technologies: offer.technologies,
            source_portal: offer.sourcePortal,
            source_url: offer.sourceUrl,
            posted_date: offer.postedDate,
          }),
        });
      } catch (error) {
        console.error('Error saving offer:', error);
      }
    }
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const scraper = new JobScraper();
    
    // Scrape z różnych źródeł
    const [justJoinOffers] = await Promise.all([
      scraper.scrapeJustJoinIt(),
      // scraper.scrapePracujPl(), // Dodamy w kolejnej iteracji
    ]);

    const allOffers = [...justJoinOffers];
    
    // Zapisz oferty do bazy
    await scraper.saveOffers(allOffers);

    return new Response(
      JSON.stringify({ 
        success: true, 
        offersScraped: allOffers.length,
        sources: ['justjoin.it']
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scraping error:', error);
    return new Response(
      JSON.stringify({ error: 'Scraping failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 1.3 Analiza danych i generowanie trendów

**Edge Function: market-analyzer**
```typescript
// supabase/functions/market-analyzer/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

class MarketAnalyzer {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    this.supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  }

  async analyzeSkillDemand(): Promise<void> {
    // Pobierz oferty z ostatnich 30 dni
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/job_offers?posted_date=gte.${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}`,
      {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
      }
    );

    const offers = await response.json();
    
    // Analiza umiejętności
    const skillStats = new Map<string, {
      count: number;
      salaries: number[];
      locations: string[];
    }>();

    offers.forEach((offer: any) => {
      const technologies = offer.technologies || [];
      const salary = offer.salary_min && offer.salary_max 
        ? (offer.salary_min + offer.salary_max) / 2 
        : null;

      technologies.forEach((tech: string) => {
        if (!skillStats.has(tech)) {
          skillStats.set(tech, { count: 0, salaries: [], locations: [] });
        }
        
        const stats = skillStats.get(tech)!;
        stats.count++;
        
        if (salary) {
          stats.salaries.push(salary);
        }
        
        if (offer.location) {
          stats.locations.push(offer.location);
        }
      });
    });

    // Zapisz trendy do bazy
    const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    for (const [skill, stats] of skillStats) {
      const avgSalary = stats.salaries.length > 0 
        ? stats.salaries.reduce((a, b) => a + b, 0) / stats.salaries.length 
        : null;

      const demandScore = Math.min((stats.count / offers.length) * 100, 100);

      await fetch(`${this.supabaseUrl}/rest/v1/market_trends`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skill_name: skill,
          skill_category: this.categorizeSkill(skill),
          demand_score: demandScore,
          avg_salary_min: avgSalary ? avgSalary * 0.9 : null,
          avg_salary_max: avgSalary ? avgSalary * 1.1 : null,
          job_count: stats.count,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          location: 'all',
        }),
      });
    }
  }

  private categorizeSkill(skill: string): string {
    const programmingLanguages = ['javascript', 'python', 'java', 'typescript', 'php', 'c#', 'go', 'rust'];
    const frameworks = ['react', 'angular', 'vue', 'django', 'spring', 'laravel', 'express'];
    const databases = ['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch'];
    const tools = ['docker', 'kubernetes', 'git', 'jenkins', 'aws', 'azure'];

    const skillLower = skill.toLowerCase();
    
    if (programmingLanguages.some(lang => skillLower.includes(lang))) {
      return 'programming';
    } else if (frameworks.some(fw => skillLower.includes(fw))) {
      return 'framework';
    } else if (databases.some(db => skillLower.includes(db))) {
      return 'database';
    } else if (tools.some(tool => skillLower.includes(tool))) {
      return 'tool';
    } else {
      return 'other';
    }
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const analyzer = new MarketAnalyzer();
    await analyzer.analyzeSkillDemand();

    return new Response(
      JSON.stringify({ success: true, message: 'Market analysis completed' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ error: 'Analysis failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 1.4 Integracja z CareerGPT

**Rozszerzenie promptu o dane rynkowe:**
```typescript
// Modyfikacja w supabase/functions/chat/index.ts
const getMarketInsights = async (userMessage: string): Promise<string> => {
  // Sprawdź czy pytanie dotyczy rynku pracy
  const marketKeywords = ['zarobki', 'wynagrodzenie', 'pensja', 'rynek', 'trendy', 'technologie'];
  const hasMarketKeyword = marketKeywords.some(keyword => 
    userMessage.toLowerCase().includes(keyword)
  );

  if (!hasMarketKeyword) return '';

  try {
    // Pobierz najnowsze trendy
    const trendsResponse = await fetch(
      `${supabaseUrl}/rest/v1/market_trends?order=created_at.desc&limit=10`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const trends = await trendsResponse.json();
    
    if (trends.length === 0) return '';

    // Sformatuj dane dla promptu
    const marketData = trends.map((trend: any) => 
      `${trend.skill_name}: ${trend.demand_score.toFixed(1)}% popytu, średnia pensja: ${trend.avg_salary_min}-${trend.avg_salary_max} PLN`
    ).join('\n');

    return `\n\nAKTUALNE DANE RYNKOWE (ostatnie 30 dni):\n${marketData}\n\n`;
  } catch (error) {
    console.error('Error fetching market insights:', error);
    return '';
  }
};

// W głównej funkcji chat:
const marketInsights = await getMarketInsights(message);
customInstructions += marketInsights;
```

### 1.5 Harmonogram automatyzacji

**Cron Jobs (używając GitHub Actions lub zewnętrznego serwisu):**
```yaml
# .github/workflows/job-scraping.yml
name: Job Market Data Collection

on:
  schedule:
    # Codziennie o 6:00 UTC (8:00 CET)
    - cron: '0 6 * * *'
  workflow_dispatch: # Możliwość ręcznego uruchomienia

jobs:
  scrape-jobs:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger job scraper
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/job-scraper" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
      
      - name: Trigger market analysis
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/market-analyzer" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

## 📊 Faza 2: Rozszerzenie (1 miesiąc)

### 2.1 Dodatkowe źródła danych
- **NoFluffJobs** - transparentne zarobki w IT
- **Pracuj.pl** - największy portal w Polsce
- **LinkedIn Jobs** - stanowiska międzynarodowe
- **Indeed.pl** - agregator ofert

### 2.2 Zaawansowana analiza
- **Analiza geograficzna** - różnice płacowe między miastami
- **Trendy czasowe** - jak zmieniają się wymagania
- **Analiza benefitów** - najpopularniejsze dodatki
- **Korelacje** - które umiejętności idą w parze

### 2.3 API dla aplikacji
```typescript
// Nowy endpoint: market-insights
interface MarketInsightsRequest {
  skills?: string[];
  location?: string;
  experienceLevel?: string;
  salaryRange?: { min: number; max: number; };
}

interface MarketInsightsResponse {
  skillDemand: Array<{
    skill: string;
    demandScore: number;
    avgSalary: number;
    jobCount: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  salaryBenchmark: {
    min: number;
    max: number;
    median: number;
    percentile75: number;
    percentile90: number;
  };
  recommendations: string[];
  marketOutlook: string;
}
```

## 🚀 Faza 3: Zaawansowane funkcje (2 miesiące)

### 3.1 Machine Learning
- **Klasyfikacja ofert** - automatyczne kategoryzowanie
- **Predykcja trendów** - przewidywanie przyszłych potrzeb rynku
- **Matching** - dopasowanie CV do ofert
- **Anomaly detection** - wykrywanie nietypowych ofert

### 3.2 Personalizacja
- **Profil użytkownika** - zapisywanie preferencji
- **Rekomendacje** - spersonalizowane sugestie
- **Alerty** - powiadomienia o nowych trendach
- **Portfolio tracking** - śledzenie rozwoju umiejętności

### 3.3 Zaawansowane funkcje CareerGPT
```typescript
// Nowe funkcje w ChatBox
const getPersonalizedInsights = async (userProfile: UserProfile) => {
  // Analiza CV względem aktualnego rynku
  // Rekomendacje rozwoju kariery
  // Sugestie negocjacji płacowych
};

const getSalaryNegotiationTips = async (position: string, location: string) => {
  // Aktualne widełki płacowe
  // Argumenty do negocjacji
  // Benchmarki rynkowe
};

const getSkillGapAnalysis = async (currentSkills: string[], targetPosition: string) => {
  // Analiza luk kompetencyjnych
  // Plan rozwoju umiejętności
  // Priorytetyzacja nauki
};
```

## ⚠️ Wyzwania i rozwiązania

### 3.1 Prawne i etyczne
**Wyzwanie:** Przestrzeganie robots.txt i ToS portali
**Rozwiązanie:** 
- Używanie publicznych API gdzie dostępne
- Respectowanie rate limitów
- Rozłożone w czasie zapytania
- Współpraca z portalami

### 3.2 Techniczne
**Wyzwanie:** Anti-bot protection
**Rozwiązanie:**
- Proxy rotation
- User-agent rotation
- Human-like behavior patterns
- Headless browser z stealth mode

### 3.3 Jakość danych
**Wyzwanie:** Duplikaty, spam, nieaktualne oferty
**Rozwiązanie:**
- Deduplication na podstawie tytułu + firma + lokalizacja
- ML do filtrowania spamu
- Automatyczne usuwanie starych ofert
- Walidacja danych wejściowych

## 📈 Metryki sukcesu

### KPI Faza 1:
- ✅ 1000+ ofert pracy w bazie
- ✅ 50+ unikalnych umiejętności w trendach
- ✅ Działa scraping z 1 portalu
- ✅ Integracja z CareerGPT

### KPI Faza 2:
- ✅ 10000+ ofert pracy
- ✅ 3+ portale jako źródła
- ✅ Analiza geograficzna
- ✅ API dla zewnętrznych aplikacji

### KPI Faza 3:
- ✅ ML-powered insights
- ✅ Personalizacja dla użytkowników
- ✅ Predykcje trendów rynkowych
- ✅ Monetyzacja premium features

## 💰 Szacowane koszty

### Infrastruktura:
- **Supabase Pro:** $25/miesiąc
- **Proxy services:** $50/miesiąc
- **External APIs:** $100/miesiąc
- **Monitoring:** $20/miesiąc

### Rozwój:
- **Faza 1:** 40 godzin (2-3 tygodnie)
- **Faza 2:** 80 godzin (1 miesiąc)
- **Faza 3:** 160 godzin (2 miesiące)

## 🎯 Następne kroki

1. **Tydzień 1:** Przygotowanie bazy danych i podstawowej infrastruktury
2. **Tydzień 2:** Implementacja scrapera dla JustJoin.it
3. **Tydzień 3:** Analiza danych i integracja z CareerGPT
4. **Tydzień 4:** Testy, optymalizacja, dokumentacja

**Czy zaczynamy od Fazy 1?** 🚀