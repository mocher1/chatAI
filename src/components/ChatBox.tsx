import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Send, Loader2, User, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    } else {
      createThread();
    }
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
    try {
      const response = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to create thread');
      
      const data = await response.json();
      setThreadId(data.id);
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  const addMessage = async (threadId: string, content: string) => {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'user', content })
    });
    
    if (!response.ok) throw new Error('Failed to add message');
    return response.json();
  };

  const createRun = async (threadId: string) => {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant_id: import.meta.env.VITE_ASSISTANT_ID,
        instructions: "Jesteś CareerGPT - przyjaznym doradcą zawodowym, który specjalizuje się w polskim rynku pracy. Pomagasz w pisaniu CV, przygotowaniu do rozmów kwalifikacyjnych i planowaniu kariery. Odpowiadasz po polsku, używasz prostego języka i unikasz żargonu HR. Twoje odpowiedzi są konkretne i praktyczne."
      })
    });
    
    if (!response.ok) throw new Error('Failed to create run');
    return response.json();
  };

  const checkRunStatus = async (threadId: string, runId: string) => {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    if (!response.ok) throw new Error('Failed to check run status');
    return response.json();
  };

  const getMessages = async (threadId: string) => {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages?limit=1`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    if (!response.ok) throw new Error('Failed to get messages');
    return response.json();
  };

  const handleNewConversation = () => {
    setMessages([]);
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

    try {
      await addMessage(threadId, userMessage);
      const run = await createRun(threadId);

      let runStatus = await checkRunStatus(threadId, run.id);
      while (runStatus.status !== 'completed') {
        if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
          throw new Error(`Run ${runStatus.status}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await checkRunStatus(threadId, run.id);
      }

      const messagesResponse = await getMessages(threadId);
      const assistantMessage = messagesResponse.data[0].content[0].text.value;
      
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() }
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie za chwilę.',
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

  return (
    <motion.section 
      id="chat" 
      className="py-8 px-6"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-3xl mx-auto">
        <motion.h2 
          className="text-3xl font-bold text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Porozmawiaj z CareerGPT
        </motion.h2>
        <div className="text-right mb-4">
          <motion.button
            type="button"
            onClick={handleNewConversation}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 transition"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Nowa rozmowa
          </motion.button>
        </div>
        
        <motion.div 
          className="glass-card rounded-2xl overflow-hidden shadow-glow"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="h-[70vh] md:h-[500px] overflow-y-auto p-6 space-y-6">
            <AnimatePresence>
              {messages.length === 0 ? (
                <motion.div 
                  className="text-center text-gray-500 mt-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
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
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                  >
                    {message.role === 'assistant' && (
                      <Bot className="w-6 h-6 text-primary-600 flex-shrink-0" />
                    )}
                    <motion.div
                      className={`relative max-w-[80%] p-4 transition-colors ${
                        message.role === 'user'
                          ? 'chat-gradient text-white rounded-2xl rounded-br-none hover:brightness-110'
                          : 'bg-white shadow-lg rounded-2xl rounded-bl-none hover:bg-gray-50'
                      }`}
                      whileHover={{ scale: 1.01 }}
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(index, message.content)}
                        className="absolute top-2 right-2 text-xs text-gray-300 hover:text-gray-500"
                      >
                        Kopiuj
                      </button>
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
                        className="prose prose-sm whitespace-pre-wrap"
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {message.content}
                      </ReactMarkdown>
                      <div className="text-[10px] text-gray-500 mt-1 text-right">
                        {message.timestamp && new Date(message.timestamp).toLocaleString()}
                      </div>
                    </motion.div>
                    {message.role === 'user' && (
                      <User className="w-6 h-6 text-primary-600 flex-shrink-0" />
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
                  <Bot className="w-6 h-6 text-primary-600 flex-shrink-0" />
                  <div className="bg-white shadow-lg rounded-2xl rounded-bl-none p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                      <span>CareerGPT pisze...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-gray-100 p-4 bg-white/50">
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
                className="chat-textarea"
                disabled={isLoading}
                rows={1}
              />
              <motion.button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="btn-primary"
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