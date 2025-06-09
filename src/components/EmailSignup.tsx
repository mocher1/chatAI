import React, { useState } from 'react';
import { motion } from 'framer-motion';

const EmailSignup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="py-12 px-6 bg-gradient-to-br from-purple-100 via-blue-100 to-indigo-100 border-t border-purple-200">
      <motion.div 
        className="max-w-2xl mx-auto text-center space-y-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-2xl font-bold text-gray-900">
          Zapisz się jako pierwszy – otrzymasz dostęp do wersji premium przed premierą. 🚀
        </h2>
        {!submitted ? (
          <motion.form 
            onSubmit={handleSubmit} 
            className="flex flex-col sm:flex-row gap-3 justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <input
              type="email"
              placeholder="Twój e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="px-4 py-3 rounded-lg border border-purple-300 w-full sm:w-72 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            />
            <motion.button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/25 font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Zapisz się
            </motion.button>
          </motion.form>
        ) : (
          <motion.p 
            className="text-green-700 font-medium text-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            Dziękujemy! Powiadomimy Cię jako pierwszego. 💌
          </motion.p>
        )}
      </motion.div>
    </section>
  );
};

export default EmailSignup;