import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Send, Loader2, User, Bot, AlertCircle, Settings, ExternalLink, Copy, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
  isRetryable?: boolean;
}

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const reduceMotion = useReducedMotion();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // URL do naszych Edge Functions
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

  // Function to clean metadata from assistant responses
  const cleanAssistantResponse = (content: string): string => {
    if (!content) return '';
    
    // Remove file metadata like [24:14†Goldman-Recruitment...] and replace with clean source reference
    return content.replace(/\[\d+:\d+†([^\]]+)\]/g, (match, filename) => {
      // Extract just the filename without path and extension for cleaner display
      const cleanFilename = filename.split('/').pop()?.replace(/\.[^/.]+$/, '') || filename;
      return `— źródło: ${cleanFilename}`;
    });
  };

  // Function to validate assistant response
  const validateAssistantResponse = (data: any): string | null => {
    console.log('Validating assistant response:', data);
    
    if (!data) {
      console.warn('No data received from assistant');
      return null;
    }

    if (!data.assistantMessage) {
      console.warn('No assistantMessage in response:', data);
      return null;
    }

    const message = data.assistantMessage.trim();
    if (!message || message.length === 0) {
      console.warn('Empty assistant message received');
      return null;
    }

    return message;
  };

  // Function to create fallback response
  const createFallbackResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('cv') || lowerMessage.includes('życiorys')) {
      return `Przepraszam, nie mogłem przetworzyć Twojego pytania o CV. Oto kilka ogólnych wskazówek:

**Podstawowe elementy CV:**
- Dane kontaktowe
- Doświadczenie zawodowe (od najnowszego)
- Wykształcenie
- Umiejętności techniczne
- Języki obce

**Wskazówki:**
- Dostosuj CV do konkretnej oferty pracy
- Używaj konkretnych liczb i osiągnięć
- Maksymalnie 2 strony A4

Spróbuj zadać bardziej konkretne pytanie, np. "Jak napisać CV na stanowisko junior developera?"`;
    }

    if (lowerMessage.includes('rozmowa') || lowerMessage.includes('rekrutacja')) {
      return `Nie udało mi się odpowiedzieć na Twoje pytanie o rozmowę kwalifikacyjną. Oto podstawowe wskazówki:

**Przygotowanie do rozmowy:**
- Zbadaj firmę i stanowisko
- Przygotuj pytania do rekrutera
- Ćwicz odpowiedzi na typowe pytania
- Przygotuj przykłady swoich osiągnięć

**Podczas rozmowy:**
- Bądź punktualny
- Słuchaj uważnie
- Zadawaj przemyślane pytania
- Pokazuj entuzjazm

Możesz spróbować zadać bardziej szczegółowe pytanie.`;
    }

    return `Przepraszam, nie mogłem przetworzyć Twojego pytania. Jako CareerGPT mogę pomóc Ci w:

- **Pisaniu CV** - dostosowanie do stanowiska, formatowanie, treść
- **Przygotowaniu do rozmowy** - typowe pytania, negocjacje, prezentacja
- **Planowaniu kariery** - zmiana branży, rozwój kompetencji
- **Analizie ofert pracy** - co oznaczają wymagania, czy warto aplikować

Spróbuj zadać bardziej konkretne pytanie z jednego z tych obszarów.`;
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('chatMessages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Array<Partial<Message>>;
        setMessages(
          parsed.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content ?? '',
            timestamp: m.timestamp ?? new Date().toISOString(),
            isError: m.isError ?? false,
            isRetryable: m.isRetryable ?? false,
          }))
        );
      } catch (err) {
        console.error('Failed to parse saved messages', err);
      }
    }

    const savedThreadId = localStorage.getItem('threadId');
    if (savedThreadId) {
      setThreadId(savedThreadId);
      setIsInitializing(false);
    } else {
      createThread();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (threadId) {
      localStorage.setItem('threadId', threadId);
    } else {
      localStorage.removeItem('threadId');
    }
  }, [threadId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const createThread = async () => {
    setIsInitializing(true);
    setError(null);
    
    // Check if Supabase URL is configured
    if (!SUPABASE_URL || SUPABASE_URL === 'your_supabase_project_url') {
      setError('Supabase nie jest skonfigurowany. Kliknij przycisk "Connect to Supabase" w prawym górnym rogu.');
      setIsInitializing(false);
      return;
    }

    try {
      const response = await fetch(`${FUNCTIONS_URL}/create-thread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Thread creation failed:', response.status, errorText);
        
        if (response.status === 404) {
          throw new Error('Edge Functions nie są wdrożone. Sprawdź konfigurację Supabase.');
        } else if (response.status === 401) {
          throw new Error('Błąd autoryzacji. Sprawdź klucz API Supabase.');
        } else if (response.status === 500) {
          // Parse error response to get more details
          let errorMessage = 'Błąd konfiguracji serwera.';
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error === 'Server configuration error') {
              errorMessage = 'Zmienne środowiskowe nie są skonfigurowane w Supabase. Sprawdź konfigurację OPENAI_API_KEY i ASSISTANT_ID w panelu Supabase.';
            }
          } catch {
            // Keep default error message
          }
          throw new Error(errorMessage);
        } else {
          throw new Error(`Błąd serwera (${response.status}): ${errorText}`);
        }
      }
      
      const data = await response.json();
      
      if (!data.threadId) {
        throw new Error('Nie otrzymano ID wątku z serwera.');
      }
      
      setThreadId(data.threadId);
      setError(null);
    } catch (error) {
      console.error('Error creating thread:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd podczas tworzenia wątku';
      setError(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setError(null);
    setRetryCount(0);
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('threadId');
    setThreadId(null);
    createThread();
  };

  const handleCopy = async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const handleRetry = async (messageIndex: number) => {
    const message = messages[messageIndex - 1]; // Get the user message before the failed assistant message
    if (message && message.role === 'user') {
      // Remove the failed message and retry
      setMessages(prev => prev.slice(0, messageIndex));
      await processMessage(message.content, true);
    }
  };

  const processMessage = async (userMessage: string, isRetry: boolean = false) => {
    if (!threadId) return;

    setIsLoading(true);
    setError(null);

    if (!isRetry) {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: userMessage, timestamp: new Date().toISOString() }
      ]);
    }

    try {
      console.log('Sending message to assistant:', { threadId, message: userMessage });

      // Wysyłamy zapytanie do naszej Edge Function
      const response = await fetch(`${FUNCTIONS_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          threadId,
          message: userMessage
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chat request failed:', response.status, errorText);
        
        if (response.status === 404) {
          throw new Error('Edge Functions nie są dostępne. Sprawdź konfigurację Supabase.');
        } else if (response.status === 401) {
          throw new Error('Błąd autoryzacji. Sprawdź klucze API.');
        } else if (response.status === 500) {
          // Parse error response to get more details
          let errorMessage = 'Błąd serwera.';
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error === 'Server configuration error') {
              errorMessage = 'Zmienne środowiskowe nie są skonfigurowane w Supabase. Sprawdź konfigurację OPENAI_API_KEY i ASSISTANT_ID w panelu Supabase.';
            }
          } catch {
            errorMessage = 'Błąd serwera. Sprawdź konfigurację OpenAI API w Supabase.';
          }
          throw new Error(errorMessage);
        } else {
          throw new Error(`Błąd komunikacji (${response.status}): ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('Received data from assistant:', data);
      
      // Validate and clean the assistant response
      const validatedMessage = validateAssistantResponse(data);
      
      let finalMessage: string;
      let isError = false;
      let isRetryable = false;

      if (validatedMessage) {
        // Clean the assistant response before adding to messages
        finalMessage = cleanAssistantResponse(validatedMessage);
      } else {
        // Use fallback response if validation failed
        console.warn('Using fallback response due to invalid assistant message');
        finalMessage = createFallbackResponse(userMessage);
        isError = true;
        isRetryable = true;
      }
      
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: finalMessage, 
          timestamp: new Date().toISOString(),
          isError,
          isRetryable
        }
      ]);

      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Error in processMessage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd';
      
      // Add error message with retry option
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Przepraszam, wystąpił błąd: ${errorMessage}\n\n${createFallbackResponse(userMessage)}`,
          timestamp: new Date().toISOString(),
          isError: true,
          isRetryable: retryCount < 3
        }
      ]);

      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !threadId) return;

    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }

    await processMessage(userMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Render error state
  if (error && !threadId) {
    const isConfigError = error.includes('zmienne środowiskowe') || error.includes('OPENAI_API_KEY') || error.includes('ASSISTANT_ID');
    
    return (
      <motion.section 
        id="chat" 
        className="py-8 px-6 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.8 }}
      >
        <div className="max-w-3xl mx-auto">
          <motion.h2 
            className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.5 }}
          >
            Porozmawiaj z CareerGPT
          </motion.h2>
          
          <motion.div 
            className="glass-card rounded-2xl p-8 text-center border border-red-200/30 bg-red-50/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.2 }}
          >
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-700 mb-3">
              Problem z konfiguracją
            </h3>
            <p className="text-red-600 mb-6 leading-relaxed">
              {error}
            </p>
            
            <div className="space-y-4">
              <motion.button
                onClick={createThread}
                disabled={isInitializing}
                className="btn-primary bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 disabled:opacity-50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Próbuję ponownie...
                  </>
                ) : (
                  <>
                    <Settings className="w-5 h-5 mr-2" />
                    Spróbuj ponownie
                  </>
                )}
              </motion.button>
              
              <div className="text-sm text-gray-600 bg-white/50 rounded-lg p-4 border border-gray-200">
                <p className="font-medium mb-2">Kroki rozwiązywania problemu:</p>
                <ol className="text-left space-y-2 list-decimal list-inside">
                  <li>Kliknij przycisk "Connect to Supabase" w prawym górnym rogu</li>
                  {isConfigError && (
                    <>
                      <li>W panelu Supabase przejdź do "Edge Functions" → "Settings"</li>
                      <li>Dodaj zmienne środowiskowe:
                        <ul className="ml-4 mt-1 space-y-1 list-disc list-inside text-xs">
                          <li><code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY</code> - Twój klucz OpenAI API</li>
                          <li><code className="bg-gray-100 px-1 rounded">ASSISTANT_ID</code> - ID asystenta OpenAI</li>
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
                      <li>
                        <a 
                          href="https://platform.openai.com/assistants" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-1"
                        >
                          Utwórz asystenta OpenAI <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    </>
                  )}
                  <li>Poczekaj 1-2 minuty na propagację zmian</li>
                  <li>Odśwież stronę i spróbuj ponownie</li>
                </ol>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section 
      id="chat" 
      className="py-8 px-6 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: reduceMotion ? 0 : 0.8 }}
    >
      <div className="max-w-4xl mx-auto">
        <motion.h2 
          className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : 0.5 }}
        >
          Porozmawiaj z CareerGPT
        </motion.h2>
        <div className="text-right mb-4">
          <motion.button
            type="button"
            onClick={handleNewConversation}
            className="text-sm font-medium text-purple-600 hover:text-purple-700 transition"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Nowa rozmowa
          </motion.button>
        </div>
        
        <motion.div 
          className="glass-card rounded-2xl overflow-hidden shadow-glow border border-purple-200/30"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.2 }}
        >
          <div className="h-[70vh] md:h-[500px] overflow-y-auto p-6 space-y-6">
            {isInitializing ? (
              <motion.div 
                className="text-center text-gray-500 mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.5 }}
              >
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
                <p className="text-lg mb-2">Inicjalizuję CareerGPT...</p>
                <p className="text-sm text-gray-400">
                  Łączę się z serwerem i przygotowuję nową rozmowę
                </p>
              </motion.div>
            ) : (
              <AnimatePresence>
                {messages.length === 0 ? (
                  <motion.div 
                    className="text-center text-gray-500 mt-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: reduceMotion ? 0 : 0.5 }}
                  >
                    <p className="text-lg mb-4">
                      Zadaj pytanie o karierę, CV lub rozmowę kwalifikacyjną
                    </p>
                    <p className="text-sm text-gray-400">
                      Na przykład: "Jak napisać CV na stanowisko junior developera?"
                    </p>
                  </motion.div>
                ) : (
                  messages.map((message, index) => (
                    <motion.div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ 
                        delay: reduceMotion ? 0 : index * 0.05, 
                        duration: reduceMotion ? 0 : 0.3 
                      }}
                    >
                      <div className="flex gap-3 items-start max-w-[85%]">
                        {message.role === 'assistant' && (
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            message.isError 
                              ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                              : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                          }`}>
                            {message.isError ? (
                              <AlertCircle className="w-4 h-4 text-white" />
                            ) : (
                              <Bot className="w-4 h-4 text-white" />
                            )}
                          </div>
                        )}
                        
                        <motion.div
                          className={`relative rounded-2xl px-4 py-3 shadow-sm ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                              : message.isError
                              ? 'bg-orange-50 border border-orange-200 text-gray-800 rounded-bl-md'
                              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                          }`}
                          whileHover={{ scale: 1.01 }}
                          transition={{ duration: 0.2 }}
                        >
                          {message.role === 'assistant' && (
                            <div className="absolute top-2 right-2 flex gap-1">
                              {message.isRetryable && (
                                <button
                                  type="button"
                                  onClick={() => handleRetry(index)}
                                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
                                  title="Spróbuj ponownie"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopy(index, message.content)}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
                                title="Kopiuj wiadomość"
                              >
                                {copiedIndex === index ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          )}
                          
                          <ReactMarkdown
                            className={`prose prose-sm max-w-none ${
                              message.role === 'user' 
                                ? 'prose-invert text-white/95' 
                                : message.isError
                                ? 'prose-orange text-gray-800'
                                : 'prose-indigo text-gray-800'
                            }`}
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                              // Enhanced list styling
                              ul: ({ children }) => (
                                <ul className="space-y-1 my-3 pl-0">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="space-y-1 my-3 pl-0">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="flex items-start gap-2 text-sm leading-relaxed">
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                                    message.role === 'user' 
                                      ? 'bg-white/70' 
                                      : message.isError
                                      ? 'bg-orange-400'
                                      : 'bg-indigo-400'
                                  }`}></span>
                                  <span className="flex-1">{children}</span>
                                </li>
                              ),
                              // Enhanced typography
                              p: ({ children }) => (
                                <p className="mb-3 text-sm leading-relaxed">
                                  {children}
                                </p>
                              ),
                              strong: ({ children }) => (
                                <strong className={`font-semibold ${
                                  message.role === 'user' 
                                    ? 'text-white' 
                                    : message.isError
                                    ? 'text-orange-700'
                                    : 'text-indigo-700'
                                }`}>
                                  {children}
                                </strong>
                              ),
                              em: ({ children }) => (
                                <em className={`italic ${
                                  message.role === 'user' 
                                    ? 'text-white/90' 
                                    : message.isError
                                    ? 'text-orange-600'
                                    : 'text-indigo-600'
                                }`}>
                                  {children}
                                </em>
                              ),
                              code: ({ children }) => (
                                <code className={`px-2 py-1 rounded text-xs font-mono ${
                                  message.role === 'user' 
                                    ? 'bg-white/20 text-white' 
                                    : message.isError
                                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}>
                                  {children}
                                </code>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className={`border-l-4 pl-4 py-2 my-3 italic ${
                                  message.role === 'user' 
                                    ? 'border-white/50 text-white/90' 
                                    : message.isError
                                    ? 'border-orange-300 bg-orange-50/50 text-orange-800'
                                    : 'border-indigo-300 bg-indigo-50/50 text-indigo-800'
                                }`}>
                                  {children}
                                </blockquote>
                              ),
                              h1: ({ children }) => (
                                <h1 className={`text-lg font-bold mb-2 mt-3 ${
                                  message.role === 'user' 
                                    ? 'text-white' 
                                    : message.isError
                                    ? 'text-orange-700'
                                    : 'text-indigo-700'
                                }`}>
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className={`text-base font-bold mb-2 mt-3 ${
                                  message.role === 'user' 
                                    ? 'text-white' 
                                    : message.isError
                                    ? 'text-orange-600'
                                    : 'text-indigo-600'
                                }`}>
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className={`text-sm font-semibold mb-2 mt-2 ${
                                  message.role === 'user' 
                                    ? 'text-white' 
                                    : message.isError
                                    ? 'text-orange-600'
                                    : 'text-indigo-600'
                                }`}>
                                  {children}
                                </h3>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                          
                          {message.role === 'assistant' && (
                            <div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
                              {new Date(message.timestamp).toLocaleString('pl-PL', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit'
                              })}
                              {message.isError && (
                                <span className="ml-2 text-orange-500">• Odpowiedź zastępcza</span>
                              )}
                            </div>
                          )}
                        </motion.div>
                        
                        {message.role === 'user' && (
                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
                {isLoading && (
                  <motion.div 
                    className="flex justify-start"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex gap-3 items-start max-w-[85%]">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                          <span>CareerGPT analizuje Twoje pytanie...</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-purple-100 p-4 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
            <div className="flex gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustTextareaHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Napisz swoje pytanie..."
                className="chat-textarea border-purple-200 focus:ring-purple-500 focus:border-purple-500"
                disabled={isLoading || !threadId || isInitializing}
                rows={1}
              />
              <motion.button
                type="submit"
                disabled={isLoading || !input.trim() || !threadId || isInitializing}
                className="btn-primary bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 disabled:opacity-50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default ChatBox;