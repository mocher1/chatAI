import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface JobOffer {
  externalId: string;
  title: string;
  company: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
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

interface ScrapingResult {
  success: boolean;
  offersScraped: number;
  offersNew: number;
  offersUpdated: number;
  sources: string[];
  executionTimeMs: number;
  error?: string;
}

class JobScraper {
  private supabase: any;
  private startTime: number;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.startTime = Date.now();
  }

  async scrapeJustJoinIt(): Promise<JobOffer[]> {
    console.log('Starting JustJoin.it scraping...');
    
    try {
      // JustJoin.it ma publiczne API
      const response = await fetch('https://api.justjoin.it/v2/user-panel/offers?page=1&sortBy=published&orderBy=DESC&perPage=100', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CareerGPT-Bot/1.0)',
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`JustJoin.it API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Fetched ${data.data?.length || 0} offers from JustJoin.it`);
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from JustJoin.it API');
      }

      return data.data.map((offer: any) => this.transformJustJoinOffer(offer));
    } catch (error) {
      console.error('Error scraping JustJoin.it:', error);
      throw error;
    }
  }

  private transformJustJoinOffer(offer: any): JobOffer {
    // Wyciągnij informacje o wynagrodzeniu
    const employment = offer.employmentTypes?.[0];
    const salary = employment?.salary;
    
    // Normalizuj poziom doświadczenia
    const experienceLevel = this.normalizeExperienceLevel(offer.experienceLevel);
    
    // Wyciągnij technologie
    const technologies = offer.requiredSkills?.map((skill: any) => skill.name) || [];
    
    // Wyciągnij lokalizację
    const location = offer.city || offer.workplaceType;
    
    // Wyciągnij typ zatrudnienia
    const employmentType = this.normalizeEmploymentType(employment?.type);

    return {
      externalId: `justjoin_${offer.id}`,
      title: offer.title || '',
      company: offer.companyName || '',
      location: location,
      salaryMin: salary?.from,
      salaryMax: salary?.to,
      salaryCurrency: salary?.currency || 'PLN',
      employmentType: employmentType,
      experienceLevel: experienceLevel,
      requirements: this.extractRequirements(offer.body || ''),
      niceToHave: this.extractNiceToHave(offer.body || ''),
      benefits: [], // JustJoin.it nie zawsze ma strukturalne benefity
      description: offer.body || '',
      technologies: technologies,
      sourcePortal: 'justjoin',
      sourceUrl: `https://justjoin.it/offers/${offer.id}`,
      postedDate: offer.publishedAt || new Date().toISOString(),
    };
  }

  private normalizeExperienceLevel(level: string): string {
    if (!level) return 'unknown';
    
    const levelLower = level.toLowerCase();
    if (levelLower.includes('junior') || levelLower.includes('trainee')) return 'junior';
    if (levelLower.includes('senior') || levelLower.includes('lead')) return 'senior';
    if (levelLower.includes('mid') || levelLower.includes('regular')) return 'mid';
    
    return level.toLowerCase();
  }

  private normalizeEmploymentType(type: string): string {
    if (!type) return 'unknown';
    
    const typeLower = type.toLowerCase();
    if (typeLower.includes('permanent') || typeLower.includes('full')) return 'full-time';
    if (typeLower.includes('contract') || typeLower.includes('b2b')) return 'contract';
    if (typeLower.includes('part')) return 'part-time';
    if (typeLower.includes('intern')) return 'internship';
    
    return type.toLowerCase();
  }

  private extractRequirements(description: string): string[] {
    if (!description) return [];
    
    const requirementPatterns = [
      /wymagania:?\s*([^\.]+)/gi,
      /wymagamy:?\s*([^\.]+)/gi,
      /musisz znać:?\s*([^\.]+)/gi,
      /potrzebujemy:?\s*([^\.]+)/gi,
      /oczekujemy:?\s*([^\.]+)/gi,
    ];
    
    const requirements: string[] = [];
    requirementPatterns.forEach(pattern => {
      const matches = description.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Wyczyść i podziel na punkty
          const cleaned = match.replace(/wymagania:?|wymagamy:?|musisz znać:?|potrzebujemy:?|oczekujemy:?/gi, '').trim();
          const points = cleaned.split(/[,;•\-\n]/).map(p => p.trim()).filter(p => p.length > 2);
          requirements.push(...points);
        });
      }
    });
    
    return [...new Set(requirements)]; // Usuń duplikaty
  }

  private extractNiceToHave(description: string): string[] {
    if (!description) return [];
    
    const niceToHavePatterns = [
      /mile widziane:?\s*([^\.]+)/gi,
      /dodatkowo:?\s*([^\.]+)/gi,
      /nice to have:?\s*([^\.]+)/gi,
      /będzie plusem:?\s*([^\.]+)/gi,
      /plus:?\s*([^\.]+)/gi,
    ];
    
    const niceToHave: string[] = [];
    niceToHavePatterns.forEach(pattern => {
      const matches = description.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace(/mile widziane:?|dodatkowo:?|nice to have:?|będzie plusem:?|plus:?/gi, '').trim();
          const points = cleaned.split(/[,;•\-\n]/).map(p => p.trim()).filter(p => p.length > 2);
          niceToHave.push(...points);
        });
      }
    });
    
    return [...new Set(niceToHave)];
  }

  async saveOffers(offers: JobOffer[]): Promise<{ new: number; updated: number }> {
    let newCount = 0;
    let updatedCount = 0;

    for (const offer of offers) {
      try {
        // Sprawdź czy oferta już istnieje
        const { data: existing } = await this.supabase
          .from('job_offers')
          .select('id, updated_at')
          .eq('external_id', offer.externalId)
          .single();

        const offerData = {
          external_id: offer.externalId,
          title: offer.title,
          company: offer.company,
          location: offer.location,
          salary_min: offer.salaryMin,
          salary_max: offer.salaryMax,
          salary_currency: offer.salaryCurrency,
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
          scraped_at: new Date().toISOString(),
          is_active: true,
        };

        if (existing) {
          // Aktualizuj istniejącą ofertę
          const { error } = await this.supabase
            .from('job_offers')
            .update(offerData)
            .eq('id', existing.id);

          if (error) {
            console.error('Error updating offer:', error);
          } else {
            updatedCount++;
          }
        } else {
          // Dodaj nową ofertę
          const { error } = await this.supabase
            .from('job_offers')
            .insert(offerData);

          if (error) {
            console.error('Error inserting offer:', error);
          } else {
            newCount++;
          }
        }
      } catch (error) {
        console.error('Error processing offer:', offer.externalId, error);
      }
    }

    return { new: newCount, updated: updatedCount };
  }

  async logScrapingResult(result: ScrapingResult): Promise<void> {
    try {
      await this.supabase
        .from('scraping_logs')
        .insert({
          source_portal: 'justjoin',
          status: result.success ? 'success' : 'error',
          offers_scraped: result.offersScraped,
          offers_new: result.offersNew,
          offers_updated: result.offersUpdated,
          error_message: result.error,
          execution_time_ms: result.executionTimeMs,
          started_at: new Date(this.startTime).toISOString(),
          completed_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error logging scraping result:', error);
    }
  }

  async deactivateOldOffers(): Promise<void> {
    try {
      // Dezaktywuj oferty starsze niż 30 dni
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await this.supabase
        .from('job_offers')
        .update({ is_active: false })
        .lt('posted_date', thirtyDaysAgo.toISOString())
        .eq('is_active', true);

      if (error) {
        console.error('Error deactivating old offers:', error);
      } else {
        console.log('Deactivated old offers successfully');
      }
    } catch (error) {
      console.error('Error in deactivateOldOffers:', error);
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  const startTime = Date.now();
  let result: ScrapingResult = {
    success: false,
    offersScraped: 0,
    offersNew: 0,
    offersUpdated: 0,
    sources: [],
    executionTimeMs: 0,
  };

  try {
    console.log('Starting job scraping process...');
    const scraper = new JobScraper();
    
    // Scrape z JustJoin.it
    const justJoinOffers = await scraper.scrapeJustJoinIt();
    console.log(`Scraped ${justJoinOffers.length} offers from JustJoin.it`);
    
    // Zapisz oferty do bazy
    const saveResult = await scraper.saveOffers(justJoinOffers);
    console.log(`Saved: ${saveResult.new} new, ${saveResult.updated} updated`);
    
    // Dezaktywuj stare oferty
    await scraper.deactivateOldOffers();
    
    // Przygotuj wynik
    result = {
      success: true,
      offersScraped: justJoinOffers.length,
      offersNew: saveResult.new,
      offersUpdated: saveResult.updated,
      sources: ['justjoin.it'],
      executionTimeMs: Date.now() - startTime,
    };

    // Zaloguj wynik
    await scraper.logScrapingResult(result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Scraping error:', error);
    
    result = {
      success: false,
      offersScraped: 0,
      offersNew: 0,
      offersUpdated: 0,
      sources: [],
      executionTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    // Spróbuj zalogować błąd
    try {
      const scraper = new JobScraper();
      await scraper.logScrapingResult(result);
    } catch (logError) {
      console.error('Error logging failed scraping result:', logError);
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});