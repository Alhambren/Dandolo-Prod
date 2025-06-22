import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { 
  Plus, 
  ChevronDown, 
  MessageSquare, 
  Image, 
  Code, 
  BarChart, 
  Send,
  X
} from 'lucide-react';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  isLoading?: boolean;
  error?: string;
  intentType?: string;
  model?: string;
  provider?: string;
  tokens?: number;
  responseTime?: number;
  timestamp: number;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  taskType?: 'chat' | 'image' | 'code' | 'analysis';
}

type TaskType = 'chat' | 'image' | 'code' | 'analysis';

const QUICK_PROMPTS = [
  {
    icon: '💡',
    title: 'Explain',
    subtitle: 'quantum computing',
    prompt: 'Explain quantum computing in simple terms',
    taskType: 'chat' as TaskType
  },
  {
    icon: '🎨',
    title: 'Create',
    subtitle: 'a sunset image',
    prompt: 'Create a beautiful sunset landscape image',
    taskType: 'image' as TaskType
  },
  {
    icon: '🚀',
    title: 'Write',
    subtitle: 'Python code',
    prompt: 'Write a Python function to calculate fibonacci numbers',
    taskType: 'code' as TaskType
  },
  {
    icon: '📊',
    title: 'Analyze',
    subtitle: 'this data',
    prompt: 'Help me analyze and visualize data trends',
    taskType: 'analysis' as TaskType
  }
];

const TASK_TYPES = [
  { type: 'chat' as TaskType, icon: MessageSquare, title: 'Chat' },
  { type: 'image' as TaskType, icon: Image, title: 'Image Generation' },
  { type: 'code' as TaskType, icon: Code, title: 'Code' },
  { type: 'analysis' as TaskType, icon: BarChart, title: 'Analysis' }
];

const DEFAULT_MODELS = [
  'llama-3.3-70b',
  'llama-3.2-3b',
  'qwen-2.5-coder-32b',
  'venice-sd35'
];

// Message Content Component
const MessageContent: React.FC<{ msg: Message }> = ({ msg }) => {
  if (msg.isLoading) {
    return (
      <div className=\"flex items-center gap-3\">
        <div className=\"animate-spin w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full\"></div>
        <span className=\"text-gray-400 text-sm\">
          {msg.intentType === 'image' ? 'Creating image...' :
            msg.intentType === 'code' ? 'Writing code...' :
            msg.intentType === 'analysis' ? 'Analyzing...' :
            'Thinking...'}
        </span>
      </div>
    );
  }

  if (msg.error) {
    return (
      <div className=\"bg-red-500/10 border border-red-500/20 rounded-xl p-4\">
        <p className=\"text-red-400 text-sm\">⚠️ {msg.error}</p>
      </div>
    );
  }

  if (msg.intentType === 'image' && msg.imageUrl) {
    return (
      <div className=\"space-y-4\">
        <div className=\"relative group overflow-hidden rounded-xl max-w-md\">
          <img
            src={msg.imageUrl}
            alt=\"Generated image\"
            className=\"w-full rounded-xl cursor-pointer transition-transform duration-300 hover:scale-[1.02]\"
            onClick={() => window.open(msg.imageUrl, '_blank')}
          />
          <div className=\"absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 rounded-xl\"></div>
        </div>
        {msg.content && !msg.content.includes(msg.imageUrl || '') && (
          <p className=\"text-gray-200 leading-relaxed\">{msg.content}</p>
        )}
      </div>
    );
  }

  return (
    <div className=\"prose max-w-none\">
      <p className=\"text-gray-200 leading-relaxed whitespace-pre-wrap\">
        {msg.content}
      </p>
    </div>
  );
};

