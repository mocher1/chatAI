import React from 'react';
import Typewriter from 'typewriter-effect';
import { motion } from 'framer-motion';

const HeroSection: React.FC = () => {
  const scrollToChat = () => {
    const element = document.getElementById('chat');
    if (element) {
      const headerHeight = 80;
      const elementPosition = element.offsetTop - headerHeight;
      
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section id="hero" className="text-center py-16 px-6 bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100">
      <motion.div 
        className="max-w-4xl mx-auto space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-snug tracking-tight">
          Masz pytanie o karierę?{' '}
          <span className="text-indigo-600">
            <Typewriter
              options={{
                strings: ['CareerGPT da Ci odpowiedź - sprawdzoną i skuteczną!'],
                autoStart: true,
                loop: false,
                delay: 50,
                cursor: '|',
                deleteSpeed: 999999999
              }}
            />
          </span>
        </h1>
        <motion.p 
          className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Zapomnij o domysłach. CareerGPT tłumaczy rekrutacyjne zawiłości na prosty język i podpowiada konkretnie, jak zrobić kolejny krok w pracy.
        </motion.p>
        <motion.button
          onClick={scrollToChat}
          className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full text-lg font-medium shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-blue-700 hover:shadow-xl hover:shadow-purple-500/30 transition-all transform hover:scale-105"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Zapytaj już teraz
        </motion.button>
      </motion.div>
    </section>
  );
};

export default HeroSection;