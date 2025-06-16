import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, CheckCircle, MessageSquare, Users, Eye, EyeOff } from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { AnalyticsData, PerformanceMetric } from '../types/analytics';

interface AnalyticsDashboardProps {
  isVisible: boolean;
  onToggle: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ isVisible, onToggle }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getAnalyticsData();
      setAnalyticsData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      loadAnalyticsData();
      // Odświeżaj dane co 5 minut
      const interval = setInterval(loadAnalyticsData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (!isVisible) {
    return (
      <motion.button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Pokaż analitykę"
      >
        <BarChart3 className="w-6 h-6" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-50 overflow-y-auto"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              Analityka
            </h2>
            {lastUpdated && (
              <p className="text-sm text-gray-500">
                Ostatnia aktualizacja: {lastUpdated.toLocaleTimeString('pl-PL')}
              </p>
            )}
          </div>
          <button
            onClick={onToggle}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Ukryj analitykę"
          >
            <EyeOff className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : analyticsData ? (
          <div className="space-y-6">
            {/* Kluczowe metryki */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Interakcje</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {formatNumber(analyticsData.totalInteractions)}
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Sukces</span>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {analyticsData.successRate.toFixed(1)}%
                </p>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Czas odpowiedzi</span>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {formatTime(analyticsData.avgResponseTime)}
                </p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Trend</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {analyticsData.recentMetrics.length > 1 ? '+' : ''}
                  {analyticsData.recentMetrics.length}
                </p>
              </div>
            </div>

            {/* Popularne kategorie */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Popularne kategorie</h3>
              <div className="space-y-3">
                {analyticsData.popularCategories.slice(0, 5).map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-purple-500' :
                        index === 1 ? 'bg-blue-500' :
                        index === 2 ? 'bg-green-500' :
                        index === 3 ? 'bg-orange-500' : 'bg-gray-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-700">{category.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{category.count}</span>
                      <span className="text-xs text-gray-500 ml-1">
                        ({category.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Najpopularniejsze pytania */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Najpopularniejsze pytania</h3>
              <div className="space-y-3">
                {analyticsData.topQuestions.slice(0, 5).map((question, index) => (
                  <div key={question.id} className="bg-white p-3 rounded border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                        {question.questionCategory}
                      </span>
                      <span className="text-xs text-gray-500">
                        {question.questionCount}x
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {question.questionText.length > 80 
                        ? `${question.questionText.substring(0, 80)}...`
                        : question.questionText
                      }
                    </p>
                    {question.avgResponseTimeMs && (
                      <p className="text-xs text-gray-500 mt-1">
                        Śr. czas: {formatTime(question.avgResponseTimeMs)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Wykres metryk (uproszczony) */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Metryki wydajności (7 dni)</h3>
              <div className="space-y-2">
                {analyticsData.recentMetrics
                  .filter(m => m.metricType === 'response_time')
                  .slice(0, 7)
                  .map((metric, index) => (
                    <div key={metric.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {new Date(metric.periodStart).toLocaleDateString('pl-PL')}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ 
                              width: `${Math.min((metric.metricValue / 5000) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-16 text-right">
                          {formatTime(metric.metricValue)}
                        </span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Akcje */}
            <div className="flex gap-2">
              <button
                onClick={loadAnalyticsData}
                disabled={loading}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
              >
                Odśwież dane
              </button>
              <button
                onClick={() => {
                  // Eksport danych do CSV (uproszczony)
                  const csvData = analyticsData.topQuestions
                    .map(q => `"${q.questionText}","${q.questionCategory}",${q.questionCount}`)
                    .join('\n');
                  const blob = new Blob([`"Pytanie","Kategoria","Liczba"\n${csvData}`], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'analytics-export.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Eksport
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Brak danych analitycznych</p>
            <button
              onClick={loadAnalyticsData}
              className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Załaduj dane
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AnalyticsDashboard;