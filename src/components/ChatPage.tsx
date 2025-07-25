// src/components/ChatPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Logo } from './Logo';
import { WalletConnectButton } from './WalletConnectButton';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatPageProps {
  onNavigate: (page: string) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onNavigate }) => {
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    model?: string;
    timestamp?: Date;
  }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('venice-uncensored');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [allowAdultContent, setAllowAdultContent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const providers = useQuery(api.providers.list);
  const activeProvider = providers?.find(p => p.isActive);
  const sendMessage = useMutation(api.inference.sendMessage);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeProvider || isLoading) return;

    const userMessage = { 
      role: 'user' as const, 
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessage({
        messages: [...messages, userMessage].map(m => ({
          role: m.role,
          content: m.content
        })),
        model: selectedModel,
        providerId: activeProvider._id,
        allowAdultContent
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.response,
        model: response.model,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const models = [
    { id: 'venice-uncensored', name: 'Uncensored' },
    { id: 'venice-llama3-70b', name: 'Llama 3 70B' },
    { id: 'venice-claude-3.5-sonnet', name: 'Claude 3.5' },
    { id: 'venice-gpt-4o', name: 'GPT-4' },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header - Fixed Height */}
      <header className="shrink-0 bg-gray-800 border-b border-gray-700">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2"
            >
              <Logo variant="shield" showText={false} className="h-8" />
              <span className="text-lg font-semibold text-white">Dandolo.ai</span>
            </button>
            
            <WalletConnectButton />
          </div>
        </div>
        
        {/* Model Selector */}
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="w-full flex items-center justify-between bg-gray-700 px-3 py-2 rounded-lg text-sm"
          >
            <span className="text-gray-400">Model:</span>
            <div className="flex items-center gap-2">
              <span className="text-white">{models.find(m => m.id === selectedModel)?.name}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {showModelSelector && (
            <div className="absolute left-4 right-4 mt-1 bg-gray-700 rounded-lg shadow-xl z-50">
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setShowModelSelector(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    selectedModel === model.id ? 'bg-gray-600 text-white' : 'text-gray-300'
                  } first:rounded-t-lg last:rounded-b-lg hover:bg-gray-600`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      
      {/* Action Buttons - Fixed Position */}
      <div className="shrink-0 flex gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
        <button className="flex-1 bg-gray-700 p-3 rounded-lg flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
          </svg>
          <span className="text-sm text-gray-300">View</span>
        </button>
        
        <button className="flex-1 bg-gray-700 p-3 rounded-lg flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd"/>
          </svg>
          <span className="text-sm text-gray-300">Attach</span>
        </button>
        
        <button className="flex-1 bg-gray-700 p-3 rounded-lg flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
          </svg>
          <span className="text-sm text-gray-300">Help</span>
        </button>
      </div>
      
      {/* Messages Area - Flexible Height */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center px-4">
            <div className="text-center max-w-sm mx-auto">
              <Logo variant="shield" showText={false} className="h-24 mx-auto mb-6 opacity-20" />
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Dandolo.ai</h2>
              <p className="text-gray-400 mb-8">Decentralized AI at your fingertips</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => setInput('Explain quantum computing')}
                  className="w-full bg-gray-800 hover:bg-gray-700 p-4 rounded-lg text-left transition-colors flex items-center gap-3"
                >
                  <span className="text-2xl">💡</span>
                  <div>
                    <div className="font-medium text-white">Explain</div>
                    <div className="text-sm text-gray-400">quantum computing</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setInput('Create a sunset image')}
                  className="w-full bg-gray-800 hover:bg-gray-700 p-4 rounded-lg text-left transition-colors flex items-center gap-3"
                >
                  <span className="text-2xl">🎨</span>
                  <div>
                    <div className="font-medium text-white">Create</div>
                    <div className="text-sm text-gray-400">a sunset image</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-lg px-4 py-3">
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
      
      {/* Input Area - Fixed Height */}
      <div className="shrink-0 border-t border-gray-700 bg-gray-800">
        <div className="p-4">
          {!activeProvider && (
            <div className="mb-3 p-2 bg-red-900/30 border border-red-700 rounded text-center">
              <p className="text-xs text-red-400">
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
              className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
              style={{ fontSize: '16px' }}
            />
            <button
              type="submit"
              disabled={!activeProvider || isLoading || !input.trim()}
              className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </form>
          
          <p className="text-xs text-gray-500 text-center mt-3">
            🔒 Private & secure - conversations stored locally only
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;