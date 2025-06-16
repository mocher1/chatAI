import React, { lazy, Suspense, useState } from 'react';
import { Database } from 'lucide-react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import ForWhom from './components/ForWhom';
import FeatureCards from './components/FeatureCards';
import HowItWorks from './components/HowItWorks';
const ChatBox = lazy(() => import('./components/ChatBox'));
import Footer from './components/Footer';
import ConnectionTest from './components/ConnectionTest';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ScrapingDashboard from './components/ScrapingDashboard';

function App() {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showScraping, setShowScraping] = useState(false);

  // Show connection test if in development or if there are connection issues
  const showConnectionTest = import.meta.env.DEV || 
    !import.meta.env.VITE_SUPABASE_URL || 
    import.meta.env.VITE_SUPABASE_URL === 'your_supabase_project_url';

  // Show scraping dashboard in development
  const showScrapingDashboard = import.meta.env.DEV;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-grow">
        {showScraping ? (
          <section className="py-8 px-6">
            <div className="max-w-6xl mx-auto mb-4">
              <button
                onClick={() => setShowScraping(false)}
                className="text-purple-600 hover:text-purple-700 underline"
              >
                ← Powrót do głównej strony
              </button>
            </div>
            <ScrapingDashboard />
          </section>
        ) : (
          <>
            <HeroSection />
            <ForWhom />
            <FeatureCards />
            <HowItWorks />
            
            {showConnectionTest && (
              <section className="py-8 px-6 bg-yellow-50 border-t border-yellow-200">
                <ConnectionTest />
              </section>
            )}
            
            <Suspense fallback={<div className="text-center py-8">Loading chat...</div>}>
              <ChatBox />
            </Suspense>
          </>
        )}
      </main>
      <Footer />
      
      {/* Analytics Dashboard */}
      <AnalyticsDashboard 
        isVisible={showAnalytics}
        onToggle={() => setShowAnalytics(!showAnalytics)}
      />

      {/* Scraping Dashboard Toggle (tylko w development) */}
      {showScrapingDashboard && !showScraping && (
        <button
          onClick={() => setShowScraping(true)}
          className="fixed bottom-20 right-4 bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition-colors z-40"
          title="Pokaż dashboard scrapingu"
        >
          <Database className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

export default App;