export const ChatInterface: React.FC = () => {
  const { address } = useAccount();
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODELS[0]);
  const [taskType, setTaskType] = useState<TaskType>('chat');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [allowAdultContent, setAllowAdultContent] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // API calls
  const routeInference = useAction(api.inference.routeSimple);
  const userStats = useQuery(api.points.getUserStats, address ? { address } : 'skip');

  // Load chats from localStorage
  useEffect(() => {
    const savedChats = localStorage.getItem('dandolo_chats');
    const savedAdultContent = localStorage.getItem('dandolo_allow_adult_content');
    
    if (savedChats) {
      const parsed = JSON.parse(savedChats) as Chat[];
      setChats(parsed);
      if (parsed.length > 0) {
        setActiveChat(parsed[0].id);
      }
    }
    
    if (savedAdultContent) {
      setAllowAdultContent(JSON.parse(savedAdultContent));
    }
  }, []);

  // Save chats to localStorage
  useEffect(() => {
    localStorage.setItem('dandolo_chats', JSON.stringify(chats));
  }, [chats]);

  // Save adult content setting
  useEffect(() => {
    localStorage.setItem('dandolo_allow_adult_content', JSON.stringify(allowAdultContent));
  }, [allowAdultContent]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChat]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const getCurrentChat = () => chats.find(c => c.id === activeChat);

  const createNewChat = () => {
    const newChat: Chat = {
      id: `chat_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      taskType,
    };
    setChats([newChat, ...chats]);
    setActiveChat(newChat.id);
  };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this chat?')) {
      const remainingChats = chats.filter(c => c.id !== chatId);
      setChats(remainingChats);
      
      if (activeChat === chatId) {
        setActiveChat(remainingChats.length > 0 ? remainingChats[0].id : null);
      }
    }
  };

  const generateTitle = (content: string) => {
    const cleaned = content.replace(/\\n/g, ' ').trim();
    return cleaned.length > 40 ? `${cleaned.substring(0, 40)}...` : cleaned;
  };

  const handleQuickPrompt = (prompt: string, quickTaskType: TaskType) => {
    setTaskType(quickTaskType);
    setMessage(prompt);
    // Focus on textarea after setting message
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    let currentChat = getCurrentChat();
    if (!currentChat) {
      const newChat: Chat = {
        id: `chat_${Date.now()}`,
        title: 'New Chat',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        taskType,
      };
      setChats([newChat, ...chats]);
      setActiveChat(newChat.id);
      currentChat = newChat;
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
      intentType: taskType,
    };

    const loadingMessage: Message = {
      id: `msg_${Date.now()}_loading`,
      role: 'assistant',
      content: '',
      isLoading: true,
      timestamp: Date.now(),
      intentType: taskType,
    };

    const updatedMessages = [...currentChat.messages, userMessage, loadingMessage];
    const updatedChat = {
      ...currentChat,
      messages: updatedMessages,
      title: currentChat.messages.length === 0 ? generateTitle(message) : currentChat.title,
      updatedAt: Date.now(),
      taskType,
    };

    setChats(prevChats => prevChats.map(c => c.id === currentChat!.id ? updatedChat : c));
    setMessage('');
    setIsLoading(true);

    try {
      const response = await routeInference({
        prompt: message,
        address: address || 'anonymous',
        intentType: taskType,
        model: selectedModel,
        allowAdultContent,
      });

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_response`,
        role: 'assistant',
        content: response.response,
        timestamp: Date.now(),
        model: response.model,
        provider: response.provider,
        tokens: response.totalTokens,
        responseTime: response.responseTime,
        intentType: taskType,
      };

      // Parse response for special content
      if (taskType === 'image') {
        const imageUrlMatch = response.response.match(/!\\[.*?\\]\\((.*?)\\)/);
        if (imageUrlMatch) {
          assistantMessage.imageUrl = imageUrlMatch[1];
        }
      }

      const finalMessages = updatedMessages.slice(0, -1).concat([assistantMessage]);
      const finalChat = { ...updatedChat, messages: finalMessages };
      
      setChats(prevChats => prevChats.map(c => c.id === currentChat!.id ? finalChat : c));
    } catch (error) {
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: '',
        error: error instanceof Error ? error.message : 'An error occurred',
        timestamp: Date.now(),
        intentType: taskType,
      };

      const errorMessages = updatedMessages.slice(0, -1).concat([errorMessage]);
      const errorChat = { ...updatedChat, messages: errorMessages };
      
      setChats(prevChats => prevChats.map(c => c.id === currentChat!.id ? errorChat : c));
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const currentChat = getCurrentChat();
  const dailyLimit = 100;
  const usageCount = userStats?.promptsToday || 0;
  const remaining = userStats?.promptsRemaining || (dailyLimit - usageCount);

  const getTaskTypePromptPlaceholder = () => {
    switch (taskType) {
      case 'image': return \"Describe the image you want to create...\";
      case 'code': return \"Describe the code you need...\";
      case 'analysis': return \"What would you like to analyze?\";
      default: return \"Ask me anything...\";
    }
  };

  return (
    <div className=\"flex h-screen bg-gray-950\">
      {/* Slim Sidebar - Collapsible */}
      <div 
        className={`${isSidebarExpanded ? 'w-64' : 'w-16'} transition-all duration-200 bg-gray-900 border-r border-gray-800 flex flex-col group`}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        {/* New Chat Button */}
        <div className=\"p-3\">
          <button
            onClick={createNewChat}
            className=\"w-full flex items-center justify-center gap-2 p-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors\"
          >
            <Plus className=\"w-5 h-5\" />
            <span className={`${isSidebarExpanded ? 'inline' : 'hidden'}`}>New Chat</span>
          </button>
        </div>
        
        {/* Recent chats */}
        <div className=\"flex-1 overflow-y-auto px-2\">
          <div className=\"space-y-1\">
            {chats.slice(0, 10).map((chat) => (
              <div key={chat.id} className=\"group/chat relative\">
                <button
                  onClick={() => setActiveChat(chat.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                    activeChat === chat.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <div className=\"w-6 h-6 flex-shrink-0 flex items-center justify-center\">
                    {chat.taskType === 'image' ? '🎨' :
                     chat.taskType === 'code' ? '💻' :
                     chat.taskType === 'analysis' ? '📊' :
                     '💬'}
                  </div>
                  <span className={`truncate text-sm ${isSidebarExpanded ? 'block' : 'hidden'}`}>
                    {chat.title}
                  </span>
                </button>
                {isSidebarExpanded && (
                  <button
                    onClick={(e) => deleteChat(chat.id, e)}
                    className=\"absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/chat:opacity-100 p-1 hover:bg-gray-700 rounded transition-all\"
                  >
                    <X className=\"w-3 h-3 text-gray-500\" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Usage at bottom */}
        <div className=\"p-3 border-t border-gray-800\">
          <div className=\"text-center\">
            <div className=\"text-2xl font-bold text-white\">{usageCount}</div>
            <div className={`text-xs text-gray-500 ${isSidebarExpanded ? 'block' : 'hidden'}`}>
              / {dailyLimit} daily
            </div>
            {isSidebarExpanded && (
              <div className=\"w-full bg-gray-800 rounded-full h-1 mt-2\">
                <div 
                  className=\"bg-yellow-500 h-1 rounded-full transition-all\"
                  style={{ width: `${(usageCount / dailyLimit) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className=\"flex-1 flex flex-col\">
        {/* Slim top bar with integrated controls */}
        <div className=\"flex items-center gap-4 px-6 py-3 border-b border-gray-800 bg-gray-900/50\">
          {/* Model Selector */}
          <div className=\"relative\">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className=\"flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-sm\"
            >
              <span className=\"text-gray-400\">Model:</span>
              <span className=\"text-white\">{selectedModel}</span>
              <ChevronDown className=\"w-4 h-4\" />
            </button>
            
            {showModelSelector && (
              <div className=\"absolute top-full left-0 mt-2 bg-gray-800 rounded-lg shadow-xl p-2 min-w-[300px] z-50\">
                {DEFAULT_MODELS.map(model => (
                  <button
                    key={model}
                    onClick={() => {
                      setSelectedModel(model);
                      setShowModelSelector(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-700 rounded transition-colors ${
                      selectedModel === model ? 'bg-gray-700 text-yellow-500' : 'text-white'
                    }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Task Type - Icon Pills */}
          <div className=\"flex items-center gap-2\">
            {TASK_TYPES.map(({ type, icon: Icon, title }) => (
              <button
                key={type}
                onClick={() => setTaskType(type)}
                className={`p-1.5 rounded-lg transition-colors ${
                  taskType === type ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'
                }`}
                title={title}
              >
                <Icon className=\"w-4 h-4\" />
              </button>
            ))}
          </div>
          
          {/* Spacer */}
          <div className=\"flex-1\" />
          
          {/* Adult content toggle */}
          <label className=\"flex items-center gap-2 text-xs text-gray-500\">
            <input 
              type=\"checkbox\" 
              checked={allowAdultContent}
              onChange={(e) => setAllowAdultContent(e.target.checked)}
              className=\"rounded\" 
            />
            <span>Allow adult content</span>
          </label>
        </div>
        
        {/* Chat Messages Area */}
        <div className=\"flex-1 overflow-y-auto\">
          <div className=\"max-w-4xl mx-auto px-6 py-12\">
            {currentChat ? (
              <div className=\"space-y-6\">
                {currentChat.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-3xl px-6 py-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-yellow-500 text-black' 
                        : 'bg-gray-800 text-white'
                    }`}>
                      <MessageContent msg={msg} />
                      {msg.role === 'assistant' && msg.model && !msg.isLoading && (
                        <div className=\"mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400 flex items-center gap-4\">
                          <span>{msg.provider}</span>
                          <span>{msg.model}</span>
                          {msg.tokens && <span>{msg.tokens} tokens</span>}
                          {msg.responseTime && <span>{msg.responseTime}ms</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              /* Welcome State */
              <div className=\"text-center py-24\">
                <div className=\"w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-2xl flex items-center justify-center\">
                  <span className=\"text-3xl\">🚀</span>
                </div>
                <h1 className=\"text-3xl font-bold mb-2 text-white\">Welcome to Dandolo.ai</h1>
                <p className=\"text-gray-400 mb-8\">Decentralized AI at your fingertips</p>
                
                {/* Quick prompts */}
                <div className=\"grid grid-cols-2 md:grid-cols-4 gap-3 mt-12\">
                  {QUICK_PROMPTS.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickPrompt(prompt.prompt, prompt.taskType)}
                      className=\"p-4 bg-gray-800 rounded-lg hover:bg-gray-700 text-left transition-colors\"
                    >
                      <div className=\"text-sm font-medium mb-1\">{prompt.icon} {prompt.title}</div>
                      <div className=\"text-xs text-gray-400\">{prompt.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Input Area - Floating */}
        <div className=\"px-6 py-4 bg-gray-900/50 backdrop-blur\">
          <div className=\"max-w-4xl mx-auto\">
            <form onSubmit={handleSubmit} className=\"relative\">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={getTaskTypePromptPlaceholder()}
                className=\"w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-xl resize-none focus:outline-none focus:border-gray-600 text-white placeholder-gray-400\"
                rows={1}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button 
                type=\"submit\"
                disabled={isLoading || !message.trim()}
                className=\"absolute right-2 bottom-2 p-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed\"
              >
                {isLoading ? (
                  <div className=\"animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full\"></div>
                ) : (
                  <Send className=\"w-4 h-4\" />
                )}
              </button>
            </form>
            <div className=\"mt-2 text-xs text-gray-500 text-center\">
              🔒 Private & secure - conversations stored locally only
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};