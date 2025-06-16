import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, RefreshCw, Database, TrendingUp, AlertCircle, CheckCircle, Clock, BarChart3 } from 'lucide-react';

interface ScrapingResult {
  success: boolean;
  offersScraped: number;
  offersNew: number;
  offersUpdated: number;
  sources: string[];
  executionTimeMs: number;
  error?: string;
}

interface ScrapingLog {
  id: string;
  source_portal: string;
  status: string;
  offers_scraped: number;
  offers_new: number;
  offers_updated: number;
  error_message?: string;
  execution_time_ms: number;
  started_at: string;
  completed_at?: string;
}

interface MarketStats {
  totalOffers: number;
  activeOffers: number;
  topSkills: Array<{ skill: string; count: number; }>;
  lastUpdate: string;
}

const ScrapingDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [scrapingResult, setScrapingResult] = useState<ScrapingResult | null>(null);
  const [recentLogs, setRecentLogs] = useState<ScrapingLog[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    loadRecentLogs();
    loadMarketStats();
  }, []);

  const loadRecentLogs = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/scraping_logs?order=started_at.desc&limit=10`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        const logs = await response.json();
        setRecentLogs(logs);
      }
    } catch (error) {
      console.error('Failed to load scraping logs:', error);
    }
  };

  const loadMarketStats = async () => {
    try {
      // Pobierz statystyki ofert
      const offersResponse = await fetch(`${SUPABASE_URL}/rest/v1/job_offers?select=*&is_active=eq.true`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      // Pobierz top umiejętności
      const trendsResponse = await fetch(`${SUPABASE_URL}/rest/v1/market_trends?select=skill_name,job_count&location=eq.all&order=job_count.desc&limit=5`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (offersResponse.ok && trendsResponse.ok) {
        const offers = await offersResponse.json();
        const trends = await trendsResponse.json();

        setMarketStats({
          totalOffers: offers.length,
          activeOffers: offers.filter((o: any) => o.is_active).length,
          topSkills: trends.map((t: any) => ({ skill: t.skill_name, count: t.job_count })),
          lastUpdate: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to load market stats:', error);
    }
  };

  const runScraper = async () => {
    setIsLoading(true);
    setError(null);
    setScrapingResult(null);

    try {
      const response = await fetch(`${FUNCTIONS_URL}/job-scraper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        setScrapingResult(result);
        // Odśwież logi i statystyki
        await loadRecentLogs();
        await loadMarketStats();
      } else {
        setError(result.error || 'Scraping failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const runMarketAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${FUNCTIONS_URL}/market-analyzer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        await loadMarketStats();
        alert('Analiza rynku zakończona pomyślnie!');
      } else {
        setError(result.error || 'Market analysis failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Market Scraping Dashboard</h1>
        <p className="text-gray-600">Zarządzaj scrapingiem ofert pracy i analizą rynku</p>
      </div>

      {/* Kontrolki */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <motion.button
          onClick={runScraper}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          Uruchom scraping
        </motion.button>

        <motion.button
          onClick={runMarketAnalysis}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <TrendingUp className="w-5 h-5" />
          Analizuj rynek
        </motion.button>
      </div>

      {/* Błędy */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 font-medium">Błąd:</span>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
        </motion.div>
      )}

      {/* Wynik ostatniego scrapingu */}
      {scrapingResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-green-800 mb-4">Wynik scrapingu</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{scrapingResult.offersScraped}</div>
              <div className="text-sm text-green-600">Pobrane oferty</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{scrapingResult.offersNew}</div>
              <div className="text-sm text-blue-600">Nowe oferty</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-700">{scrapingResult.offersUpdated}</div>
              <div className="text-sm text-orange-600">Zaktualizowane</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700">{formatTime(scrapingResult.executionTimeMs)}</div>
              <div className="text-sm text-purple-600">Czas wykonania</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Statystyki rynku */}
      {marketStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              Statystyki ofert
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Łącznie ofert:</span>
                <span className="font-semibold">{marketStats.totalOffers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Aktywne oferty:</span>
                <span className="font-semibold text-green-600">{marketStats.activeOffers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ostatnia aktualizacja:</span>
                <span className="text-sm text-gray-500">
                  {new Date(marketStats.lastUpdate).toLocaleString('pl-PL')}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              Top umiejętności
            </h3>
            <div className="space-y-3">
              {marketStats.topSkills.map((skill, index) => (
                <div key={skill.skill} className="flex justify-between items-center">
                  <span className="text-gray-700">{skill.skill}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ 
                          width: `${(skill.count / (marketStats.topSkills[0]?.count || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-8 text-right">
                      {skill.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Historia scrapingu */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Historia scrapingu</h3>
        <div className="space-y-3">
          {recentLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Brak historii scrapingu</p>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(log.status)}
                  <div>
                    <div className="font-medium text-gray-800">{log.source_portal}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(log.started_at).toLocaleString('pl-PL')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-800">
                    {log.offers_scraped} ofert ({log.offers_new} nowych)
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTime(log.execution_time_ms)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ScrapingDashboard;