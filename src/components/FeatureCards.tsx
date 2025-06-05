import React from 'react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: '📄',
    title: 'Twoje CV – od zera lub do poprawy',
    description: 'Podpowie Ci, co napisać w CV na juniora, specjalistę albo po przerwie w pracy. Bez lania wody.',
  },
  {
    icon: '🎤',
    title: 'Rozmowa rekrutacyjna? Spokojnie',
    description: 'Przećwiczysz odpowiedzi, zadasz pytania, poznasz zasady gry. CareerGPT wie, o co pytają rekruterzy.',
  },
  {
    icon: '🔎',
    title: 'Zrozum ogłoszenia o pracę',
    description: 'Nie wiesz, czy spełniasz wymagania? CareerGPT przetłumaczy HR-owy język na ludzki i doradzi, czy aplikować.',
  },
  {
    icon: '💡',
    title: 'Planowanie kariery krok po kroku',
    description: 'Zmiana branży? Awans? Powrót na rynek? Dostaniesz konkretny plan działania dopasowany do Twojej sytuacji.',
  },
];

const FeatureCards: React.FC = () => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-12 bg-gray-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex justify-center items-center mb-4">
                <span className="text-4xl">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">{feature.title}</h3>
              <p className="text-gray-600 text-center">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default FeatureCards;