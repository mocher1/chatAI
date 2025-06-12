import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const features = [
  {
    icon: '📄',
    title: 'CV, które trafia w sedno',
    description: 'Dowiesz się, jak wyróżnić swoje osiągnięcia i sprawić, by rekruterzy chcieli Cię poznać.',
    color: 'from-emerald-400 to-teal-500'
  },
  {
    icon: '🎤',
    title: 'Rozmowa rekrutacyjna bez stresu',
    description: 'Ćwicz pytania, dostawaj wskazówki i wchodź na spotkanie przygotowany jak nigdy.',
    color: 'from-blue-400 to-indigo-500'
  },
  {
    icon: '🔎',
    title: 'Ogłoszenia bez tajemnic',
    description: 'CareerGPT tłumaczy HR-owy żargon i mówi wprost, czy warto wysłać CV.',
    color: 'from-purple-400 to-pink-500'
  },
  {
    icon: '💡',
    title: 'Ścieżka kariery dopasowana do Ciebie',
    description: 'Otrzymasz plan krok po kroku – niezależnie czy celujesz w awans, zmianę branży czy powrót na rynek.',
    color: 'from-orange-400 to-red-500'
  },
];

const FeatureCards: React.FC = () => {
  const reduceMotion = useReducedMotion();
  return (
    <section id="features" className="py-12 bg-gradient-to-br from-gray-50 to-blue-50">
      <motion.div 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: reduceMotion ? 0 : 0.8 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: reduceMotion ? 0 : index * 0.2, duration: reduceMotion ? 0 : 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div className={`flex justify-center items-center mb-4 w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${feature.color} shadow-lg`}>
                <span className="text-3xl">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center text-gray-800">{feature.title}</h3>
              <p className="text-gray-600 text-center leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default FeatureCards;
