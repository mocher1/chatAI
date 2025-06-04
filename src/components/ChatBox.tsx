import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Send, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
        setMessages(JSON.parse(saved) as Message[]);
      } catch (err) {
        console.error('Failed to parse saved messages', err);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  const handleNewConversation = () => {
    setMessages([]);
    localStorage.removeItem('chatMessages');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie za chwilę.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="chat" className="py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4 animate-fade-up">
          Porozmawiaj z CareerGPT
        </h2>
        <div className="text-right mb-4">
          <button
            type="button"
            onClick={handleNewConversation}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 transition"
          >
            Nowa rozmowa
          </button>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden shadow-glow">
          <div className="h-[70vh] md:h-[500px] overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8 animate-fade-in">
                <p className="text-lg mb-4">
                  Zadaj pytanie o karierę, CV lub rozmowę kwalifikacyjną
                </p>
                <p className="text-sm text-gray-400">
                  Na przykład: "Jak napisać CV na stanowisko junior developera?"
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.role === 'user' ? 'chat-gradient text-white' : 'bg-white shadow-lg'
                    }`}
                  >
                    <ReactMarkdown
                      className="prose prose-sm whitespace-pre-wrap"
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white shadow-lg rounded-2xl p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-gray-100 p-4 bg-white/50">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Napisz swoje pytanie..."
                className="input flex-1"
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !input.trim()} className="btn-primary">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ChatBox;
