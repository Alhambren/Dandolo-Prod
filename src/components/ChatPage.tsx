// Apple-inspired ChatPage with minimalist design
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Logo } from './Logo';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  audioUrl?: string;
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
  model?: string;
  intentType?: string;
  folderId?: string;
}

interface Folder {
  id: string;
  name: string;
  createdAt: number;
  color?: string;
}

interface ChatIntent {
  type: 'chat' | 'code' | 'image' | 'vision' | 'audio' | 'analysis';
  label: string;
  icon: string;
  description: string;
}

// Apple-inspired message renderer
const MessageContent: React.FC<{ msg: Message }> = ({ msg }) => {
  if (msg.isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="loading-spinner w-4 h-4"></div>
        <span className="text-white/60 text-sm">
          {msg.intentType === 'image' ? 'Creating image...' :
            msg.intentType === 'audio' ? 'Processing audio...' :
            'Thinking...'}
        </span>
      </div>
    );
  }

  if (msg.error) {
    return (
      <div className="bg-system-red/10 border border-system-red/20 rounded-2xl p-4">
        <p className="text-system-red text-sm">⚠️ {msg.error}</p>
      </div>
    );
  }

  if (msg.intentType === 'image' && msg.imageUrl) {
    return (
      <div className="space-y-4">
        <div className="relative group overflow-hidden rounded-3xl">
          <img
            src={msg.imageUrl}
            alt="Generated image"
            className="w-full max-w-md rounded-3xl shadow-2xl cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
            onClick={() => window.open(msg.imageUrl, '_blank')}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-3xl"></div>
          <button 
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-black/70"
            onClick={(e) => {
              e.stopPropagation();
              window.open(msg.imageUrl, '_blank');
            }}
          >
            Open Full Size
          </button>
        </div>
        {msg.content && !msg.content.includes(msg.imageUrl || '') && (
          <p className="text-black font-medium text-sm leading-relaxed">{msg.content}</p>
        )}
      </div>
    );
  }

  return (
    <div className="prose max-w-none">
      <p className="text-black font-medium leading-relaxed whitespace-pre-wrap text-[15px]">
        {msg.content}
      </p>
    </div>
  );
};

