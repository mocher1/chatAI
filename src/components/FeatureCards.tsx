import React from 'react';

const features = [
  {
    icon: '📄',
    title: 'CV, które trafia w sedno',
    description: 'Dowiesz się, jak wyróżnić swoje osiągnięcia i sprawić, by rekruterzy chcieli Cię poznać.',
  },
  {
    icon: '🎤',
    title: 'Rozmowa rekrutacyjna bez stresu',
    description: 'Ćwicz pytania, dostawaj wskazówki i wchodź na spotkanie przygotowany jak nigdy.',
  },
  {
    icon: '🔎',
    title: 'Ogłoszenia bez tajemnic',
    description: 'CareerGPT tłumaczy HR-owy żargon i mówi wprost, czy warto wysłać CV.',
  },
  {
    icon: '💡',
    title: 'Ścieżka kariery dopasowana do Ciebie',
    description: 'Otrzymasz plan krok po kroku – niezależnie czy celujesz w awans, zmianę branży czy powrót na rynek.',
  },
];

const FeatureCards: React.FC = () => {
  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex justify-center items-center mb-4">
                <span className="text-4xl">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">{feature.title}</h3>
              <p className="text-gray-600 text-center">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureCards;