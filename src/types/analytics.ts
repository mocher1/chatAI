export interface ChatInteraction {
  id?: string;
  sessionId: string;
  threadId?: string;
  userMessage: string;
  assistantMessage?: string;
  responseTimeMs?: number;
  success: boolean;
  errorMessage?: string;
  promptVariantId?: string;
  questionCategory?: string;
  userSatisfaction?: number;
  createdAt?: string;
}

export interface PromptVariant {
  id: string;
  name: string;
  description?: string;
  promptContent: string;
  isActive: boolean;
  trafficPercentage: number;
  createdAt: string;
}

export interface PerformanceMetric {
  id: string;
  metricType: 'response_time' | 'success_rate' | 'error_rate' | 'user_satisfaction' | 'total_interactions';
  metricValue: number;
  timePeriod: 'hourly' | 'daily' | 'weekly';
  periodStart: string;
  periodEnd: string;
  additionalData?: Record<string, any>;
  createdAt: string;
}

export interface PopularQuestion {
  id: string;
  questionText: string;
  questionCategory: string;
  questionCount: number;
  avgResponseTimeMs?: number;
  avgSatisfaction?: number;
  lastAskedAt: string;
  createdAt: string;
}

export interface UserSession {
  id?: string;
  sessionId: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  startedAt: string;
  lastActivityAt: string;
  totalInteractions: number;
  sessionDurationMinutes?: number;
  endedAt?: string;
}

export interface AnalyticsData {
  totalInteractions: number;
  avgResponseTime: number;
  successRate: number;
  popularCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  recentMetrics: PerformanceMetric[];
  topQuestions: PopularQuestion[];
}