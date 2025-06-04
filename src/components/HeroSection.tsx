import React, { useEffect, useState } from 'react';

const HeroSection: React.FC = () => {
  const text =
    'Masz pytanie o karierę? CareerGPT zna odpowiedź – po polsku i po ludzku.';
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, index + 1));
      index += 1;
      if (index === text.length) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="text-center py-24 px-6 bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-snug tracking-tight">
          {displayed}
          <span className="border-r-2 border-gray-900 ml-1 animate-blink" />
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
    </section>
  );
};

export default HeroSection