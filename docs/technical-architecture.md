# Architektura techniczna - Integracja z rynkiem pracy

## 🏗️ Przegląd architektury

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Job Portals   │    │   Supabase      │    │   CareerGPT     │
│                 │    │   Edge Functions│    │   Frontend      │
│ • JustJoin.it   │───▶│                 │───▶│                 │
│ • Pracuj.pl     │    │ • job-scraper   │    │ • Enhanced      │
│ • NoFluffJobs   │    │ • market-analyzer│    │   prompts       │
│ • LinkedIn      │    │ • market-insights│    │ • Real-time     │
└─────────────────┘    └─────────────────┘    │   insights      │
                                              └─────────────────┘
           │                       │                       │
           │                       │                       │
           ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Pipeline │    │   PostgreSQL    │    │   Analytics     │
│                 │    │   Database      │    │   Dashboard     │
│ • Cleaning      │    │                 │    │                 │
│ • Deduplication │    │ • job_offers    │    │ • Market trends │
│ • Categorization│    │ • market_trends │    │ • Skill demand  │
│ • Validation    │    │ • job_categories│    │ • Salary data   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🗄️ Schema bazy danych

### Główne tabele

```sql
-- Oferty pracy
job_offers (
  id uuid PRIMARY KEY,
  external_id text UNIQUE,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  salary_min integer,
  salary_max integer,
  employment_type text,
  experience_level text,
  requirements jsonb,
  technologies jsonb,
  source_portal text,
  posted_date timestamptz,
  is_active boolean
)

-- Trendy rynkowe
market_trends (
  id uuid PRIMARY KEY,
  skill_name text NOT NULL,
  demand_score numeric,
  avg_salary_min numeric,
  avg_salary_max numeric,
  job_count integer,
  period_start date,
  period_end date,
  location text
)

-- Kategorie zawodowe
job_categories (
  id uuid PRIMARY KEY,
  name text UNIQUE,
  parent_category_id uuid,
  keywords jsonb
)
```

### Indeksy wydajnościowe

```sql
-- Wyszukiwanie po technologiach
CREATE INDEX idx_job_offers_technologies ON job_offers USING GIN (technologies);

-- Filtrowanie po lokalizacji i dacie
CREATE INDEX idx_job_offers_location_date ON job_offers(location, posted_date);

-- Analiza trendów
CREATE INDEX idx_market_trends_skill_period ON market_trends(skill_name, period_start);

-- Wyszukiwanie pełnotekstowe
CREATE INDEX idx_job_offers_search ON job_offers USING GIN (
  to_tsvector('polish', title || ' ' || company || ' ' || COALESCE(description, ''))
);
```

## 🔄 Data Pipeline

### 1. Zbieranie danych (Data Collection)

```typescript
interface DataCollector {
  // Główna metoda zbierania
  collectFromAllSources(): Promise<JobOffer[]>;
  
  // Specyficzne scrapers
  scrapeJustJoinIt(): Promise<JobOffer[]>;
  scrapePracujPl(): Promise<JobOffer[]>;
  scrapeNoFluffJobs(): Promise<JobOffer[]>;
  
  // Rate limiting i error handling
  respectRateLimit(portal: string): Promise<void>;
  handleErrors(error: Error, portal: string): void;
}
```

### 2. Czyszczenie danych (Data Cleaning)

```typescript
interface DataCleaner {
  // Normalizacja danych
  normalizeJobTitle(title: string): string;
  normalizeCompanyName(company: string): string;
  normalizeSalary(salary: string): { min: number; max: number; };
  
  // Ekstrakcja informacji
  extractTechnologies(description: string): string[];
  extractRequirements(description: string): string[];
  extractBenefits(description: string): string[];
  
  // Kategoryzacja
  categorizeJob(offer: JobOffer): string;
  determineExperienceLevel(offer: JobOffer): string;
}
```

### 3. Deduplication

```typescript
interface Deduplicator {
  // Wykrywanie duplikatów
  findDuplicates(offers: JobOffer[]): DuplicateGroup[];
  
  // Algorytmy podobieństwa
  calculateSimilarity(offer1: JobOffer, offer2: JobOffer): number;
  
  // Merge duplikatów
  mergeDuplicates(duplicates: DuplicateGroup): JobOffer;
}
```

## 📊 Market Analysis Engine

### Analiza popytu na umiejętności

