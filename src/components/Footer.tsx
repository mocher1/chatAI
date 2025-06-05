import React from 'react';

const Footer: React.FC = () => (
  <footer className="bg-white border-t border-gray-200 py-8 px-6 text-center text-sm text-gray-500">
    <div className="max-w-4xl mx-auto space-y-4">
      <p>
        CareerGPT PL © {new Date().getFullYear()} · Twoje wsparcie w świadomych decyzjach zawodowych
      </p>
      <p>
        Stworzone z myślą o polskich kandydatach, którzy chcą rozwijać karierę szybciej.
      </p>
      <p>
        <span className="underline hover:text-indigo-600 cursor-pointer">Polityka prywatności</span> ·{' '}
        <span className="underline hover:text-indigo-600 cursor-pointer">Regulamin</span>
      </p>
    </div>
  </footer>
);

export default Footer;
