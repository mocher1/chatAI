import React from 'react';
import { motion } from 'framer-motion';

const steps = [
  {
    icon: '📝',
    title: 'Napisz, z czym masz problem',
    description: 'Opowiedz własnymi słowami, a CareerGPT od razu chwyci sedno.',
    color: 'from-green-400 to-emerald-500'
  },
  {
    icon: '💡',
    title: 'Otrzymaj jasną poradę',
    description: 'Konkretne wskazówki i przykłady dobrane do Twojej sytuacji.',
    color: 'from-yellow-400 to-orange-500'
  },
  {
    icon: '🚀',
    title: 'Działaj od razu',
    description: 'Dostajesz listę kroków i możesz natychmiast przejść do działania.',
    color: 'from-blue-400 to-purple-500'
  },
];

const HowItWorks: React.FC = () => (
  <section className="py-16 px-6 bg-gradient-to-br from-white to-indigo-50">
    <motion.div 
      className="max-w-6xl mx-auto text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        Jak to działa?
      </h2>
      <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
        CareerGPT to nie zwykły czat. To doradca, który naprawdę rozumie Twoją sytuację i polski rynek pracy.
      </p>
      <div className="grid gap-10 md:grid-cols-3">
        {steps.map((step, i) => (
          <motion.div 
            key={i} 
            className="text-center bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2, duration: 0.6 }}
            whileHover={{ y: -5, scale: 1.02 }}
          >
            <div className={`flex justify-center items-center mb-6 w-20 h-20 mx-auto rounded-full bg-gradient-to-r ${step.color} shadow-lg`}>
              <span className="text-4xl">{step.icon}</span>
            </div>
            <h3 className="text-xl font-semibold mb-4 text-center text-gray-800">{step.title}</h3>
            <p className="text-gray-600 text-base text-center leading-relaxed">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </section>
);

export default HowItWorks;
