import React, { lazy, Suspense } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import ForWhom from './components/ForWhom';
import FeatureCards from './components/FeatureCards';
import HowItWorks from './components/HowItWorks';
const ChatBox = lazy(() => import('./components/ChatBox'));
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-grow">
        <HeroSection />
        <ForWhom />
        <FeatureCards />
        <HowItWorks />
        <Suspense fallback={<div className="text-center py-8">Loading chat...</div>}>
          <ChatBox />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default App;
