import React from 'react';
import Typewriter from 'typewriter-effect';

const HeroSection: React.FC = () => (
  <section className="text-center py-16 px-6 bg-gradient-to-b from-indigo-50 to-white">
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
        Zapomnij o domysłach. CareerGPT tłumaczy rekrutacyjne zawiłości na prosty język i podpowiada konkretnie, jak zrobić kolejny krok w pracy.
      </p>
      <a
        href="#chat"
        className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-full text-lg font-medium shadow hover:bg-indigo-700 hover:shadow-lg transition transform hover:scale-105"
      >
        Zapytaj już teraz
      </a>
    </div>
  </section>
);

export default HeroSection;