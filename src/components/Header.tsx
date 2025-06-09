import React from 'react';
import { motion } from 'framer-motion';

const Header: React.FC = () => (
  <motion.header 
    className="w-full px-6 py-4 bg-white/95 backdrop-blur-sm border-b border-purple-200 sticky top-0 z-50"
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
  >
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <motion.div 
        className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent tracking-tight"
        whileHover={{ scale: 1.05 }}
      >
        CareerGPT<span className="text-gray-900"> PL</span>
      </motion.div>
      <motion.a
        href="#chat"
        className="text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent hover:from-purple-700 hover:to-blue-700 transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Zadaj pytanie
      </motion.a>
    </div>
  </motion.header>
);

export default Header;