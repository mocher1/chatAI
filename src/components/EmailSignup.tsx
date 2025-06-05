import React, { useState } from 'react';

const EmailSignup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="py-12 px-6 bg-indigo-50 border-t border-indigo-100">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Zapisz się jako pierwszy – otrzymasz dostęp do wersji premium przed premierą. 🚀
        </h2>
        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 justify-center">
            <input
              type="email"
              placeholder="Twój e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="px-4 py-2 rounded-md border border-gray-300 w-full sm:w-72"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition"
            >
              Zapisz się
            </button>
          </form>
        ) : (
          <p className="text-green-700 font-medium">Dziękujemy! Powiadomimy Cię jako pierwszego. 💌</p>
        )}
      </div>
    </section>
  );
};

export default EmailSignup