import React from 'react';

const ForWhom: React.FC = () => (
  <section className="bg-white py-16 px-6">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 text-center">
        To Ty?
      </h2>
      <div className="grid md:grid-cols-2 gap-12 max-w-3xl mx-auto">
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800">Pierwsza praca na horyzoncie?</h3>
          <ul className="space-y-4 text-gray-700">
            <li className="flex gap-3 items-start">
              <span className="text-indigo-600 text-xl">🔹</span>
              Nie wiesz, jak wystartować po studiach?
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-indigo-600 text-xl">🔹</span>
              Masz skromne doświadczenie w CV?
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-indigo-600 text-xl">🔹</span>
              Stresuje Cię rozmowa o pracę?
            </li>
          </ul>
        </div>
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800">Planujesz zmianę pracy?</h3>
          <ul className="space-y-4 text-gray-700">
            <li className="flex gap-3 items-start">
              <span className="text-indigo-600 text-xl">🔹</span>
              Chcesz wejść do nowej branży?
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-indigo-600 text-xl">🔹</span>
              Wracasz na rynek po przerwie?
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-indigo-600 text-xl">🔹</span>
              Nie wiesz, jak rozmawiać o wynagrodzeniu?
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
);

export default ForWhom