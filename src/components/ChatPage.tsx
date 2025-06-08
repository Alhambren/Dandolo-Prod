import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAccount } from 'wagmi';
import GlassCard from './GlassCard';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  model?: string;
  provider?: string;
  tokens?: number;
  responseTime?: number;
}

interface ChatFolder {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ChatIntent {
  type: 'chat' | 'code' | 'image' | 'analysis';
  label: string;
  icon: string;
  model?: string;
}

const CHAT_INTENTS: ChatIntent[] = [
  { type: 'chat', label: 'General Chat', icon: '💬', model: 'gpt-3.5-turbo' },
  { type: 'code', label: 'Code Generation', icon: '🖥️', model: 'codellama' },
  { type: 'image', label: 'Image Generation', icon: '🎨', model: 'stable-diffusion' },
  { type: 'analysis', label: 'Data Analysis', icon: '📊', model: 'gpt-4' },
];

const ChatPage: React.FC = () => {
  const { address } = useAccount();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<ChatIntent>(CHAT_INTENTS[0]);
  const [showFolders, setShowFolders] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const routeInference = useAction(api.inference.route);
  const userStats = useQuery(api.points.getUserStats, address ? { address } : 'skip');

  // Load chats from localStorage on mount
  useEffect(() => {
    const savedFolders = localStorage.getItem('dandolo_chat_folders');
    if (savedFolders) {
      const parsed: ChatFolder[] = JSON.parse(savedFolders);
      setFolders(parsed);

      if (parsed.length > 0) {
        const mostRecent = parsed.sort((a, b) => b.updatedAt - a.updatedAt)[0];
        setActiveFolder(mostRecent.id);
        setMessages(mostRecent.messages);
      }
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist folders to localStorage
  useEffect(() => {
    if (folders.length > 0) {
      localStorage.setItem('dandolo_chat_folders', JSON.stringify(folders));
    }
  }, [folders]);

  const createNewFolder = () => {
    const newFolder: ChatFolder = {
      id: `folder_${Date.now()}`,
      name: `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setFolders([...folders, newFolder]);
    setActiveFolder(newFolder.id);
    setMessages([]);
  };

  const updateActiveFolder = (newMessages: Message[]) => {
    if (!activeFolder) {
      createNewFolder();
      return;
    }

    const updated = folders.map((f) =>
      f.id === activeFolder ? { ...f, messages: newMessages, updatedAt: Date.now() } : f
    );

    setFolders(updated);
  };

  const deleteFolder = (folderId: string) => {
    const updated = folders.filter((f) => f.id !== folderId);
    setFolders(updated);

    if (activeFolder === folderId) {
      if (updated.length > 0) {
        setActiveFolder(updated[0].id);
        setMessages(updated[0].messages);
      } else {
        setActiveFolder(null);
        setMessages([]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      content: message,
      role: 'user',
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    updateActiveFolder(updatedMessages);

    setIsLoading(true);
    setMessage('');

    try {
      const response = await routeInference({
        prompt: message,
        address: address || 'anonymous',
        model: selectedIntent.model,
      });

      const aiMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        content: response.response,
        role: 'assistant',
        timestamp: Date.now(),
        model: response.model,
        provider: response.provider,
        tokens: response.tokens,
        responseTime: response.responseTime,
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      updateActiveFolder(finalMessages);

      toast.success(`Response from ${response.provider} (${response.responseTime}ms)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white" data-testid="chat-page">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Folders Sidebar */}
          <div className={`md:col-span-1 ${showFolders ? 'block' : 'hidden md:block'}`}>
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Chat History</h2>
                <button
                  onClick={createNewFolder}
                  className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                >
                  New Chat
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {folders.length === 0 ? (
                  <p className="text-gray-400 text-sm">No chats yet</p>
                ) : (
                  folders
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map((folder) => (
                      <div
                        key={folder.id}
                        className={`p-2 rounded cursor-pointer ${
                          activeFolder === folder.id ? 'bg-white/20' : 'bg-white/10 hover:bg-white/15'
                        }`}
                        onClick={() => {
                          setActiveFolder(folder.id);
                          setMessages(folder.messages);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm truncate">{folder.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFolder(folder.id);
                            }}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <span className="text-xs text-gray-400">{folder.messages.length} messages</span>
                      </div>
                    ))
                )}
              </div>

              <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-200">
                  🔒 All chats are stored locally in your browser. Nothing is saved on our servers.
                </p>
              </div>
            </GlassCard>
          </div>

          {/* Chat Interface */}
          <div className="md:col-span-2">
            <GlassCard className="p-4 h-[600px] flex flex-col" data-testid="chat-container">
              {/* Intent Selector */}
              <div className="mb-4 flex flex-wrap gap-2">
                {CHAT_INTENTS.map((intent) => (
                  <button
                    key={intent.type}
                    onClick={() => setSelectedIntent(intent)}
                    className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
                      selectedIntent.type === intent.type
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    <span>{intent.icon}</span>
                    <span>{intent.label}</span>
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4" data-testid="chat-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-500/20 border border-blue-500/30'
                          : 'bg-white/10 border border-white/20'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      {msg.role === 'assistant' && (
                        <div className="mt-2 text-xs text-gray-400">
                          {msg.provider} • {msg.model} • {msg.tokens} tokens • {msg.responseTime}ms
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Type your ${selectedIntent.label.toLowerCase()} request...`}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  data-testid="chat-input"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                  data-testid="send-button"
                  disabled={isLoading || !message.trim()}
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
              </form>
            </GlassCard>
          </div>

          {/* Stats Sidebar */}
          <div className="md:col-span-1">
            <GlassCard className="p-4" data-testid="user-stats">
              <h2 className="text-xl font-bold mb-4">Your Stats</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-300">Points Balance</p>
                  <p className="text-2xl font-bold">{userStats?.points || 0}</p>
                </div>
                <div>
                  <p className="text-gray-300">Prompts Today</p>
                  <p className="text-2xl font-bold">{userStats?.promptsToday || 0}</p>
                </div>
                <div>
                  <p className="text-gray-300">Remaining Today</p>
                  <p className="text-2xl font-bold">{userStats?.promptsRemaining || 50}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
