import React from 'react';
import Typewriter from 'typewriter-effect';
import { motion } from 'framer-motion';

const HeroSection: React.FC = () => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="text-center py-16 px-6 bg-gradient-to-b from-indigo-50 to-white"
  >
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-snug tracking-tight">
        Masz pytanie o karierę?{' '}
        <span className="text-indigo-600">
          <Typewriter
            options={{
              strings: ['CareerGPT zna odpowiedź – po polsku i po ludzku.'],
              autoStart: true,
              loop: false,
              delay: 50,
              cursor: '|',
              deleteSpeed: 999999999 // Effectively prevents deletion
            }}
          />
        </span>
      </h1>
      <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
        Nie musisz znać się na AI. Wystarczy, że zapytasz. CareerGPT to Twój osobisty doradca zawodowy, który rozumie stres rekrutacji, polskie realia i nie używa HR-owego bełkotu.
      </p>
      <a
        href="#chat"
        className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-full text-lg font-medium shadow hover:bg-indigo-700 hover:shadow-lg transition transform hover:scale-105"
      >
        Zacznij rozmowę
      </a>
    </div>
  </motion.section>
);

export default HeroSection;