import React from 'react';

const steps = [
  {
    icon: '📝',
    title: 'Zadaj pytanie po swojemu',
    description: 'Napisz np. "Nie wiem, jak odpowiedzieć na pytanie o swoje słabości" - CareerGPT zrozumie i pomoże.',
  },
  {
    icon: '💡',
    title: 'Dostań konkretną odpowiedź',
    description: 'Bez ogólników, bez teorii. Dokładnie to, czego potrzebujesz w Twojej sytuacji.',
  },
  {
    icon: '🚀',
    title: 'Wprowadź plan w życie',
    description: 'Masz gotową strategię i konkretne kroki do działania. Możesz od razu zacząć.',
  },
];

const HowItWorks: React.FC = () => (
  <section className="py-24 px-6 bg-white">
    <div className="max-w-6xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">Jak to działa?</h2>
      <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
        CareerGPT to nie zwykły czat. To doradca, który naprawdę rozumie Twoją sytuację i polski rynek pracy.
      </p>
      <div className="grid gap-10 md:grid-cols-3">
        {steps.map((step, i) => (
          <div key={i} className="text-center bg-gray-50 p-6 rounded-xl shadow-sm hover:shadow-md transition">
            <div className="flex justify-center items-center mb-4">
              <span className="text-4xl">{step.icon}</span>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-center">{step.title}</h3>
            <p className="text-gray-600 text-base text-center">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;