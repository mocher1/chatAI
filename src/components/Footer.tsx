import React from 'react';

const Footer: React.FC = () => (
  <footer className="bg-white border-t border-gray-200 py-8 px-6 text-center text-sm text-gray-500">
    <div className="max-w-4xl mx-auto space-y-4">
      <p>CareerGPT PL © {new Date().getFullYear()}</p>
      <p>Twój doradca kariery oparty na AI.</p>
      <p>
        <a href="#privacy" className="underline hover:text-indigo-600">Polityka prywatności</a>
        {' '}·{' '}
        <span className="underline hover:text-indigo-600 cursor-pointer">Regulamin</span>
      </p>
      <div>
        <a
          href="#chat"
          className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow hover:bg-indigo-700 hover:shadow-lg transition transform hover:scale-105"
        >
          Zacznij rozmowę
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
