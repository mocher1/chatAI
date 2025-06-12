import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const ForWhom: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section id="for-whom" className="bg-gradient-to-br from-white to-purple-50 py-16 px-6">
      <motion.div
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: reduceMotion ? 0 : 0.8 }}
      >
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
        To Ty?
      </h2>
      <div className="grid md:grid-cols-2 gap-12 max-w-3xl mx-auto">
        <motion.div 
          className="space-y-6 bg-white rounded-2xl p-8 shadow-lg border border-purple-100"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        transition={{ delay: reduceMotion ? 0 : 0.2, duration: reduceMotion ? 0 : 0.6 }}
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-xl font-semibold text-gray-800 text-center">Pierwsza praca na horyzoncie?</h3>
          <ul className="space-y-4 text-gray-700">
            <li className="flex gap-3 items-start">
              <span className="text-emerald-500 text-xl">🔹</span>
              Nie wiesz, jak wystartować po studiach?
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-blue-500 text-xl">🔹</span>
              Masz skromne doświadczenie w CV?
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-purple-500 text-xl">🔹</span>
              Stresuje Cię rozmowa o pracę?
            </li>
          </ul>
        </motion.div>
        <motion.div 
          className="space-y-6 bg-white rounded-2xl p-8 shadow-lg border border-blue-100"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        transition={{ delay: reduceMotion ? 0 : 0.4, duration: reduceMotion ? 0 : 0.6 }}
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-xl font-semibold text-gray-800 text-center">Planujesz zmianę pracy?</h3>
          <ul className="space-y-4 text-gray-700">
            <li className="flex gap-3 items-start">
              <span className="text-orange-500 text-xl">🔹</span>
              Chcesz wejść do nowej branży?
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-pink-500 text-xl">🔹</span>
              Wracasz na rynek po przerwie?
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-indigo-500 text-xl">🔹</span>
              Nie wiesz, jak rozmawiać o wynagrodzeniu?
            </li>
          </ul>
        </motion.div>
      </div>
    </motion.div>
  </section>
  );
};

export default ForWhom;
