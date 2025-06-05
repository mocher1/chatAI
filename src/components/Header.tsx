import React from 'react';

const Header: React.FC = () => (
  <header className="w-full px-6 py-4 bg-white border-b border-gray-200">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="text-xl font-bold text-indigo-600 tracking-tight">
        CareerGPT<span className="text-gray-900"> PL</span>
      </div>
      <a
        href="#chat"
        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
      >
        Zacznij teraz
      </a>
    </div>
  </header>
);

export default Header;
