import React from 'react';
import { FileText, Mic, Search, Lightbulb } from 'lucide-react';

interface Feature {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    Icon: FileText,
    title: 'CV, które przyciąga spojrzenia',
    description: 'Stwórz dokument, który od razu zwróci uwagę rekruterów i podkreśli Twoje atuty.',
  },
  {
    Icon: Mic,
    title: 'Pewny głos na rozmowie',
    description: 'Przećwicz odpowiedzi i poznaj techniki, które zrobią wrażenie na każdym rekruterze.',
  },
  {
    Icon: Search,
    title: 'Analiza ofert w kilka sekund',
    description: 'Dowiedz się, czy dana propozycja naprawdę pasuje do Twoich oczekiwań i możliwości.',
  },
  {
    Icon: Lightbulb,
    title: 'Kierunek rozwoju',
    description: 'Zobacz dokładną, klarowną ścieżkę kariery prowadzącą do wymarzonego stanowiska.',
  },
];

const FeatureCards: React.FC = () => (
  <section className="py-12 bg-gray-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ Icon, title, description }, index) => (
          <div key={index} className="card p-6 text-center">
            <div className="flex justify-center mb-4">
              <Icon className="w-10 h-10 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-gray-600">{description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeatureCards;