// Intent selector component
const IntentSelector: React.FC<{
  intents: ChatIntent[];
  selected: ChatIntent;
  onSelect: (intent: ChatIntent) => void;
}> = ({ intents, selected, onSelect }) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-white/60 px-1">Task Type</h3>
      <div className="grid grid-cols-2 gap-3">
        {intents.map((intent) => (
          <button
            key={intent.type}
            onClick={() => onSelect(intent)}
            className={`group relative p-5 rounded-2xl text-left transition-all duration-200 ${
              selected.type === intent.type
                ? 'bg-brand-500 text-black shadow-lg shadow-brand-500/25'
                : 'bg-dark-3 hover:bg-dark-4 text-white/70 hover:text-white border border-dark-5'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{intent.icon}</span>
              <div>
                <div className="font-medium text-sm">{intent.label}</div>
                <div className={`text-xs ${
                  selected.type === intent.type ? 'text-black/80' : 'text-white/40'
                }`}>
                  {intent.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Enhanced Model selector component with better UX
const ModelSelector: React.FC<{
  models: any[];
  selected: string | null;
  onSelect: (modelId: string | null) => void;
  selectedIntent: ChatIntent;
}> = ({ models, selected, onSelect, selectedIntent }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Filter models by current intent
  const filteredModels = useMemo(() => {
    if (!models.length) return [];
    
    // Group models by type for better organization
    const modelsByType = {
      recommended: [] as any[],
      chat: [] as any[],
      code: [] as any[],
      image: [] as any[],
      analysis: [] as any[],
    };

    models.forEach(model => {
      console.log('[MODEL_DEBUG] Model:', model.id, 'Type:', model.type, 'Capabilities:', model.capabilities);
      console.log('[MODEL_DEBUG] Intent type:', selectedIntent.type);
      console.log('[MODEL_DEBUG] Has matching capability:', model.capabilities?.includes(selectedIntent.type));
      
      if (model.capabilities?.includes(selectedIntent.type)) {
        modelsByType.recommended.push(model);
      }
      
      if (model.type === 'text' || model.capabilities?.includes('chat')) {
        modelsByType.chat.push(model);
      }
      if (model.type === 'code' || model.capabilities?.includes('code')) {
        modelsByType.code.push(model);
      }
      if (model.type === 'image' || model.capabilities?.includes('image')) {
        modelsByType.image.push(model);
      }
      if (model.capabilities?.includes('analysis')) {
        modelsByType.analysis.push(model);
      }
    });

    console.log('[MODEL_SELECTOR] Selected intent:', selectedIntent.type);
    console.log('[MODEL_SELECTOR] Total models passed:', models.length);
    console.log('[MODEL_SELECTOR] Recommended models:', modelsByType.recommended.length);
    console.log('[MODEL_SELECTOR] Image models found:', modelsByType.image.length);
    console.log('[MODEL_SELECTOR] Image model IDs:', modelsByType.image.map(m => m.id));

    return modelsByType;
  }, [models, selectedIntent.type]);

  const selectedModel = models.find(m => m.id === selected);
  const recommendedModels = filteredModels.recommended;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !(event.target as Element).closest('.model-dropdown')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-white/60 px-1">AI Model</h3>
      <div className="relative model-dropdown">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-dark-3 border border-dark-5 rounded-2xl p-4 text-left hover:bg-dark-4 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white text-sm truncate">
                {selectedModel ? selectedModel.name || selectedModel.id : 'Auto-select optimal model'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {selectedModel && selectedModel.capabilities && (
                  <div className="flex gap-1">
                    {selectedModel.capabilities.slice(0, 3).map((cap: string) => (
                      <span key={cap} className="text-xs px-2 py-0.5 bg-white/10 rounded-lg">
                        {cap === 'chat' ? '💬' : cap === 'code' ? '💻' : cap === 'image' ? '🎨' : 
                         cap === 'analysis' ? '📊' : cap === 'vision' ? '👁️' : '🎵'}
                      </span>
                    ))}
                  </div>
                )}
                {!selected && (
                  <span className="text-xs text-brand-500">Optimized for {selectedIntent.label}</span>
                )}
              </div>
            </div>
            <svg 
              className={`w-4 h-4 text-white/40 transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm dropdown-backdrop" onClick={() => setIsOpen(false)} />
            
            {/* Dropdown */}
            <div className="absolute top-full left-0 mt-2 w-full bg-dark-2/95 backdrop-blur-xl border border-dark-4 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden dropdown-menu animate-slide-up max-h-96 overflow-y-auto">
              {/* Auto-select option */}
              <button
                onClick={() => {
                  onSelect(null);
                  setIsOpen(false);
                }}
                className={`w-full px-6 py-4 text-left hover:bg-white/5 transition-colors border-b border-dark-4 ${
                  !selected ? 'bg-brand-500/10 text-brand-500' : 'text-white/80'
                }`}
              >
                <div className="font-medium">Auto-select</div>
                <div className="text-xs text-white/50 mt-1">
                  Choose optimal model for {selectedIntent.label.toLowerCase()}
                </div>
              </button>

              {/* Recommended models for current intent */}
              {(() => {
                console.log('[DROPDOWN_RENDER] Recommended models length:', recommendedModels.length);
                console.log('[DROPDOWN_RENDER] Recommended model IDs:', recommendedModels.map(m => m.id));
                return recommendedModels.length > 0;
              })() && (
                <>
                  <div className="px-6 py-3 bg-dark-4/50 border-b border-dark-4">
                    <div className="text-xs font-medium text-brand-500 uppercase tracking-wide">
                      Recommended for {selectedIntent.label} ({recommendedModels.length} models)
                    </div>
                  </div>
                  {recommendedModels.map((model) => (
                    <button
                      key={`rec-${model.id}`}
                      onClick={() => {
                        onSelect(model.id);
                        setIsOpen(false);
                      }}
                      className={`w-full px-6 py-4 text-left hover:bg-white/5 transition-colors border-b border-dark-5 ${
                        selected === model.id ? 'bg-brand-500/10 text-brand-500' : 'text-white/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{model.name || model.id}</div>
                          <div className="flex gap-1 mt-1">
                            {model.capabilities?.slice(0, 4).map((cap: string) => (
                              <span key={cap} className="text-xs">
                                {cap === 'chat' ? '💬' : cap === 'code' ? '💻' : cap === 'image' ? '🎨' : 
                                 cap === 'analysis' ? '📊' : cap === 'vision' ? '👁️' : '🎵'}
                              </span>
                            ))}
                          </div>
                        </div>
                        {model.contextLength && (
                          <span className="text-xs text-white/40 ml-2 flex-shrink-0">
                            {model.contextLength}k
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* All models organized by type */}
              {models.length > recommendedModels.length && (
                <>
                  <div className="px-6 py-3 bg-dark-4/50 border-b border-dark-4">
                    <div className="text-xs font-medium text-white/60 uppercase tracking-wide">
                      All Models ({models.length - recommendedModels.length} remaining)
                    </div>
                  </div>
                  {(() => {
                    const remainingModels = models.filter(m => !recommendedModels.find(rm => rm.id === m.id));
                    console.log('[DROPDOWN_DEBUG] Remaining models to show:', remainingModels.map(m => m.id));
                    return remainingModels;
                  })().map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onSelect(model.id);
                        setIsOpen(false);
                      }}
                      className={`w-full px-6 py-4 text-left hover:bg-white/5 transition-colors border-b border-dark-5 last:border-b-0 ${
                        selected === model.id ? 'bg-brand-500/10 text-brand-500' : 'text-white/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-sm">{model.name || model.id}</div>
                          <div className="flex gap-1 mt-1">
                            {model.capabilities?.slice(0, 4).map((cap: string) => (
                              <span key={cap} className="text-xs opacity-60">
                                {cap === 'chat' ? '💬' : cap === 'code' ? '💻' : cap === 'image' ? '🎨' : 
                                 cap === 'analysis' ? '📊' : cap === 'vision' ? '👁️' : '🎵'}
                              </span>
                            ))}
                          </div>
                        </div>
                        {model.contextLength && (
                          <span className="text-xs text-white/30 ml-2 flex-shrink-0">
                            {model.contextLength}k
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              )}
              
              {models.length === 0 && (
                <div className="px-6 py-8 text-center text-white/40">
                  <div className="text-sm">No models available</div>
                  <div className="text-xs mt-1">Please try again later</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Main ChatPage component
const ChatPage: React.FC = () => {
  const { address } = useAccount();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [draggedChatId, setDraggedChatId] = useState<string | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [allowAdultContent, setAllowAdultContent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Available intents
  const CHAT_INTENTS: ChatIntent[] = [
    {
      type: 'chat',
      label: 'Chat',
      icon: '💬',
      description: 'General conversation'
    },
    {
      type: 'code',
      label: 'Code',
      icon: '💻',
      description: 'Programming help'
    },
    {
      type: 'image',
      label: 'Image',
      icon: '🎨',
      description: 'Generate images'
    },
    {
      type: 'analysis',
      label: 'Analysis',
      icon: '📊',
      description: 'Deep analysis'
    }
  ];

  const [selectedIntent, setSelectedIntent] = useState<ChatIntent>(CHAT_INTENTS[0]);

  // API calls
  const routeInference = useAction(api.inference.routeSimple);
  const userStats = useQuery(api.points.getUserStats, address ? { address } : 'skip');
  const fetchModels = useAction(api.models.fetchAndCategorizeModels);
  const allProviderPoints = useQuery(api.points.getAllProviderPoints);
  
  // Local usage tracking for immediate UI updates
  const [localUsageCount, setLocalUsageCount] = useState(userStats?.promptsToday || 0);
  const [isCounterAnimating, setIsCounterAnimating] = useState(false);
  
  // Sync local count when userStats changes
  useEffect(() => {
    if (userStats?.promptsToday !== undefined) {
      console.log('[CHAT] User stats updated:', userStats);
      console.log('[CHAT] Setting localUsageCount to:', userStats.promptsToday);
      setLocalUsageCount(userStats.promptsToday);
    }
  }, [userStats?.promptsToday]);
  
  // Debug provider points
  useEffect(() => {
    if (allProviderPoints) {
      console.log('[PROVIDER_POINTS] All provider points:', allProviderPoints);
    }
  }, [allProviderPoints]);
  
  // Add state to force refresh user stats
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [availableModels, setAvailableModels] = useState<any>(null);

  // Load models
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('[FRONTEND] Fetching models...');
        const models = await fetchModels();
        console.log('[FRONTEND] Fetched models:', models);
        console.log('[FRONTEND] Image models count:', models?.image?.length || 0);
        console.log('[FRONTEND] Image models:', models?.image?.map((m: any) => m.id) || []);
        setAvailableModels(models);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };
    loadModels();
  }, [fetchModels]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChat]);

  // Load chats, folders, and settings from localStorage
  useEffect(() => {
    const savedChats = localStorage.getItem('dandolo_chats');
    const savedFolders = localStorage.getItem('dandolo_folders');
    const savedAdultContent = localStorage.getItem('dandolo_allow_adult_content');
    
    if (savedChats) {
      const parsed = JSON.parse(savedChats) as Chat[];
      setChats(parsed);
      if (parsed.length > 0) {
        setActiveChat(parsed[0].id);
      }
    }
    
    if (savedFolders) {
      const parsedFolders = JSON.parse(savedFolders) as Folder[];
      setFolders(parsedFolders);
    }
    
    if (savedAdultContent) {
      setAllowAdultContent(JSON.parse(savedAdultContent));
    }
  }, []);

  // Save chats to localStorage
  useEffect(() => {
    localStorage.setItem('dandolo_chats', JSON.stringify(chats));
  }, [chats]);

  // Save folders to localStorage
  useEffect(() => {
    localStorage.setItem('dandolo_folders', JSON.stringify(folders));
  }, [folders]);

  // Save adult content setting to localStorage
  useEffect(() => {
    localStorage.setItem('dandolo_allow_adult_content', JSON.stringify(allowAdultContent));
  }, [allowAdultContent]);

  // Helper functions
  const getCurrentChat = () => chats.find(c => c.id === activeChat);
  
  const createNewChat = () => {
    const newChat: Chat = {
      id: `chat_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      intentType: selectedIntent.type,
    };
    setChats([newChat, ...chats]);
    setActiveChat(newChat.id);
  };

  const deleteChat = (chatId: string) => {
    if (confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      const remainingChats = chats.filter(c => c.id !== chatId);
      setChats(remainingChats);
      
      if (activeChat === chatId) {
        setActiveChat(remainingChats.length > 0 ? remainingChats[0].id : null);
      }
      
      // Ensure localStorage is updated immediately (though useEffect should handle this)
      if (remainingChats.length === 0) {
        localStorage.removeItem('dandolo_chats');
      }
    }
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      createdAt: Date.now(),
    };
    
    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const deleteFolder = (folderId: string) => {
    if (confirm('Are you sure you want to delete this folder? Chats in this folder will be moved to the main area.')) {
      // Move chats out of folder
      setChats(chats.map(chat => 
        chat.folderId === folderId 
          ? { ...chat, folderId: undefined }
          : chat
      ));
      
      // Delete folder
      setFolders(folders.filter(f => f.id !== folderId));
    }
  };

  const moveChatToFolder = (chatId: string, folderId: string | undefined) => {
    setChats(chats.map(chat => 
      chat.id === chatId 
        ? { ...chat, folderId }
        : chat
    ));
  };

  const generateTitle = (content: string) => {
    const cleaned = content.replace(/\n/g, ' ').trim();
    return cleaned.length > 40 ? `${cleaned.substring(0, 40)}...` : cleaned;
  };

  // Message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    let currentChat = getCurrentChat();
    if (!currentChat) {
      createNewChat();
      currentChat = chats[0];
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
      intentType: selectedIntent.type,
    };

    const loadingMessage: Message = {
      id: `msg_${Date.now()}_loading`,
      role: 'assistant',
      content: '',
      isLoading: true,
      timestamp: Date.now(),
      intentType: selectedIntent.type,
    };

    // Update chat with user message and loading state
    const updatedMessages = [...currentChat.messages, userMessage, loadingMessage];
    const updatedChat = {
      ...currentChat,
      messages: updatedMessages,
      title: currentChat.messages.length === 0 ? generateTitle(message) : currentChat.title,
      updatedAt: Date.now(),
    };

    setChats(chats.map(c => c.id === currentChat!.id ? updatedChat : c));
    setMessage('');
    setIsLoading(true);

    try {
      console.log('[CHAT] Sending message with address:', address || 'anonymous');
      const response = await routeInference({
        prompt: message,
        address: address || 'anonymous',
        intentType: selectedIntent.type,
        model: selectedModel || undefined,
        allowAdultContent,
      });
      console.log('[CHAT] Received response:', response);

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_response`,
        role: 'assistant',
        content: response.response,
        timestamp: Date.now(),
        model: response.model,
        provider: response.provider,
        tokens: response.totalTokens,
        responseTime: response.responseTime,
        intentType: selectedIntent.type,
      };

      // Parse response for special content
      if (selectedIntent.type === 'image') {
        const imageUrlMatch = response.response.match(/!\[.*?\]\((.*?)\)/);
        if (imageUrlMatch) {
          assistantMessage.imageUrl = imageUrlMatch[1];
        }
      }

      // Replace loading message with actual response
      const finalMessages = updatedMessages.slice(0, -1).concat([assistantMessage]);
      const finalChat = { ...updatedChat, messages: finalMessages };
      
      setChats(chats.map(c => c.id === currentChat!.id ? finalChat : c));
      
      // Force refresh user stats to show updated count
      setStatsRefreshKey(prev => prev + 1);
      
      // Immediately update local usage count for instant UI feedback
      setLocalUsageCount(prev => prev + 1);
      
      // Animate the counter update
      setIsCounterAnimating(true);
      setTimeout(() => setIsCounterAnimating(false), 600);
    } catch (error) {
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: '',
        error: error instanceof Error ? error.message : 'An error occurred',
        timestamp: Date.now(),
        intentType: selectedIntent.type,
      };

      const errorMessages = updatedMessages.slice(0, -1).concat([errorMessage]);
      const errorChat = { ...updatedChat, messages: errorMessages };
      
      setChats(chats.map(c => c.id === currentChat!.id ? errorChat : c));
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const currentChat = getCurrentChat();
  const getAllModels = useMemo(() => {
    if (!availableModels) return [];
    
    const processedModels = [];
    
    // Process text models
    if (availableModels.text) {
      availableModels.text.forEach((m: any) => {
        const capabilities = ['chat'];
        if (m.id?.toLowerCase().includes('coder') || m.id?.toLowerCase().includes('deepseek')) {
          capabilities.push('code');
        }
        if (m.contextLength > 100000 || m.id?.toLowerCase().includes('70b')) {
          capabilities.push('analysis');
        }
        if (m.id?.toLowerCase().includes('vision') || m.id?.toLowerCase().includes('vl')) {
          capabilities.push('vision');
        }
        processedModels.push({ 
          ...m, 
          type: 'text', 
          capabilities,
          name: m.name || m.id
        });
      });
    }
    
    // Process code models
    if (availableModels.code) {
      availableModels.code.forEach((m: any) => {
        processedModels.push({ 
          ...m, 
          type: 'code', 
          capabilities: ['code', 'chat'],
          name: m.name || m.id
        });
      });
    }
    
    // Process image models
    if (availableModels.image) {
      availableModels.image.forEach((m: any) => {
        processedModels.push({ 
          ...m, 
          type: 'image', 
          capabilities: ['image'],
          name: m.name || m.id
        });
      });
    }
    
    // Process multimodal models
    if (availableModels.multimodal) {
      availableModels.multimodal.forEach((m: any) => {
        processedModels.push({ 
          ...m, 
          type: 'multimodal', 
          capabilities: ['vision', 'chat', 'analysis'],
          name: m.name || m.id
        });
      });
    }
    
    // Remove duplicates based on id
    const uniqueModels = processedModels.filter((model, index, self) => 
      index === self.findIndex((m) => m.id === model.id)
    );
    
    console.log('[FRONTEND] Processed models total:', uniqueModels.length);
    console.log('[FRONTEND] Processed image models:', uniqueModels.filter(m => m.type === 'image').map(m => m.id));
    console.log('[FRONTEND] All processed models:', uniqueModels.map(m => ({ id: m.id, type: m.type, name: m.name })));
    return uniqueModels;
  }, [availableModels]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-dark-1">
      {/* Sidebar */}
      <div className="w-80 sidebar flex flex-col">
        {/* New Chat Button */}
        <div className="p-6">
          <button
            onClick={createNewChat}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* New Folder Button */}
        <div className="px-4">
          {showNewFolderInput ? (
            <div className="bg-dark-3 rounded-2xl p-3 mb-4">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full bg-transparent text-white text-sm outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFolder();
                  if (e.key === 'Escape') {
                    setShowNewFolderInput(false);
                    setNewFolderName('');
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={createFolder}
                  className="px-3 py-1 bg-brand-500 text-black text-xs rounded-lg hover:bg-brand-600"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewFolderInput(false);
                    setNewFolderName('');
                  }}
                  className="px-3 py-1 bg-dark-4 text-white/60 text-xs rounded-lg hover:bg-dark-5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFolderInput(true)}
              className="w-full flex items-center gap-2 p-3 rounded-2xl hover:bg-white/5 text-white/60 hover:text-white transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm">New Folder</span>
            </button>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-4">
            {/* Folders */}
            {folders.map((folder) => {
              const folderChats = chats.filter(chat => chat.folderId === folder.id);
              return (
                <div key={folder.id} className="space-y-2">
                  <div
                    className="flex items-center justify-between group p-2 rounded-xl hover:bg-white/5"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-brand-500/10');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-brand-500/10');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-brand-500/10');
                      if (draggedChatId) {
                        moveChatToFolder(draggedChatId, folder.id);
                        setDraggedChatId(null);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="text-sm font-medium text-white/70">{folder.name}</span>
                      <span className="text-xs text-white/40">({folderChats.length})</span>
                    </div>
                    <button
                      onClick={() => deleteFolder(folder.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-system-red/20 rounded-lg transition-all"
                    >
                      <svg className="w-3 h-3 text-system-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Chats in folder */}
                  <div className="ml-4 space-y-1">
                    {folderChats.map((chat) => (
                      <div
                        key={chat.id}
                        className="group flex items-center gap-2"
                        draggable
                        onDragStart={() => setDraggedChatId(chat.id)}
                        onDragEnd={() => setDraggedChatId(null)}
                      >
                        <button
                          onClick={() => setActiveChat(chat.id)}
                          className={`flex-1 min-w-0 text-left p-3 rounded-2xl transition-all duration-200 ${
                            activeChat === chat.id
                              ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20'
                              : 'hover:bg-white/5 text-white/70 hover:text-white'
                          }`}
                        >
                          <div className="font-medium text-sm truncate">{chat.title}</div>
                          <div className="text-xs text-white/40 mt-1">
                            {chat.messages.length} messages
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Deleting chat:', chat.id);
                            deleteChat(chat.id);
                          }}
                          className="opacity-70 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded-lg transition-all flex-shrink-0"
                          title="Delete chat"
                        >
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized Chats */}
            <div className="space-y-2">
              {chats.filter(chat => !chat.folderId).length > 0 && (
                <>
                  <div 
                    className="flex items-center gap-2 p-2 rounded-xl"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-dark-4');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-dark-4');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-dark-4');
                      if (draggedChatId) {
                        moveChatToFolder(draggedChatId, undefined);
                        setDraggedChatId(null);
                      }
                    }}
                  >
                    <span className="text-sm font-medium text-white/40">All Chats</span>
                  </div>
                  
                  {chats.filter(chat => !chat.folderId).map((chat) => (
                    <div
                      key={chat.id}
                      className="group flex items-center"
                      draggable
                      onDragStart={() => setDraggedChatId(chat.id)}
                      onDragEnd={() => setDraggedChatId(null)}
                    >
                      <button
                        onClick={() => setActiveChat(chat.id)}
                        className={`flex-1 min-w-0 text-left p-3 rounded-2xl transition-all duration-200 ${
                          activeChat === chat.id
                            ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20'
                            : 'hover:bg-white/5 text-white/70 hover:text-white'
                        }`}
                      >
                        <div className="font-medium text-sm truncate">{chat.title}</div>
                        <div className="text-xs text-white/40 mt-1">
                          {chat.messages.length} messages
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Deleting chat:', chat.id);
                          deleteChat(chat.id);
                        }}
                        className="opacity-70 group-hover:opacity-100 ml-2 p-2 hover:bg-red-500/20 rounded-lg transition-all"
                        title="Delete chat"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* User Stats */}
        <div className="p-4 border-t border-dark-4">
          <div className={`card p-4 transition-all duration-300 ${isCounterAnimating ? 'ring-2 ring-brand-500/50 scale-[1.02]' : ''}`}>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-white/50">Daily Usage</div>
                <div className={`text-lg font-semibold text-white transition-all duration-300 ${isCounterAnimating ? 'scale-110 text-brand-500' : ''}`}>
                  {localUsageCount} / {userStats ? (userStats.promptsToday + userStats.promptsRemaining) : 100}
                </div>
              </div>
              <div className="w-full bg-dark-4 rounded-full h-2">
                <div 
                  className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${userStats ? 
                      (localUsageCount / (userStats.promptsToday + userStats.promptsRemaining)) * 100 
                      : (localUsageCount / 100) * 100}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-white/50">
                <span>{userStats?.promptsRemaining || (100 - localUsageCount)} remaining</span>
                <span>Points: {userStats?.points || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-dark-2/50 backdrop-blur-xl border-b border-dark-4 p-6 relative z-10">
          <div className="grid grid-cols-2 gap-8 mb-6">
            <ModelSelector
              models={getAllModels}
              selected={selectedModel}
              onSelect={setSelectedModel}
              selectedIntent={selectedIntent}
            />
            <IntentSelector
              intents={CHAT_INTENTS}
              selected={selectedIntent}
              onSelect={setSelectedIntent}
            />
          </div>
          
          {/* Adult Content Toggle */}
          <div className="flex items-center justify-center">
            <label className="flex items-center gap-3 cursor-pointer group">
              <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                Allow Adult Content
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={allowAdultContent}
                  onChange={(e) => setAllowAdultContent(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors duration-200 ${
                  allowAdultContent ? 'bg-brand-500' : 'bg-dark-4'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${
                    allowAdultContent ? 'translate-x-6' : 'translate-x-0.5'
                  } mt-0.5`}></div>
                </div>
              </div>
              <span className="text-xs text-white/40">
                {allowAdultContent ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {currentChat ? (
              <div className="space-y-6">
                {currentChat.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`message ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}>
                      <div className="message-content">
                        <MessageContent msg={msg} />
                      </div>
                      {msg.role === 'assistant' && msg.model && (
                        <div className="mt-3 pt-3 border-t border-black/10 text-xs text-black/60 flex items-center gap-4">
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
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 mx-auto mb-8 opacity-30">
                    <Logo variant="shield" className="w-full h-full" showText={false} />
                  </div>
                  <h2 className="text-xl font-semibold text-white/60 mb-2">Welcome to Dandolo.ai</h2>
                  <p className="text-white/40 mb-8">Start a conversation to begin</p>
                  
                  {/* Privacy Notice */}
                  <div className="bg-brand-500/10 border border-brand-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🔒</span>
                      <h3 className="text-sm font-semibold text-brand-500">Complete Privacy</h3>
                    </div>
                    <p className="text-xs text-brand-400 leading-relaxed">
                      We NEVER store your conversations or data. Everything stays local in your browser. 
                      We route to uncensored AI and open source models - your prompts go directly to providers.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="bg-dark-2/50 backdrop-blur-xl border-t border-dark-4 p-6">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Ask me anything about ${selectedIntent.label.toLowerCase()}...`}
                className="flex-1 input text-[15px]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !message.trim()}
                className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="loading-spinner w-5 h-5" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
            
            {/* Privacy Reminder */}
            <div className="mt-3 text-center">
              <p className="text-xs text-brand-400 flex items-center justify-center gap-1">
                <span>🔒</span>
                Private & secure - conversations stored locally only
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;