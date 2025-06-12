import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Send, Loader2, User, Bot, AlertCircle, Settings, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const reduceMotion = useReducedMotion();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // URL do naszych Edge Functions
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('threadId');
    setThreadId(null);
    createThread();
  };

  const handleCopy = async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1000);
    } catch (err) {
      console.error('Copy failed', err);
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
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() }
    ]);
    setIsLoading(true);
    setError(null);

    try {
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
      
      if (!data.assistantMessage) {
        throw new Error('Nie otrzymano odpowiedzi od asystenta.');
      }
      
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.assistantMessage, timestamp: new Date().toISOString() }
      ]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd';
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Przepraszam, wystąpił błąd: ${errorMessage}\n\nSpróbuj ponownie za chwilę lub sprawdź konfigurację aplikacji.`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
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
      <div className="max-w-3xl mx-auto">
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
                      className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reduceMotion ? 0 : index * 0.1, duration: reduceMotion ? 0 : 0.5 }}
                    >
                      {message.role === 'assistant' && (
                        <Bot className="w-6 h-6 text-purple-600 flex-shrink-0" />
                      )}
                      <motion.div
                        className={`relative max-w-[80%] p-4 transition-colors ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl rounded-br-none hover:from-purple-700 hover:to-blue-700'
                            : 'bg-white shadow-lg rounded-2xl rounded-bl-none hover:bg-gray-50 border border-purple-100'
                        }`}
                        whileHover={{ scale: 1.01 }}
                      >
                        {message.role === 'assistant' && (
                          <button
                            type="button"
                            onClick={() => handleCopy(index, message.content)}
                            className="absolute top-2 right-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            Kopiuj
                          </button>
                        )}
                        {copiedIndex === index && (
                          <motion.span 
                            className="absolute -top-5 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                          >
                            Skopiowano!
                          </motion.span>
                        )}
                        <ReactMarkdown
                          className={`prose prose-sm whitespace-pre-wrap ${
                            message.role === 'user' ? 'prose-invert' : 'prose-enhanced'
                          }`}
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            // Lepsze formatowanie list punktowanych
                            ul: ({ children }) => (
                              <ul className={`space-y-2 my-4 ${
                                message.role === 'user' 
                                  ? 'text-white/95' 
                                  : 'text-gray-700'
                              }`}>
                                {children}
                              </ul>
                            ),
                            // Lepsze formatowanie list numerowanych
                            ol: ({ children }) => (
                              <ol className={`space-y-2 my-4 ${
                                message.role === 'user' 
                                  ? 'text-white/95' 
                                  : 'text-gray-700'
                              }`}>
                                {children}
                              </ol>
                            ),
                            // Stylizowane elementy list
                            li: ({ children }) => (
                              <li className={`flex items-start gap-2 ${
                                message.role === 'user' 
                                  ? 'text-white/95' 
                                  : 'text-gray-700'
                              }`}>
                                <span className={`inline-block w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                                  message.role === 'user' 
                                    ? 'bg-white/70' 
                                    : 'bg-purple-400'
                                }`}></span>
                                <span className="flex-1">{children}</span>
                              </li>
                            ),
                            // Wyróżnianie pogrubienia
                            strong: ({ children }) => (
                              <strong className={`font-bold ${
                                message.role === 'user' 
                                  ? 'text-white' 
                                  : 'text-purple-700 bg-purple-50 px-1 py-0.5 rounded'
                              }`}>
                                {children}
                              </strong>
                            ),
                            // Wyróżnianie kursywy
                            em: ({ children }) => (
                              <em className={`italic ${
                                message.role === 'user' 
                                  ? 'text-white/90' 
                                  : 'text-blue-600'
                              }`}>
                                {children}
                              </em>
                            ),
                            // Lepsze formatowanie cytatów
                            blockquote: ({ children }) => (
                              <blockquote className={`border-l-4 pl-4 py-3 my-4 italic rounded-r-lg ${
                                message.role === 'user' 
                                  ? 'border-white/50 bg-white/10 text-white/90' 
                                  : 'border-purple-400 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-800 shadow-sm'
                              }`}>
                                <div className="flex items-start gap-2">
                                  <span className={`text-2xl leading-none ${
                                    message.role === 'user' ? 'text-white/70' : 'text-purple-400'
                                  }`}>
                                    "
                                  </span>
                                  <div className="flex-1">{children}</div>
                                </div>
                              </blockquote>
                            ),
                            // Lepsze formatowanie kodu
                            code: ({ children }) => (
                              <code className={`px-2 py-1 rounded text-sm font-mono ${
                                message.role === 'user' 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-gray-100 text-purple-700 border border-purple-200'
                              }`}>
                                {children}
                              </code>
                            ),
                            // Lepsze formatowanie nagłówków
                            h1: ({ children }) => (
                              <h1 className={`text-xl font-bold mb-3 mt-4 ${
                                message.role === 'user' 
                                  ? 'text-white' 
                                  : 'text-purple-700 border-b border-purple-200 pb-2'
                              }`}>
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className={`text-lg font-bold mb-2 mt-3 ${
                                message.role === 'user' 
                                  ? 'text-white' 
                                  : 'text-purple-600'
                              }`}>
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className={`text-base font-semibold mb-2 mt-3 ${
                                message.role === 'user' 
                                  ? 'text-white' 
                                  : 'text-purple-600'
                              }`}>
                                {children}
                              </h3>
                            ),
                            // Lepsze formatowanie paragrafów
                            p: ({ children }) => (
                              <p className={`mb-3 leading-relaxed ${
                                message.role === 'user' 
                                  ? 'text-white/95' 
                                  : 'text-gray-700'
                              }`}>
                                {children}
                              </p>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                        {message.role === 'assistant' && (
                          <div className="text-[10px] text-gray-500 mt-2 text-right border-t border-gray-100 pt-2">
                            {message.timestamp && new Date(message.timestamp).toLocaleString()}
                          </div>
                        )}
                      </motion.div>
                      {message.role === 'user' && (
                        <User className="w-6 h-6 text-purple-600 flex-shrink-0" />
                      )}
                    </motion.div>
                  ))
                )}
                {isLoading && (
                  <motion.div 
                    className="flex items-end gap-2 justify-start"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Bot className="w-6 h-6 text-purple-600 flex-shrink-0" />
                    <div className="bg-white shadow-lg rounded-2xl rounded-bl-none p-4 border border-purple-100">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                        <span>CareerGPT pisze...</span>
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

