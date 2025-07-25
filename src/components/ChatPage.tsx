// src/components/ChatPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Logo } from './Logo';
import { WalletConnectButton } from './WalletConnectButton';
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
  const [selectedModel, setSelectedModel] = useState('venice-uncensored');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const providers = useQuery(api.providers.list);
  const activeProvider = providers?.find(p => p.isActive);
  const sendMessage = useMutation(api.inference.sendMessage);

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Simple Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <div onClick={() => onNavigate('home')} className="flex items-center gap-2">
            <Logo variant="shield" showText={false} className="h-8" />
            <span className="text-white font-semibold">Dandolo.ai</span>
          </div>
          <WalletConnectButton />
        </div>
      </div>

      {/* Model Selector */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <button
          onClick={() => setShowModelSelector(!showModelSelector)}
          className="w-full bg-gray-700 rounded-lg p-3 flex justify-between items-center"
        >
          <span className="text-gray-400">Model:</span>
          <span className="text-white">{selectedModel}</span>
        </button>
        
        {showModelSelector && (
          <div className="mt-2 bg-gray-700 rounded-lg overflow-hidden">
            {['venice-uncensored', 'venice-llama3-70b', 'venice-claude-3.5-sonnet'].map(model => (
              <button
                key={model}
                onClick={() => {
                  setSelectedModel(model);
                  setShowModelSelector(false);
                }}
                className="block w-full p-3 text-left text-white hover:bg-gray-600"
              >
                {model}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-grow overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <Logo variant="shield" showText={false} className="h-20 mb-4 opacity-30" />
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Dandolo.ai</h2>
            <p className="text-gray-400">Decentralized AI at your fingertips</p>
            
            <div className="mt-8 space-y-2 w-full max-w-xs">
              <button
                onClick={() => setInput('Explain quantum computing')}
                className="w-full bg-gray-800 p-4 rounded-lg text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <div className="text-white font-medium">Explain</div>
                    <div className="text-gray-400 text-sm">quantum computing</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setInput('Create a sunset image')}
                className="w-full bg-gray-800 p-4 rounded-lg text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎨</span>
                  <div>
                    <div className="text-white font-medium">Create</div>
                    <div className="text-gray-400 text-sm">a sunset image</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        {!activeProvider && (
          <div className="mb-3 text-center text-red-400 text-sm">
            <button onClick={() => onNavigate('providers')} className="underline">Add a provider</button> to start
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={!activeProvider || isLoading}
            className="flex-grow bg-gray-700 text-white rounded-lg px-4 py-3 outline-none"
            style={{ fontSize: '16px' }}
          />
          <button
            type="submit"
            disabled={!activeProvider || isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </form>
        
        <p className="text-center text-gray-500 text-xs mt-3">
          🔒 Private & secure - conversations stored locally only
        </p>
      </div>
    </div>
  );
};

export default ChatPage;