```typescript
class SkillDemandAnalyzer {
  async analyzeSkillDemand(timeframe: number = 30): Promise<SkillTrend[]> {
    // 1. Pobierz oferty z ostatnich N dni
    const offers = await this.getRecentOffers(timeframe);
    
    // 2. Wyciągnij wszystkie umiejętności
    const skills = this.extractAllSkills(offers);
    
    // 3. Oblicz statystyki dla każdej umiejętności
    return skills.map(skill => ({
      name: skill,
      demandScore: this.calculateDemandScore(skill, offers),
      averageSalary: this.calculateAverageSalary(skill, offers),
      jobCount: this.countJobsWithSkill(skill, offers),
      trend: this.calculateTrend(skill, timeframe),
      relatedSkills: this.findRelatedSkills(skill, offers),
    }));
  }
  
  private calculateDemandScore(skill: string, offers: JobOffer[]): number {
    const skillOffers = offers.filter(offer => 
      offer.technologies.includes(skill) || 
      offer.requirements.some(req => req.toLowerCase().includes(skill.toLowerCase()))
    );
    
    return (skillOffers.length / offers.length) * 100;
  }
}
```

### Analiza geograficzna

```typescript
class GeographicAnalyzer {
  async analyzeByLocation(): Promise<LocationInsights[]> {
    const locations = ['warszawa', 'krakow', 'wroclaw', 'gdansk', 'poznan'];
    
    return Promise.all(locations.map(async location => ({
      city: location,
      jobCount: await this.getJobCountByLocation(location),
      averageSalary: await this.getAverageSalaryByLocation(location),
      topSkills: await this.getTopSkillsByLocation(location),
      topCompanies: await this.getTopCompaniesByLocation(location),
      costOfLivingIndex: this.getCostOfLivingIndex(location),
    })));
  }
}
```

## 🤖 AI Integration

### Rozszerzenie promptu CareerGPT

```typescript
const enhancePromptWithMarketData = async (
  userMessage: string, 
  userContext?: UserContext
): Promise<string> => {
  let marketContext = '';
  
  // 1. Analiza intencji użytkownika
  const intent = await analyzeUserIntent(userMessage);
  
  // 2. Pobierz relevantne dane rynkowe
  switch (intent.type) {
    case 'salary_inquiry':
      marketContext += await getSalaryInsights(intent.position, intent.location);
      break;
      
    case 'skill_development':
      marketContext += await getSkillTrends(intent.skills);
      break;
      
    case 'career_change':
      marketContext += await getCareerPathInsights(intent.fromRole, intent.toRole);
      break;
      
    case 'job_search':
      marketContext += await getJobMarketInsights(intent.criteria);
      break;
  }
  
  // 3. Sformatuj dane dla promptu
  return `
AKTUALNE DANE RYNKU PRACY:
${marketContext}

PYTANIE UŻYTKOWNIKA: ${userMessage}

Odpowiedz na pytanie użytkownika wykorzystując powyższe dane rynkowe. 
Podaj konkretne liczby, trendy i rekomendacje oparte na aktualnej sytuacji na rynku pracy.
  `;
};
```

### Funkcje analityczne

```typescript
// Analiza CV względem rynku
const analyzeCVAgainstMarket = async (cv: ParsedCV): Promise<CVAnalysis> => {
  const userSkills = cv.skills;
  const marketTrends = await getLatestSkillTrends();
  
  return {
    skillsInDemand: userSkills.filter(skill => 
      marketTrends.find(trend => trend.skill === skill)?.demandScore > 70
    ),
    skillsToLearn: marketTrends
      .filter(trend => trend.demandScore > 80 && !userSkills.includes(trend.skill))
      .slice(0, 5),
    salaryEstimate: await estimateSalary(userSkills, cv.experience, cv.location),
    marketPosition: calculateMarketPosition(userSkills, marketTrends),
  };
};

// Rekomendacje rozwoju kariery
const getCareerRecommendations = async (
  currentRole: string, 
  skills: string[], 
  goals: CareerGoals
): Promise<CareerRecommendation[]> => {
  const marketData = await getMarketInsights();
  const careerPaths = await getCareerPaths(currentRole);
  
  return careerPaths.map(path => ({
    targetRole: path.role,
    requiredSkills: path.requiredSkills,
    skillGap: path.requiredSkills.filter(skill => !skills.includes(skill)),
    timeToAchieve: estimateTimeToAchieve(path.requiredSkills, skills),
    salaryIncrease: estimateSalaryIncrease(currentRole, path.role),
    marketDemand: getMarketDemand(path.role),
    learningPath: generateLearningPath(path.requiredSkills, skills),
  }));
};
```

