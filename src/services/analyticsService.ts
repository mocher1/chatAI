import { ChatInteraction, PromptVariant, PerformanceMetric, PopularQuestion, UserSession, AnalyticsData } from '../types/analytics';

class AnalyticsService {
  private supabaseUrl: string;
  private supabaseKey: string;
  private sessionId: string;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    this.supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.supabaseUrl}/rest/v1/${endpoint}`;
    const headers = {
      'apikey': this.supabaseKey,
      'Authorization': `Bearer ${this.supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      console.error(`Analytics API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return null;
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // Logowanie interakcji z chatem - zwraca UUID z bazy danych
  async logChatInteraction(interaction: Omit<ChatInteraction, 'sessionId'>): Promise<string | null> {
    try {
      // Map camelCase to snake_case for database
      const interactionData = {
        session_id: this.sessionId,
        thread_id: interaction.threadId,
        user_message: interaction.userMessage,
        assistant_message: interaction.assistantMessage,
        response_time_ms: interaction.responseTimeMs,
        success: interaction.success,
        error_message: interaction.errorMessage,
        prompt_variant_id: interaction.promptVariantId,
        question_category: interaction.questionCategory,
        user_satisfaction: interaction.userSatisfaction,
      };

      const result = await this.makeRequest('chat_interactions', {
        method: 'POST',
        body: JSON.stringify(interactionData),
        headers: {
          'Prefer': 'return=representation',
        },
      });

      // Aktualizuj sesję użytkownika
      await this.updateUserSession();

      // Zwróć UUID z bazy danych
      return result && result.length > 0 ? result[0].id : null;
    } catch (error) {
      console.error('Failed to log chat interaction:', error);
      return null;
    }
  }

  // Aktualizacja sesji użytkownika
  private async updateUserSession(): Promise<void> {
    try {
      const sessionData = {
        session_id: this.sessionId,
        user_agent: navigator.userAgent,
        last_activity_at: new Date().toISOString(),
      };

      // Spróbuj zaktualizować istniejącą sesję
      const updateResult = await this.makeRequest(`user_sessions?session_id=eq.${this.sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          last_activity_at: sessionData.last_activity_at,
        }),
        headers: {
          'Prefer': 'return=minimal',
        },
      });

      // Jeśli nie ma sesji do zaktualizowania, utwórz nową
      if (updateResult === null) {
        await this.makeRequest('user_sessions', {
          method: 'POST',
          body: JSON.stringify({
            session_id: sessionData.session_id,
            user_agent: sessionData.user_agent,
            last_activity_at: sessionData.last_activity_at,
            started_at: new Date().toISOString(),
            total_interactions: 1,
          }),
        });
      }
    } catch (error) {
      console.error('Failed to update user session:', error);
    }
  }

  // Pobieranie aktywnego wariantu promptu (A/B testing)
  async getActivePromptVariant(): Promise<PromptVariant | null> {
    try {
      const variants = await this.makeRequest('prompt_variants?is_active=eq.true');
      if (!variants || variants.length === 0) {
        return null;
      }

      // Wybierz wariant na podstawie traffic_percentage
      const random = Math.random() * 100;
      let cumulativePercentage = 0;

      for (const variant of variants) {
        cumulativePercentage += variant.traffic_percentage;
        if (random <= cumulativePercentage) {
          return {
            id: variant.id,
            name: variant.name,
            description: variant.description,
            promptContent: variant.prompt_content,
            isActive: variant.is_active,
            trafficPercentage: variant.traffic_percentage,
            createdAt: variant.created_at,
          };
        }
      }

      // Fallback do pierwszego wariantu
      const variant = variants[0];
      return {
        id: variant.id,
        name: variant.name,
        description: variant.description,
        promptContent: variant.prompt_content,
        isActive: variant.is_active,
        trafficPercentage: variant.traffic_percentage,
        createdAt: variant.created_at,
      };
    } catch (error) {
      console.error('Failed to get prompt variant:', error);
      return null;
    }
  }

  // Pobieranie metryk wydajności
  async getPerformanceMetrics(timePeriod: 'hourly' | 'daily' | 'weekly' = 'daily', limit: number = 24): Promise<PerformanceMetric[]> {
    try {
      const metrics = await this.makeRequest(
        `performance_metrics?time_period=eq.${timePeriod}&order=period_start.desc&limit=${limit}`
      );

      if (!metrics) return [];

      return metrics.map((metric: any) => ({
        id: metric.id,
        metricType: metric.metric_type,
        metricValue: parseFloat(metric.metric_value),
        timePeriod: metric.time_period,
        periodStart: metric.period_start,
        periodEnd: metric.period_end,
        additionalData: metric.additional_data,
        createdAt: metric.created_at,
      }));
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return [];
    }
  }

  // Pobieranie popularnych pytań
  async getPopularQuestions(limit: number = 10): Promise<PopularQuestion[]> {
    try {
      const questions = await this.makeRequest(
        `popular_questions?order=question_count.desc&limit=${limit}`
      );

      if (!questions) return [];

      return questions.map((question: any) => ({
        id: question.id,
        questionText: question.question_text,
        questionCategory: question.question_category,
        questionCount: question.question_count,
        avgResponseTimeMs: question.avg_response_time_ms ? parseFloat(question.avg_response_time_ms) : undefined,
        avgSatisfaction: question.avg_satisfaction ? parseFloat(question.avg_satisfaction) : undefined,
        lastAskedAt: question.last_asked_at,
        createdAt: question.created_at,
      }));
    } catch (error) {
      console.error('Failed to get popular questions:', error);
      return [];
    }
  }

  // Pobieranie zagregowanych danych analitycznych
  async getAnalyticsData(): Promise<AnalyticsData> {
    try {
      const [metrics, questions] = await Promise.all([
        this.getPerformanceMetrics('daily', 7),
        this.getPopularQuestions(10),
      ]);

      // Oblicz podstawowe statystyki
      const totalInteractions = metrics
        .filter(m => m.metricType === 'total_interactions')
        .reduce((sum, m) => sum + m.metricValue, 0);

      const avgResponseTime = metrics
        .filter(m => m.metricType === 'response_time')
        .reduce((sum, m, _, arr) => sum + m.metricValue / arr.length, 0);

      const successRate = metrics
        .filter(m => m.metricType === 'success_rate')
        .reduce((sum, m, _, arr) => sum + m.metricValue / arr.length, 0);

      // Oblicz popularne kategorie
      const categoryStats = questions.reduce((acc, q) => {
        acc[q.questionCategory] = (acc[q.questionCategory] || 0) + q.questionCount;
        return acc;
      }, {} as Record<string, number>);

      const totalQuestions = Object.values(categoryStats).reduce((sum, count) => sum + count, 0);
      const popularCategories = Object.entries(categoryStats)
        .map(([category, count]) => ({
          category,
          count,
          percentage: totalQuestions > 0 ? (count / totalQuestions) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        totalInteractions,
        avgResponseTime,
        successRate,
        popularCategories,
        recentMetrics: metrics,
        topQuestions: questions,
      };
    } catch (error) {
      console.error('Failed to get analytics data:', error);
      return {
        totalInteractions: 0,
        avgResponseTime: 0,
        successRate: 0,
        popularCategories: [],
        recentMetrics: [],
        topQuestions: [],
      };
    }
  }

  // Logowanie oceny użytkownika
  async logUserSatisfaction(interactionId: string, satisfaction: number): Promise<void> {
    try {
      await this.makeRequest(`chat_interactions?id=eq.${interactionId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          user_satisfaction: satisfaction,
          updated_at: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to log user satisfaction:', error);
    }
  }

  // Zakończenie sesji
  async endSession(): Promise<void> {
    try {
      await this.makeRequest(`user_sessions?session_id=eq.${this.sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ended_at: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }
}

export const analyticsService = new AnalyticsService();