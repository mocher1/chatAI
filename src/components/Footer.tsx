import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const Footer: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.footer
      className="bg-gradient-to-br from-gray-50 to-purple-50 border-t border-purple-200 py-8 px-6 text-center text-sm text-gray-600"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: reduceMotion ? 0 : 0.8 }}
    >
    <div className="max-w-4xl mx-auto space-y-4">
      <p>
        CareerGPT PL © {new Date().getFullYear()} · Twoje wsparcie w świadomych decyzjach zawodowych
      </p>
      <p>
        Stworzone z myślą o polskich kandydatach, którzy chcą rozwijać karierę szybciej.
      </p>
      <p>
        <motion.span 
          className="underline hover:text-purple-600 cursor-pointer transition-colors"
          whileHover={{ scale: 1.05 }}
        >
          Polityka prywatności
        </motion.span> ·{' '}
        <motion.span 
          className="underline hover:text-purple-600 cursor-pointer transition-colors"
          whileHover={{ scale: 1.05 }}
        >
          Regulamin
        </motion.span>
      </p>
    </div>
  </motion.footer>
  );
};

export default Footer;