## 🔧 API Endpoints

### Market Insights API

```typescript
// GET /api/market/skills
interface SkillInsightsResponse {
  skills: Array<{
    name: string;
    demandScore: number;
    averageSalary: { min: number; max: number; };
    jobCount: number;
    trend: 'rising' | 'stable' | 'declining';
    relatedSkills: string[];
  }>;
  lastUpdated: string;
}

// GET /api/market/salary?position=&location=&experience=
interface SalaryInsightsResponse {
  position: string;
  location: string;
  salaryRange: { min: number; max: number; median: number; };
  percentiles: { p25: number; p50: number; p75: number; p90: number; };
  sampleSize: number;
  factors: Array<{
    factor: string;
    impact: number; // % wpływu na wynagrodzenie
  }>;
}

// POST /api/market/analyze-cv
interface CVAnalysisRequest {
  skills: string[];
  experience: number;
  location: string;
  targetRole?: string;
}

interface CVAnalysisResponse {
  marketScore: number; // 0-100
  skillsInDemand: string[];
  skillsToLearn: Array<{
    skill: string;
    priority: number;
    demandScore: number;
    salaryImpact: number;
  }>;
  salaryEstimate: { min: number; max: number; };
  recommendations: string[];
}
```

## 📈 Monitoring i Analytics

### Metryki systemu

```typescript
interface SystemMetrics {
  // Data collection
  scrapingSuccess: {
    justjoin: { success: number; failed: number; };
    pracuj: { success: number; failed: number; };
    nofluff: { success: number; failed: number; };
  };
  
  // Data quality
  dataQuality: {
    duplicateRate: number;
    completenessScore: number;
    accuracyScore: number;
  };
  
  // API performance
  apiPerformance: {
    averageResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
  };
  
  // Business metrics
  businessMetrics: {
    totalJobOffers: number;
    activeOffers: number;
    skillsCovered: number;
    companiesCovered: number;
  };
}
```

### Alerting

```typescript
interface AlertConfig {
  scrapingFailures: {
    threshold: number; // % failed requests
    action: 'email' | 'slack' | 'webhook';
  };
  
  dataQuality: {
    duplicateThreshold: number;
    completenessThreshold: number;
  };
  
  apiPerformance: {
    responseTimeThreshold: number; // ms
    errorRateThreshold: number; // %
  };
}
```

## 🔒 Bezpieczeństwo i compliance

### Rate limiting

```typescript
class RateLimiter {
  private limits = new Map<string, {
    requests: number;
    window: number; // ms
    current: number;
    resetTime: number;
  }>();
  
  async checkLimit(portal: string): Promise<boolean> {
    const limit = this.limits.get(portal);
    if (!limit) return true;
    
    const now = Date.now();
    if (now > limit.resetTime) {
      limit.current = 0;
      limit.resetTime = now + limit.window;
    }
    
    return limit.current < limit.requests;
  }
}
```

### Proxy rotation

```typescript
class ProxyManager {
  private proxies: string[] = [];
  private currentIndex = 0;
  private failedProxies = new Set<string>();
  
  getNextProxy(): string {
    // Implementacja rotacji proxy
    // Wykluczanie niedziałających proxy
    // Health check proxy
  }
}
```

## 🚀 Deployment i skalowanie

### Edge Functions deployment

```yaml
# supabase/functions/deploy.yml
functions:
  - name: job-scraper
    schedule: "0 6 * * *" # Codziennie o 6:00
    timeout: 300s
    memory: 512MB
    
  - name: market-analyzer
    schedule: "0 7 * * *" # Po scrapingu
    timeout: 600s
    memory: 1GB
    
  - name: market-insights
    on_demand: true
    timeout: 30s
    memory: 256MB
```

### Skalowanie bazy danych

```sql
-- Partycjonowanie tabeli job_offers
CREATE TABLE job_offers_2024 PARTITION OF job_offers
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Archiwizacja starych danych
CREATE TABLE job_offers_archive AS 
SELECT * FROM job_offers 
WHERE posted_date < NOW() - INTERVAL '6 months';
```

To jest kompletna architektura techniczna dla integracji CareerGPT z rynkiem pracy. Czy chcesz, żebym zaczął implementację którejś z części?