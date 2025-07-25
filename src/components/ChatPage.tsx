import React, { useState, useRef, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Logo } from './Logo';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface ChatPageProps {
  onNavigate: (page: string) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onNavigate }) => {
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('venice-llama3-70b');
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  const providers = useQuery(api.providers.list);
  const activeProvider = providers?.find(p => p.isActive);
  const sendMessage = useMutation(api.inference.sendMessage);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeProvider || isLoading) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessage({
        messages: [...messages, userMessage],
        model: selectedModel,
        providerId: activeProvider._id,
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.response
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const models = [
    'venice-llama3-70b',
    'venice-claude-3.5-sonnet',
    'venice-gpt-4o',
    'venice-uncensored',
    'venice-mistral-large',
    'venice-qwen2.5-72b',
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <Navbar currentPage="chat" onNavigate={onNavigate} />
      
      {/* Model Selector Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 relative">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 active:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors touch-manipulation"
          >
            <span className="hidden sm:inline">Model:</span>
            <span className="font-mono text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">
              {selectedModel}
            </span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${showModelSelector ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {showModelSelector && (
          <>
            {/* Mobile backdrop */}
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setShowModelSelector(false)}
            />
            
            {/* Model selector dropdown */}
            <div className="absolute left-3 right-3 md:left-auto md:right-auto md:max-w-md bg-gray-700 border border-gray-600 rounded-lg shadow-xl mt-1 z-50 animate-slide-up">
              {models.map(model => (
                <button
                  key={model}
                  onClick={() => {
                    setSelectedModel(model);
                    setShowModelSelector(false);
                  }}
                  className={`block w-full text-left px-4 py-3 text-sm transition-colors touch-manipulation first:rounded-t-lg last:rounded-b-lg ${
                    model === selectedModel 
                      ? 'bg-brand-500/20 text-brand-400' 
                      : 'text-gray-300 hover:bg-gray-600 hover:text-white active:bg-gray-500'
                  }`}
                >
                  <div className="font-medium">{model}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {model.includes('claude') && 'Advanced reasoning'}
                    {model.includes('gpt') && 'General purpose'}
                    {model.includes('llama') && 'Open source'}
                    {model.includes('uncensored') && 'No restrictions'}
                    {model.includes('mistral') && 'Fast responses'}
                    {model.includes('qwen') && 'Multilingual'}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <Logo variant="shield" showText={false} className="h-16 sm:h-24 mb-6 opacity-50" />
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Welcome to Dandolo.ai</h2>
              <p className="text-sm sm:text-base text-gray-400 mb-8">Decentralized AI at your fingertips</p>
              
              <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                <button
                  onClick={() => setInput('Explain quantum computing')}
                  className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 p-3 rounded-lg text-left transition-colors touch-manipulation"
                >
                  <div className="text-2xl mb-1">💡</div>
                  <div className="text-sm font-medium text-white">Explain</div>
                  <div className="text-xs text-gray-400">quantum computing</div>
                </button>
                
                <button
                  onClick={() => setInput('Create a sunset image')}
                  className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 p-3 rounded-lg text-left transition-colors touch-manipulation"
                >
                  <div className="text-2xl mb-1">🎨</div>
                  <div className="text-sm font-medium text-white">Create</div>
                  <div className="text-xs text-gray-400">a sunset image</div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-800 text-gray-100 border border-gray-700'
                    }`}
                  >
                    <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>
      
      {/* Input Area */}
      <div className="border-t border-gray-700 bg-gray-800 p-3 pb-safe">
        <div className="max-w-4xl mx-auto">
          {!activeProvider && (
            <div className="mb-3 p-2 bg-red-900/30 border border-red-700 rounded text-center">
              <p className="text-xs sm:text-sm text-red-400">
                No active provider. <button onClick={() => onNavigate('providers')} className="underline">Add one</button> to chat.
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={!activeProvider || isLoading}
              className="flex-1 bg-gray-700 text-white px-3 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 text-sm border border-gray-600 focus:border-brand-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!activeProvider || isLoading || !input.trim()}
              className="bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 touch-manipulation min-w-[60px] justify-center"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
          
          <p className="text-xs text-gray-500 text-center mt-2">
            🔒 Private & secure - conversations stored locally only
          </p>
        </div>
      </div>
    </div>
  );
};