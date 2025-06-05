import React from 'react';

const ForWhom: React.FC = () => (
  <section className="bg-white py-16 px-6">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 text-center">
        To Ty?
      </h2>
      <div className="grid md:grid-cols-2 gap-12 max-w-3xl mx-auto">
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800">Szukasz pierwszej pracy?</h3>
          <ul className="space-y-4 text-gray-700">
            <li className="flex gap-3 items-start">
              <span className="text-indigo-600 text-xl">🔹</span>
              Jesteś po studiach i nie wiesz, jak zacząć?
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-indigo-600 text-xl">🔹</span>
              Brakuje Ci doświadczenia w CV?
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-indigo-600 text-xl">🔹</span>
              Obawiasz się pierwszej rozmowy?
            </li>
          </ul>
        </div>
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800">Chcesz zmienić pracę?</h3>
          <ul className="space-y-4 text-gray-700">
            <li className="flex gap-3 items-start">
              <span className="text-indigo-600 text-xl">🔹</span>
              Myślisz o zmianie branży?
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-indigo-600 text-xl">🔹</span>
              Wracasz na rynek po przerwie?
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-indigo-600 text-xl">🔹</span>
              Nie wiesz, jak negocjować wynagrodzenie?
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
);

export default ForWhom