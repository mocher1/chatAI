import React from 'react';
import Typewriter from 'typewriter-effect';
import { Bot } from 'lucide-react';

const HeroSection: React.FC = () => (
  <section className="py-16 px-6 bg-gradient-to-b from-indigo-50 to-white">
    <div className="max-w-7xl mx-auto grid items-center gap-8 md:grid-cols-2">
      <div className="space-y-6 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-snug tracking-tight">
          Masz pytanie o karierę?{' '}
          <span className="text-indigo-600">
            <Typewriter
              options={{
                strings: ['Kariera w trybie turbo z CareerGPT.'],
                autoStart: true,
                loop: false,
                delay: 50,
                cursor: '|',
                deleteSpeed: 999999999,
              }}
            />
          </span>
        </h1>
        <p className="text-lg text-gray-700 leading-relaxed">
          Nie musisz znać się na AI. Wystarczy, że zapytasz. CareerGPT to Twój osobisty doradca zawodowy, który rozumie stres rekrutacji i polskie realia.
        </p>
        <a
          href="#chat"
          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-full text-lg font-medium shadow hover:bg-indigo-700 hover:shadow-lg transition transform hover:scale-105"
        >
          Zacznij rozmowę
        </a>
      </div>
      <div className="flex justify-center md:justify-end">
        <Bot className="w-48 h-48 text-indigo-600" />
      </div>
    </div>
  </section>
);

export default HeroSection;