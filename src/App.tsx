import React, { lazy, Suspense } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import ForWhom from './components/ForWhom';
import FeatureCards from './components/FeatureCards';
import HowItWorks from './components/HowItWorks';
const ChatBox = lazy(() => import('./components/ChatBox'));
import Footer from './components/Footer';
import ConnectionTest from './components/ConnectionTest';

function App() {
  // Show connection test if in development or if there are connection issues
  const showConnectionTest = import.meta.env.DEV || 
    !import.meta.env.VITE_SUPABASE_URL || 
    import.meta.env.VITE_SUPABASE_URL === 'your_supabase_project_url';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-grow">
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
      </main>
      <Footer />
    </div>
  );
}

export default App;