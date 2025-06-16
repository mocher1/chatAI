import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SkillTrend {
  skillName: string;
  skillCategory: string;
  demandScore: number;
  avgSalaryMin?: number;
  avgSalaryMax?: number;
  jobCount: number;
  location: string;
  periodStart: string;
  periodEnd: string;
}

class MarketAnalyzer {
  private supabase: any;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async analyzeSkillDemand(location: string = 'all', days: number = 30): Promise<SkillTrend[]> {
    console.log(`Analyzing skill demand for location: ${location}, days: ${days}`);
    
    try {
      // Pobierz oferty z ostatnich N dni
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let query = this.supabase
        .from('job_offers')
        .select('*')
        .eq('is_active', true)
        .gte('posted_date', cutoffDate.toISOString());

      // Filtruj po lokalizacji jeśli nie 'all'
      if (location !== 'all') {
        query = query.ilike('location', `%${location}%`);
      }

      const { data: offers, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!offers || offers.length === 0) {
        console.log('No offers found for analysis');
        return [];
      }

      console.log(`Analyzing ${offers.length} offers`);

      // Analiza umiejętności
      const skillStats = new Map<string, {
        count: number;
        salaries: number[];
        category: string;
      }>();

      offers.forEach((offer: any) => {
        const technologies = offer.technologies || [];
        const requirements = offer.requirements || [];
        const allSkills = [...technologies, ...this.extractSkillsFromText(requirements.join(' '))];
        
        const salary = offer.salary_min && offer.salary_max 
          ? (offer.salary_min + offer.salary_max) / 2 
          : null;

        allSkills.forEach((skill: string) => {
          const normalizedSkill = this.normalizeSkillName(skill);
          if (normalizedSkill.length < 2) return; // Ignoruj bardzo krótkie "umiejętności"
          
          if (!skillStats.has(normalizedSkill)) {
            skillStats.set(normalizedSkill, { 
              count: 0, 
              salaries: [], 
              category: this.categorizeSkill(normalizedSkill)
            });
          }
          
          const stats = skillStats.get(normalizedSkill)!;
          stats.count++;
          
          if (salary && salary > 1000) { // Filtruj nierealistyczne pensje
            stats.salaries.push(salary);
          }
        });
      });

      // Konwertuj na SkillTrend[]
      const periodStart = cutoffDate.toISOString().split('T')[0];
      const periodEnd = new Date().toISOString().split('T')[0];
      const totalOffers = offers.length;

      const trends: SkillTrend[] = [];
      
      for (const [skill, stats] of skillStats) {
        // Ignoruj umiejętności występujące w mniej niż 2 ofertach
        if (stats.count < 2) continue;
        
        const avgSalary = stats.salaries.length > 0 
          ? stats.salaries.reduce((a, b) => a + b, 0) / stats.salaries.length 
          : null;

        const demandScore = Math.min((stats.count / totalOffers) * 100, 100);

        trends.push({
          skillName: skill,
          skillCategory: stats.category,
          demandScore: Math.round(demandScore * 10) / 10, // Zaokrągl do 1 miejsca po przecinku
          avgSalaryMin: avgSalary ? Math.round(avgSalary * 0.9) : undefined,
          avgSalaryMax: avgSalary ? Math.round(avgSalary * 1.1) : undefined,
          jobCount: stats.count,
          location: location,
          periodStart: periodStart,
          periodEnd: periodEnd,
        });
      }

      // Sortuj po demand score
      trends.sort((a, b) => b.demandScore - a.demandScore);
      
      console.log(`Generated ${trends.length} skill trends`);
      return trends.slice(0, 100); // Ogranicz do top 100

    } catch (error) {
      console.error('Error in analyzeSkillDemand:', error);
      throw error;
    }
  }

  private extractSkillsFromText(text: string): string[] {
    if (!text) return [];
    
    // Popularne technologie i umiejętności IT
    const techKeywords = [
      'javascript', 'typescript', 'python', 'java', 'php', 'c#', 'go', 'rust', 'swift', 'kotlin',
      'react', 'vue', 'angular', 'node.js', 'express', 'django', 'spring', 'laravel',
      'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'git',
      'html', 'css', 'sass', 'webpack', 'vite', 'babel',
      'rest api', 'graphql', 'microservices', 'agile', 'scrum',
      'machine learning', 'ai', 'data science', 'analytics'
    ];

    const foundSkills: string[] = [];
    const textLower = text.toLowerCase();

    techKeywords.forEach(keyword => {
      if (textLower.includes(keyword)) {
        foundSkills.push(keyword);
      }
    });

    return foundSkills;
  }

