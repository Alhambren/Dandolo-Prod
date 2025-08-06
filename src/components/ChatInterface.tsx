import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { useSession } from '../lib/session';
import { 
  Plus, 
  ChevronDown, 
  MessageSquare, 
  Image, 
  Code, 
  BarChart, 
  Send,
  X,
  Folder,
  FolderPlus,
  MoreHorizontal
} from 'lucide-react';
import { Logo } from './Logo';

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
  folderId?: string;
}

interface Folder {
  id: string;
  name: string;
  createdAt: number;
  color?: string;
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
  'auto-select',
  'venice-text-model',
  'venice-code-model',
  'venice-image-model'
];

// Message Content Component
const MessageContent: React.FC<{ msg: Message; role: 'user' | 'assistant' }> = ({ msg, role }) => {
  if (msg.isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="animate-spin w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
        <span className="text-gray-400 text-sm">
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
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        <p className="text-red-400 text-sm">⚠️ {msg.error}</p>
      </div>
    );
  }

  if (msg.intentType === 'image' && msg.imageUrl) {
    const isBase64 = msg.imageUrl.startsWith('data:');
    
    return (
      <div className="space-y-4">
        <div className="relative group overflow-hidden rounded-xl max-w-md">
          <img
            src={msg.imageUrl}
            alt="Generated image"
            className="w-full rounded-xl cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
            onClick={() => {
              if (isBase64) {
                // For base64 images, create a blob URL and open in new tab
                try {
                  const byteCharacters = atob(msg.imageUrl.split(',')[1]);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: 'image/webp' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                  // Clean up the URL after a delay
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (error) {
                  console.error('Failed to open base64 image:', error);
                }
              } else {
                window.open(msg.imageUrl, '_blank');
              }
            }}
            onError={(e) => {
              console.error('Image failed to load:', msg.imageUrl?.substring(0, 100) + '...');
              console.error('Error:', e);
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 rounded-xl"></div>
          {isBase64 && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Base64 Image
            </div>
          )}
        </div>
        {msg.content && !msg.content.includes(msg.imageUrl || '') && (
          <p className={`leading-relaxed ${role === 'user' ? 'text-black font-semibold' : 'text-gray-200 font-medium'}`}>
            {msg.content}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="prose max-w-none">
      <p className={`leading-relaxed whitespace-pre-wrap ${role === 'user' ? 'text-black font-semibold' : 'text-gray-200 font-medium'}`}>
        {msg.content}
      </p>
    </div>
  );
};

export const ChatInterface: React.FC = () => {
  const { address } = useAccount();
  
  // Add session management
  const { sessionId, endSession, updateActivity } = useSession();
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODELS[0]);
  const [taskType, setTaskType] = useState<TaskType>('chat');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [allowAdultContent, setAllowAdultContent] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [draggedChatId, setDraggedChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // API calls - Using the original working API
  const routeInference = useAction(api.inference.routeSimple);
  const removeSession = useMutation(api.sessionProviders.removeSession);
  const userStats = useQuery(api.points.getUserStats, address ? { address } : 'skip');
  const availableModels = useQuery(api.models.getAvailableModels);


  // Filter models by task type
  const modelsToShow = useMemo(() => {
    if (availableModels && availableModels.length > 0) {
      let filteredModels = availableModels;
      
      // Filter models based on task type
      switch (taskType) {
        case 'image':
          filteredModels = availableModels.filter(model => model.type === 'image');
          break;
        case 'code':
          filteredModels = availableModels.filter(model => 
            model.type === 'code' || model.type === 'text'
          );
          break;
        case 'analysis':
          filteredModels = availableModels.filter(model => 
            model.type === 'text' || model.type === 'multimodal'
          );
          break;
        case 'chat':
        default:
          filteredModels = availableModels.filter(model => 
            model.type === 'text' || model.type === 'multimodal'
          );
          break;
      }
      
      // Fallback to all text models if no specific models found
      if (filteredModels.length === 0) {
        filteredModels = availableModels.filter(model => model.type === 'text');
      }
      
      return filteredModels.map(model => model.id);
    }
    return DEFAULT_MODELS;
  }, [availableModels, taskType]);

  // Ensure selected model is valid when models change or task type changes
  useEffect(() => {
    if (modelsToShow.length > 0 && !modelsToShow.includes(selectedModel)) {
      setSelectedModel(modelsToShow[0]);
    }
  }, [modelsToShow, selectedModel]);

  // Load chats and folders from localStorage
  useEffect(() => {
    const savedChats = localStorage.getItem('dandolo_chats');
    const savedFolders = localStorage.getItem('dandolo_folders');
    const savedAdultContent = localStorage.getItem('dandolo_allow_adult_content');
    
    if (savedChats) {
      const parsed = JSON.parse(savedChats) as Chat[];
      setChats(parsed);
    }
    
    if (savedFolders) {
      const parsedFolders = JSON.parse(savedFolders) as Folder[];
      setFolders(parsedFolders);
    }
    
    if (savedAdultContent) {
      setAllowAdultContent(JSON.parse(savedAdultContent));
    }
    
    // Always create a new chat when platform loads - equivalent to clicking "New Chat"
    const newChat: Chat = {
      id: `chat_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      taskType: 'chat',
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat.id);
  }, []);

  // Save chats to localStorage
  useEffect(() => {
    localStorage.setItem('dandolo_chats', JSON.stringify(chats));
  }, [chats]);

  // Save folders to localStorage
  useEffect(() => {
    localStorage.setItem('dandolo_folders', JSON.stringify(folders));
  }, [folders]);

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

  const createNewChat = async () => {
    try {
      // First, remove the session from backend database
      await removeSession({ sessionId });
    } catch (error) {
      console.warn('Failed to remove backend session:', error);
      // Continue anyway - frontend cleanup is still valuable
    }
    
    // Then end the frontend session (clears localStorage and generates new session ID)
    endSession();
    
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

  // Folder management functions
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

  const deleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this folder? Chats will be moved to the main list.')) {
      // Move chats out of folder
      setChats(chats.map(chat => 
        chat.folderId === folderId 
          ? { ...chat, folderId: undefined }
          : chat
      ));
      // Remove folder
      setFolders(folders.filter(f => f.id !== folderId));
    }
  };

  const moveChatToFolder = (chatId: string, folderId?: string) => {
    setChats(chats.map(chat => 
      chat.id === chatId 
        ? { ...chat, folderId }
        : chat
    ));
  };

  const handleDragStart = (chatId: string) => {
    setDraggedChatId(chatId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, folderId?: string) => {
    e.preventDefault();
    if (draggedChatId) {
      moveChatToFolder(draggedChatId, folderId);
      setDraggedChatId(null);
    }
  };

  const getChatsByFolder = (folderId?: string) => {
    return chats.filter(chat => chat.folderId === folderId);
  };

  const generateTitle = (content: string) => {
    const cleaned = content.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Extract key words/phrases for better titles
    const words = cleaned.split(' ');
    
    // Remove common question words and filler
    const stopWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should', 'will', 'do', 'does', 'did', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'please', 'help', 'me'];
    
    // Keep important words and first few words for context
    const importantWords = words.filter((word, index) => {
      const lowerWord = word.toLowerCase();
      // Always keep first 2 words for context, then filter stop words
      return index < 2 || (!stopWords.includes(lowerWord) && word.length > 2);
    }).slice(0, 6); // Limit to 6 words max
    
    let title = importantWords.join(' ');
    
    // If title is too short, use first part of original
    if (title.length < 15 && cleaned.length > title.length) {
      title = cleaned.length > 35 ? `${cleaned.substring(0, 35)}...` : cleaned;
    }
    
    // Ensure we don't exceed reasonable length
    if (title.length > 35) {
      title = `${title.substring(0, 35)}...`;
    }
    
    return title || 'New Chat';
  };

  // Auto-compact chat to manage context length
  const autoCompactChat = (messages: Message[], maxMessages: number = 20): Message[] => {
    if (messages.length <= maxMessages) {
      return messages;
    }

    // Keep the first message (often contains important context)
    const firstMessage = messages[0];
    
    // Keep the last N messages to maintain recent conversation flow
    const recentMessages = messages.slice(-maxMessages + 1);
    
    // Insert a summary message to indicate compaction
    const summaryMessage: Message = {
      id: `summary_${Date.now()}`,
      role: 'assistant',
      content: `[Previous conversation compacted - ${messages.length - maxMessages} earlier messages hidden to manage context length]`,
      timestamp: Date.now(),
      intentType: 'chat',
    };

    return [firstMessage, summaryMessage, ...recentMessages];
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

    const newMessages = [...currentChat.messages, userMessage, loadingMessage];
    const compactedMessages = autoCompactChat(newMessages);
    
    const updatedChat = {
      ...currentChat,
      messages: compactedMessages,
      title: currentChat.messages.length === 0 ? generateTitle(message) : currentChat.title,
      updatedAt: Date.now(),
      taskType,
    };

    setChats(prevChats => prevChats.map(c => c.id === currentChat!.id ? updatedChat : c));
    setMessage('');
    setIsLoading(true);

    try {
      // Update session activity
      updateActivity();

      // Use the original working API with full conversation context and session ID
      const conversationMessages = compactedMessages
        .filter(msg => !msg.isLoading) // Remove loading messages
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      const response = await routeInference({
        messages: conversationMessages, // Send full conversation for context
        address: address || 'anonymous',
        sessionId: sessionId, // Add session ID for provider persistence
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
        const imageUrlMatch = response.response.match(/!\[.*?\]\((.*?)\)/);
        if (imageUrlMatch) {
          assistantMessage.imageUrl = imageUrlMatch[1];
        } else {
          // Check if response contains image data that wasn't parsed
          if (response.response.includes('data:image/')) {
            console.warn('Base64 image data found but not parsed:', response.response.substring(0, 100));
          }
        }
      }

      const finalMessages = autoCompactChat(updatedChat.messages.slice(0, -1).concat([assistantMessage]));
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

      const errorMessages = autoCompactChat(updatedChat.messages.slice(0, -1).concat([errorMessage]));
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
      case 'image': return "Describe the image you want to create...";
      case 'code': return "Describe the code you need...";
      case 'analysis': return "What would you like to analyze?";
      default: return "Ask me anything...";
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-950 relative">
      {/* Mobile overlay */}
      {isSidebarExpanded && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarExpanded(false)}
        />
      )}
      
      {/* Slim Sidebar - Collapsible on desktop, overlay on mobile */}
      <div 
        className={`${
          isSidebarExpanded ? 'w-64' : 'w-16'
        } transition-all duration-200 bg-gray-900 border-r border-gray-800 flex flex-col group
        md:relative md:translate-x-0 ${
          isSidebarExpanded 
            ? 'fixed inset-y-0 left-0 z-50 md:relative' 
            : 'hidden md:flex'
        }`}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 p-3 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className={`${isSidebarExpanded ? 'inline' : 'hidden'}`}>New Chat</span>
          </button>
        </div>

        {/* Folders and Chats */}
        <div className="flex-1 overflow-y-auto px-2">
          <div className="space-y-1">
            {/* Add Folder Button */}
            {isSidebarExpanded && (
              <div className="mb-3">
                {showNewFolderInput ? (
                  <div className="flex items-center gap-2 p-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder name"
                      className="flex-1 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createFolder();
                        if (e.key === 'Escape') {
                          setShowNewFolderInput(false);
                          setNewFolderName('');
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={createFolder}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewFolderInput(true)}
                    className="w-full flex items-center gap-2 p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors text-sm"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Add Folder</span>
                  </button>
                )}
              </div>
            )}

            {/* Folders */}
            {folders.map((folder) => {
              const folderChats = getChatsByFolder(folder.id);
              return (
                <div key={folder.id} className="mb-2">
                  <div 
                    className="flex items-center gap-2 p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors group/folder"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, folder.id)}
                  >
                    <Folder className="w-4 h-4 flex-shrink-0" />
                    {isSidebarExpanded && (
                      <>
                        <span className="flex-1 text-sm truncate">{folder.name}</span>
                        <span className="text-xs text-gray-600">{folderChats.length}</span>
                        <button
                          onClick={(e) => deleteFolder(folder.id, e)}
                          className="opacity-0 group-hover/folder:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                        >
                          <X className="w-3 h-3 text-gray-500" />
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Chats in folder */}
                  {isSidebarExpanded && folderChats.map((chat) => (
                    <div key={chat.id} className="group/chat relative ml-4">
                      <button
                        onClick={() => setActiveChat(chat.id)}
                        draggable
                        onDragStart={() => handleDragStart(chat.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                          activeChat === chat.id
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-xs">
                          {chat.taskType === 'image' ? '🎨' :
                           chat.taskType === 'code' ? '💻' :
                           chat.taskType === 'analysis' ? '📊' :
                           '💬'}
                        </div>
                        <span className="truncate text-sm">{chat.title}</span>
                      </button>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/chat:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                      >
                        <X className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Unorganized chats */}
            <div 
              className="space-y-1"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e)}
            >
              {getChatsByFolder().slice(0, 10).map((chat) => (
                <div key={chat.id} className="group/chat relative">
                  <button
                    onClick={() => setActiveChat(chat.id)}
                    draggable
                    onDragStart={() => handleDragStart(chat.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                      activeChat === chat.id
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/chat:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                    >
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Usage at bottom */}
        <div className="p-3 border-t border-gray-800">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{usageCount}</div>
            <div className={`text-xs text-gray-500 ${isSidebarExpanded ? 'block' : 'hidden'}`}>
              / {dailyLimit} daily
            </div>
            {isSidebarExpanded && (
              <div className="w-full bg-gray-800 rounded-full h-1 mt-2">
                <div 
                  className="bg-yellow-500 h-1 rounded-full transition-all"
                  style={{ width: `${(usageCount / dailyLimit) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Slim top bar with integrated controls */}
        <div className="flex items-center gap-4 px-4 md:px-6 py-3 border-b border-gray-800 bg-gray-900/50">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Folder className="w-5 h-5" />
          </button>
          
          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              <span className="text-gray-400">Model:</span>
              <span className="text-white">{selectedModel}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showModelSelector && (
              <div className="absolute top-full left-0 mt-2 bg-gray-800 rounded-lg shadow-xl p-2 min-w-[300px] z-50 max-h-96 overflow-y-auto">
                {modelsToShow.map(model => {
                  const modelData = availableModels?.find(m => m.id === model);
                  return (
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
                      <div className="font-medium">{model}</div>
                      {modelData?.type && (
                        <div className="text-xs text-gray-400 capitalize">{modelData.type}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Task Type - Icon Pills */}
          <div className="flex items-center gap-1 md:gap-2">
            {TASK_TYPES.map(({ type, icon: Icon, title }) => (
              <button
                key={type}
                onClick={() => setTaskType(type)}
                className={`p-1.5 rounded-lg transition-colors ${
                  taskType === type ? 'bg-yellow-400 text-black font-semibold' : 'bg-gray-800 text-gray-400'
                }`}
                title={title}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Adult content toggle - hidden on mobile */}
          <label className="hidden md:flex items-center gap-2 text-xs text-gray-500">
            <input 
              type="checkbox" 
              checked={allowAdultContent}
              onChange={(e) => setAllowAdultContent(e.target.checked)}
              className="rounded" 
            />
            <span>Allow adult content</span>
          </label>
        </div>
        
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-12">
            {currentChat ? (
              <div className="space-y-6">
                {currentChat.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-3xl px-6 py-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-yellow-400 text-black font-semibold' 
                        : 'bg-gray-800 text-white'
                    }`}>
                      <MessageContent msg={msg} role={msg.role} />
                      {msg.role === 'assistant' && msg.model && !msg.isLoading && (
                        <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400 flex items-center gap-4">
                          <span>{msg.provider}</span>
                          <span>{msg.model}</span>
                          {msg.tokens && <span>{msg.tokens} tokens</span>}
                          {msg.responseTime && <span>{msg.responseTime}ms</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Production-safe session debug info - only shown when there are messages */}
                {currentChat && currentChat.messages.length > 1 && (
                  <div className="mt-8 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>Session: {sessionId.substring(0, 8)}...</span>
                      <span className="text-gray-600">•</span>
                      <span>Provider persistence active</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            ) : (
              /* Welcome State */
              <div className="text-center py-24">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-2xl flex items-center justify-center p-3">
                  <Logo variant="shield" className="h-full w-full" showText={false} />
                </div>
                <h1 className="text-3xl font-bold mb-2 text-white">Welcome to Dandolo.ai</h1>
                <p className="text-gray-400 mb-8">Decentralized AI at your fingertips</p>
                
                {/* Quick prompts */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12">
                  {QUICK_PROMPTS.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickPrompt(prompt.prompt, prompt.taskType)}
                      className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 text-left transition-colors"
                    >
                      <div className="text-sm font-medium mb-1">{prompt.icon} {prompt.title}</div>
                      <div className="text-xs text-gray-400">{prompt.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Input Area - Floating */}
        <div className="px-4 md:px-6 py-4 bg-gray-900/50 backdrop-blur">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={getTaskTypePromptPlaceholder()}
                className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-xl resize-none focus:outline-none focus:border-gray-600 text-white placeholder-gray-400 text-sm md:text-base"
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
                type="submit"
                disabled={isLoading || !message.trim()}
                className="absolute right-2 bottom-2 p-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
            <div className="mt-2 text-xs text-gray-500 text-center">
              🔒 Private & secure - conversations stored locally only
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};