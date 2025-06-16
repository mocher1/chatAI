import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';

const ConnectionTest: React.FC = () => {
  const [testResults, setTestResults] = useState<{
    supabaseConfig: boolean;
    edgeFunctions: boolean;
    openaiConfig: boolean;
    details: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runConnectionTest = async () => {
    setIsLoading(true);
    const results = {
      supabaseConfig: false,
      edgeFunctions: false,
      openaiConfig: false,
      details: [] as string[]
    };

    // Test 1: Supabase Configuration
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseUrl !== 'your_supabase_project_url' && supabaseKey) {
      results.supabaseConfig = true;
      results.details.push('✅ Konfiguracja Supabase: OK');
    } else {
      results.details.push('❌ Konfiguracja Supabase: Brak zmiennych środowiskowych');
    }

    // Test 2: Edge Functions
    if (results.supabaseConfig) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/create-thread`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          }
        });

        if (response.ok) {
          results.edgeFunctions = true;
          results.details.push('✅ Edge Functions: Dostępne');
          
          // Test 3: OpenAI Configuration (through Edge Function)
          const data = await response.json();
          if (data.threadId) {
            results.openaiConfig = true;
            results.details.push('✅ Konfiguracja OpenAI: OK');
          }
        } else if (response.status === 500) {
          results.details.push('❌ Edge Functions: Błąd konfiguracji OpenAI (sprawdź OPENAI_API_KEY i ASSISTANT_ID)');
        } else {
          results.details.push(`❌ Edge Functions: Błąd ${response.status}`);
        }
      } catch (error) {
        results.details.push('❌ Edge Functions: Niedostępne');
      }
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg border">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <AlertCircle className="w-6 h-6 text-blue-500" />
        Test połączenia z Supabase
      </h3>
      
      <motion.button
        onClick={runConnectionTest}
        disabled={isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-4"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isLoading ? 'Testowanie...' : 'Uruchom test'}
      </motion.button>

      {testResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="grid gap-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(testResults.supabaseConfig)}
              <span className="font-medium">Konfiguracja Supabase</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(testResults.edgeFunctions)}
              <span className="font-medium">Edge Functions</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(testResults.openaiConfig)}
              <span className="font-medium">Konfiguracja OpenAI</span>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Szczegóły:</h4>
            <ul className="space-y-1 text-sm">
              {testResults.details.map((detail, index) => (
                <li key={index} className="font-mono">{detail}</li>
              ))}
            </ul>
          </div>

          {!testResults.supabaseConfig && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">Jak naprawić:</h4>
              <ol className="text-sm text-red-700 space-y-1 list-decimal list-inside">
                <li>Kliknij przycisk "Connect to Supabase" w prawym górnym rogu</li>
                <li>Skopiuj URL projektu i klucz API</li>
                <li>Sprawdź plik .env</li>
              </ol>
            </div>
          )}

          {testResults.supabaseConfig && !testResults.openaiConfig && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2">Konfiguracja OpenAI:</h4>
              <ol className="text-sm text-orange-700 space-y-2 list-decimal list-inside">
                <li>Przejdź do panelu Supabase → Edge Functions → Settings</li>
                <li>Dodaj zmienne środowiskowe:
                  <ul className="ml-4 mt-1 space-y-1 list-disc list-inside">
                    <li><code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY</code></li>
                    <li><code className="bg-gray-100 px-1 rounded">ASSISTANT_ID</code></li>
                  </ul>
                </li>
                <li>
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-1"
                  >
                    Uzyskaj klucz OpenAI API <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ol>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default ConnectionTest;