  private normalizeSkillName(skill: string): string {
    if (!skill) return '';
    
    let normalized = skill.toLowerCase().trim();
    
    // Mapowanie popularnych wariantów
    const skillMappings: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'node': 'node.js',
      'nodejs': 'node.js',
      'react.js': 'react',
      'vue.js': 'vue',
      'angular.js': 'angular',
      'postgres': 'postgresql',
      'mongo': 'mongodb',
      'k8s': 'kubernetes',
      'aws': 'amazon web services',
      'gcp': 'google cloud platform',
    };

    return skillMappings[normalized] || normalized;
  }

  private categorizeSkill(skill: string): string {
    const skillLower = skill.toLowerCase();
    
    const categories = {
      programming: ['javascript', 'typescript', 'python', 'java', 'php', 'c#', 'go', 'rust', 'swift', 'kotlin', 'c++', 'ruby'],
      framework: ['react', 'vue', 'angular', 'django', 'spring', 'laravel', 'express', 'flask', 'rails'],
      database: ['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'sqlite'],
      cloud: ['aws', 'azure', 'gcp', 'amazon web services', 'google cloud platform', 'microsoft azure'],
      devops: ['docker', 'kubernetes', 'jenkins', 'gitlab', 'terraform', 'ansible'],
      frontend: ['html', 'css', 'sass', 'webpack', 'vite', 'babel', 'jquery'],
      mobile: ['react native', 'flutter', 'ios', 'android', 'xamarin'],
      data: ['machine learning', 'ai', 'data science', 'analytics', 'tableau', 'power bi'],
      methodology: ['agile', 'scrum', 'kanban', 'devops', 'ci/cd'],
    };

    for (const [category, skills] of Object.entries(categories)) {
      if (skills.some(s => skillLower.includes(s) || s.includes(skillLower))) {
        return category;
      }
    }

    return 'other';
  }

  async saveMarketTrends(trends: SkillTrend[]): Promise<void> {
    console.log(`Saving ${trends.length} market trends`);
    
    try {
      // Usuń stare trendy dla tego samego okresu i lokalizacji
      if (trends.length > 0) {
        const firstTrend = trends[0];
        await this.supabase
          .from('market_trends')
          .delete()
          .eq('period_start', firstTrend.periodStart)
          .eq('period_end', firstTrend.periodEnd)
          .eq('location', firstTrend.location);
      }

      // Wstaw nowe trendy w batch'ach
      const batchSize = 50;
      for (let i = 0; i < trends.length; i += batchSize) {
        const batch = trends.slice(i, i + batchSize);
        const trendData = batch.map(trend => ({
          skill_name: trend.skillName,
          skill_category: trend.skillCategory,
          demand_score: trend.demandScore,
          avg_salary_min: trend.avgSalaryMin,
          avg_salary_max: trend.avgSalaryMax,
          job_count: trend.jobCount,
          period_start: trend.periodStart,
          period_end: trend.periodEnd,
          location: trend.location,
        }));

        const { error } = await this.supabase
          .from('market_trends')
          .insert(trendData);

        if (error) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        }
      }

      console.log('Market trends saved successfully');
    } catch (error) {
      console.error('Error saving market trends:', error);
      throw error;
    }
  }

  async analyzeAllLocations(): Promise<void> {
    const locations = ['all', 'warszawa', 'kraków', 'wrocław', 'gdańsk', 'poznań', 'katowice'];
    
    for (const location of locations) {
      try {
        console.log(`Analyzing market for location: ${location}`);
        const trends = await this.analyzeSkillDemand(location, 30);
        await this.saveMarketTrends(trends);
      } catch (error) {
        console.error(`Error analyzing location ${location}:`, error);
      }
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

  try {
    console.log('Starting market analysis...');
    const analyzer = new MarketAnalyzer();
    
    // Analizuj wszystkie lokalizacje
    await analyzer.analyzeAllLocations();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Market analysis completed successfully',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Market analysis error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});