// ChatPage.tsx
// Comprehensive chat interface with model-aware chat management, folder system,
// search, and user statistics. Handles different intent types (chat, code, image,
// analysis) and stores data in local storage.
// Inputs: None (component uses Convex actions and hooks)
// Outputs: Rendered chat interface
// Assumptions: Browser environment with localStorage available

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAccount } from 'wagmi';
import GlassCard from './GlassCard';
import { toast } from 'sonner';

/**
 * Helper to render message content. Supports basic markdown image syntax and
 * graceful error handling when an image fails to load.
 */
const renderMessageContent = (msg: Message) => {
  if (msg.isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-white"></div>
        <span className="text-gray-300">
          {msg.intentType === 'image' ? 'Generating image...' :
            msg.intentType === 'audio' ? 'Processing audio...' :
            'Thinking...'}
        </span>
      </div>
    );
  }
  if (msg.error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
        <p className="text-red-300">⚠️ {msg.error}</p>
      </div>
    );
  }
  if (msg.intentType === 'image' && msg.imageUrl) {
    return (
      <div className="space-y-3">
        <div className="relative group">
          <img
            src={msg.imageUrl}
            alt="Generated image"
            className="max-w-full rounded-lg shadow-lg cursor-pointer"
            style={{ maxHeight: '500px', objectFit: 'contain' }}
            onClick={() => window.open(msg.imageUrl, '_blank')}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const errorDiv = document.createElement('div');
              errorDiv.className = 'text-red-400 p-4 bg-red-500/10 rounded';
              errorDiv.textContent = '⚠️ Failed to load generated image';
              target.parentElement?.appendChild(errorDiv);
            }}
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={msg.imageUrl}
              download
              className="bg-black/70 text-white px-3 py-1 rounded-lg text-sm hover:bg-black/90"
              onClick={(e) => e.stopPropagation()}
            >
              ⬇ Download
            </a>
          </div>
        </div>
        {msg.content && !msg.content.includes(msg.imageUrl) && (
          <p className="text-gray-300 text-sm">{msg.content}</p>
        )}
      </div>
    );
  }
  if (msg.intentType === 'audio' && msg.audioUrl) {
    return (
      <div className="space-y-3">
        <audio controls className="w-full">
          <source src={msg.audioUrl} />
          Your browser does not support the audio element.
        </audio>
        {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
      </div>
    );
  }
  if (msg.intentType === 'image' && !msg.imageUrl) {
    return (
      <div className="space-y-3">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
          <p className="text-yellow-300 text-sm mb-2">
            ⚠️ No image was generated. The model returned a description instead.
          </p>
        </div>
        <div className="bg-white/5 rounded p-3">
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
        <button
          onClick={() => {
            const event = new CustomEvent('regenerateMessage', { detail: { messageId: msg.id } });
            window.dispatchEvent(event);
          }}
          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
        >
          🔄 Try again with an image model
        </button>
      </div>
    );
  }
  return <div className="whitespace-pre-wrap">{msg.content}</div>;
};

// Message data structure for each chat message
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  model?: string;
  provider?: string;
  tokens?: number;
  responseTime?: number;
  intentType?: string;
  isLoading?: boolean;
  error?: string;
  imageUrl?: string;
  audioUrl?: string;
}

// Chat data structure representing a conversation thread
interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  folderId?: string; // optional folder association
  model?: string;
  intentType?: string;
}

// Folder for organizing chats
interface Folder {
  id: string;
  name: string;
  isExpanded: boolean;
  createdAt: number;
}

// Intent definition used to select AI model / capability
type ChatIntent = {
  type: 'chat' | 'code' | 'image' | 'vision' | 'audio' | 'analysis';
  label: string;
  icon: string;
  model: string;
};

/**
 * ChatPage component renders the main chat UI with folders, chats, and messages.
 * It stores chats locally in the browser and supports multiple intent types.
 */
const ChatPage: React.FC = () => {
  const { address } = useAccount();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<ChatIntent>({
    type: 'chat',
    label: 'General Chat',
    icon: '💬',
    model: 'llama-3.3-70b',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [draggedChat, setDraggedChat] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renamingChat, setRenamingChat] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // File upload support for vision and audio intents
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const routeInference = useAction(api.inference.routeSimple);
  const userStats = useQuery(api.points.getUserStats, address ? { address } : 'skip');
  const fetchModels = useAction(api.models.fetchAndCategorizeModels);
  console.log(address,fetchModels,routeInference)
  const [availableModels, setAvailableModels] = useState<any>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem('dandolo_chats');
    const savedFolders = localStorage.getItem('dandolo_folders');

    if (savedChats) {
      const parsedChats = JSON.parse(savedChats) as Chat[];
      setChats(parsedChats);

      // Load most recent chat if available
      if (parsedChats.length > 0) {
        const mostRecent = parsedChats.sort((a, b) => b.updatedAt - a.updatedAt)[0];
        setActiveChat(mostRecent.id);
      }
    }

    if (savedFolders) {
      setFolders(JSON.parse(savedFolders) as Folder[]);
    }
  }, []);

  // Persist chats and folders to localStorage when changed
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('dandolo_chats', JSON.stringify(chats));
    }
  }, [chats]);

  useEffect(() => {
    if (folders.length > 0) {
      localStorage.setItem('dandolo_folders', JSON.stringify(folders));
    }
  }, [folders]);

  // Auto-scroll to latest message whenever messages or active chat changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChat]);

  // Add debugging useEffect after the other useEffects
  useEffect(() => {
    console.log("Current chats:", chats);
    console.log("Active chat:", activeChat);
    const current = getCurrentChat();
    console.log("Current chat messages:", current?.messages);
  }, [chats, activeChat]);

  // Fetch available models on mount and periodically
  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await fetchModels();
        setAvailableModels(models);
        console.log('Loaded models:', models);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };

    loadModels();
    const interval = setInterval(loadModels, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [fetchModels]);

  // Replace the CHAT_INTENTS useMemo with this static array:
  const CHAT_INTENTS: ChatIntent[] = [
    {
      type: 'chat',
      label: 'General Chat',
      icon: '💬',
      model: 'llama-3.3-70b',
    },
    {
      type: 'code',
      label: 'Code Assistant',
      icon: '💻',
      model: 'qwen-2.5-coder-32b',
    },
    {
      type: 'image',
      label: 'Image Creation',
      icon: '🎨',
      model: 'flux-standard',
    },
    {
      type: 'vision',
      label: 'Image Analysis',
      icon: '👁️',
      model: 'llama-3.2-vision-11b',
    },
    {
      type: 'audio',
      label: 'Voice Chat',
      icon: '🎤',
      model: 'whisper-large-v3',
    },
    {
      type: 'analysis',
      label: 'Deep Analysis',
      icon: '📊',
      model: 'llama-3.3-70b',
    },
  ];

  // Show model info in UI
  const currentModelInfo = useMemo(() => {
    if (!availableModels) return null;
    
    let models;
    switch (selectedIntent.type) {
      case 'code':
        models = availableModels.code;
        break;
      case 'image':
        models = availableModels.image;
        break;
      case 'vision':
        models = availableModels.multimodal;
        break;
      case 'audio':
        models = availableModels.text;
        break;
      case 'analysis':
        models = availableModels.text.filter((m: any) => m.id.includes('gpt-4'));
        break;
      default:
        models = availableModels.text;
    }
    
    return models?.find((m: any) => m.id === selectedIntent.model) || models?.[0];
  }, [selectedIntent, availableModels]);

  // Update all references to promptsRemaining
  const canSendMessage = userStats && userStats.promptsRemaining > 0;
  const pointsRemaining = userStats?.promptsRemaining ?? 0;

  // ----- Helper functions -----

  // Create a new empty chat and set it active
  const createNewChat = () => {
    const newChat: Chat = {
      id: `chat_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedIntent.model,
      intentType: selectedIntent.type,
    };

    setChats([...chats, newChat]);
    setActiveChat(newChat.id);
  };

  // Create a new folder with provided name
  const createNewFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name: newFolderName,
      isExpanded: true,
      createdAt: Date.now(),
    };

    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  // Delete folder and move contained chats to root
  const deleteFolder = (folderId: string) => {
    const updatedChats = chats.map((chat) =>
      chat.folderId === folderId ? { ...chat, folderId: undefined } : chat
    );
    setChats(updatedChats);
    setFolders(folders.filter((f) => f.id !== folderId));
  };

  // Delete chat and update active chat accordingly
  const deleteChat = (chatId: string) => {
    const remaining = chats.filter((c) => c.id !== chatId);
    setChats(remaining);
    if (activeChat === chatId) {
      setActiveChat(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Rename chat or folder utilities
  const renameChat = (chatId: string, newTitle: string) => {
    setChats(chats.map((chat) => (chat.id === chatId ? { ...chat, title: newTitle } : chat)));
    setRenamingChat(null);
  };

  const renameFolder = (folderId: string, newName: string) => {
    setFolders(folders.map((folder) => (folder.id === folderId ? { ...folder, name: newName } : folder)));
    setRenamingFolder(null);
  };

  const toggleFolder = (folderId: string) => {
    setFolders(
      folders.map((folder) =>
        folder.id === folderId ? { ...folder, isExpanded: !folder.isExpanded } : folder
      )
    );
  };

  // Drag and drop support for moving chats between folders
  const handleDragStart = (chatId: string) => {
    setDraggedChat(chatId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, folderId?: string) => {
    e.preventDefault();
    if (!draggedChat) return;

    setChats(
      chats.map((chat) => (chat.id === draggedChat ? { ...chat, folderId } : chat))
    );
    setDraggedChat(null);
  };

  // Retrieve active chat object
  const getCurrentChat = () => chats.find((c) => c.id === activeChat);

  // Generate a simple title from first message content
  const generateChatTitle = (content: string) => {
    const maxLength = 30;
    const cleaned = content.replace(/\n/g, ' ').trim();
    return cleaned.length > maxLength ? `${cleaned.substring(0, maxLength)}...` : cleaned;
  };

  // ----- File handling for vision/audio -----
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (selectedIntent.type === 'vision' && !file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (selectedIntent.type === 'audio' && !file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      return;
    }

    setUploadedFile(file);
    toast.success(`File uploaded: ${file.name}`);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ----- Message handling -----

  // Smart Response Parser
  const parseResponseByIntent = (
    response: any,
    intentType: string
  ): { content: string; imageUrl?: string; audioUrl?: string } => {
    const responseText = response.response || response.text || '';
    switch (intentType) {
      case 'image': {
        const urlPatterns = [
          /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)/gi,
          /!\[.*?\]\((https?:\/\/[^\s]+)\)/g,
          /"url":\s*"(https?:\/\/[^\s"]+)"/g,
          /image_url['":\s]+(['"])(https?:\/\/[^\s]+)\1/g,
        ];
        for (const pattern of urlPatterns) {
          const match = responseText.match(pattern);
          if (match) {
            const imageUrl = match[0].replace(/['"]/g, '').replace(/^!\[.*?\]\(/, '').replace(/\)$/, '');
            return {
              content: responseText,
              imageUrl: imageUrl.startsWith('http') ? imageUrl : undefined,
            };
          }
        }
        return {
          content: responseText || 'Image generation failed. Please try again.',
          imageUrl: undefined,
        };
      }
      case 'audio': {
        const audioUrlMatch = responseText.match(/https?:\/\/[^\s]+\.(?:mp3|wav|ogg|m4a)/i);
        return {
          content: responseText,
          audioUrl: audioUrlMatch ? audioUrlMatch[0] : undefined,
        };
      }
      default:
        return { content: responseText };
    }
  };

  // Updated handleSubmit with Better Response Handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !uploadedFile) || isLoading) return;
    const currentChat = getCurrentChat();
    if (currentChat && currentChat.intentType !== selectedIntent.type) {
      toast.info("Creating new chat for different task type");
      createNewChat();
      return;
    }
    let userMessageContent = message;
    if (uploadedFile) {
      try {
        const base64Data = await fileToBase64(uploadedFile);
        if (selectedIntent.type === 'vision') {
          userMessageContent = `[Image: ${uploadedFile.name}]\n${message || 'What do you see in this image?'}`;
        } else if (selectedIntent.type === 'audio') {
          userMessageContent = `[Audio: ${uploadedFile.name}]\n${message || 'Transcribe this audio'}`;
        }
      } catch (err) {
        toast.error('Failed to process file');
        return;
      }
    }
    if (selectedIntent.type === 'image') {
      const qualityKeywords = ['quality', 'resolution', '4k', '8k', 'detailed', 'style'];
      if (!qualityKeywords.some(keyword => userMessageContent.toLowerCase().includes(keyword))) {
        userMessageContent += ', high quality, detailed, 4k resolution';
      }
    }
    let chatId = activeChat;
    if (!chatId) {
      const newChat: Chat = {
        id: `chat_${Date.now()}`,
        title: generateChatTitle(userMessageContent),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: selectedIntent.model,
        intentType: selectedIntent.type,
      };
      setChats(prev => [...prev, newChat]);
      setActiveChat(newChat.id);
      chatId = newChat.id;
    }
    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      content: userMessageContent,
      role: 'user',
      timestamp: Date.now(),
      intentType: selectedIntent.type,
    };
    const loadingMessage: Message = {
      id: `msg_${Date.now()}_ai`,
      content: '',
      role: 'assistant',
      timestamp: Date.now(),
      intentType: selectedIntent.type,
      isLoading: true,
    };
    setMessage('');
    setIsLoading(true);
    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages: [...chat.messages, userMessage, loadingMessage],
          updatedAt: Date.now(),
        };
      }
      return chat;
    }));
    try {
      const response = await routeInference({
        prompt: userMessageContent,
        address: address || "anonymous",
        intentType: selectedIntent.type,
      });
      console.log("Got response:", response);
      const parsed = parseResponseByIntent(response, selectedIntent.type);
      const aiMessage: Message = {
        id: loadingMessage.id,
        content: parsed.content,
        role: 'assistant',
        timestamp: Date.now(),
        model: response.model,
        provider: response.provider,
        tokens: response.tokens,
        responseTime: response.responseTime,
        intentType: selectedIntent.type,
        isLoading: false,
        imageUrl: parsed.imageUrl,
        audioUrl: parsed.audioUrl,
      };
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: chat.messages.map(msg =>
              msg.id === loadingMessage.id ? aiMessage : msg
            ),
            updatedAt: Date.now(),
          };
        }
        return chat;
      }));
      if (selectedIntent.type === 'image' && parsed.imageUrl) {
        toast.success(`Image generated successfully!`);
      } else if (selectedIntent.type === 'image' && !parsed.imageUrl) {
        toast.warning(`Model returned a description instead of an image. Try a different prompt.`);
      } else {
        toast.success(`Response from ${response.provider} (${response.responseTime}ms)`);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: loadingMessage.id,
        content: '',
        role: 'assistant',
        timestamp: Date.now(),
        intentType: selectedIntent.type,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to get response",
      };
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: chat.messages.map(msg =>
              msg.id === loadingMessage.id ? errorMessage : msg
            ),
            updatedAt: Date.now(),
          };
        }
        return chat;
      }));
      toast.error(error instanceof Error ? error.message : "Failed to get response");
    } finally {
      setIsLoading(false);
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filter chats based on search query across titles and messages
  const filteredChats = chats.filter(
    (chat) =>
      searchQuery === '' ||
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.messages.some((msg) => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Retrieve chats in a specific folder (or root if folderId undefined)
  const getChatsInFolder = (folderId?: string) => filteredChats.filter((chat) => chat.folderId === folderId);

  const currentChat = getCurrentChat();

  // Add Regeneration Support
  useEffect(() => {
    const handleRegenerate = (event: CustomEvent) => {
      const messageId = event.detail.messageId;
      const chat = getCurrentChat();
      if (!chat) return;
      const message = chat.messages.find(m => m.id === messageId);
      if (!message) return;
      const messageIndex = chat.messages.findIndex(m => m.id === messageId);
      if (messageIndex > 0) {
        const userMessage = chat.messages[messageIndex - 1];
        if (userMessage.role === 'user') {
          setMessage(userMessage.content);
          setSelectedIntent(CHAT_INTENTS.find(i => i.type === 'image') || selectedIntent);
          setTimeout(() => {
            const form = document.querySelector('form');
            form?.requestSubmit();
          }, 100);
        }
      }
    };
    window.addEventListener('regenerateMessage', handleRegenerate as any);
    return () => window.removeEventListener('regenerateMessage', handleRegenerate as any);
  }, [activeChat, chats]);

  // ----- Render -----
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white" data-testid="chat-page">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-black/50 border-r border-white/10 flex flex-col">
          {/* New Chat Button */}
          <div className="p-4">
            <button
              onClick={createNewChat}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <span>✏️</span> New chat
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 pl-10"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto px-4">
            {/* Root level chats */}
            {getChatsInFolder(undefined).map((chat) => (
              <div
                key={chat.id}
                draggable
                onDragStart={() => handleDragStart(chat.id)}
                className={`group relative p-2 rounded-lg cursor-pointer mb-1 ${
                  activeChat === chat.id ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => setActiveChat(chat.id)}
              >
                {renamingChat === chat.id ? (
                  <input
                    type="text"
                    defaultValue={chat.title}
                    onBlur={(e) => renameChat(chat.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renameChat(chat.id, (e.target as HTMLInputElement).value);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-transparent text-white outline-none"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm truncate">{chat.title}</span>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingChat(chat.id);
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="text-gray-400 hover:text-red-400"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Folders */}
            {folders.map((folder) => (
              <div key={folder.id} className="mb-2">
                <div
                  className="group flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, folder.id)}
                >
                  {renamingFolder === folder.id ? (
                    <input
                      type="text"
                      defaultValue={folder.name}
                      onBlur={(e) => renameFolder(folder.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          renameFolder(folder.id, (e.target as HTMLInputElement).value);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-transparent text-white outline-none"
                      autoFocus
                    />
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-1" onClick={() => toggleFolder(folder.id)}>
                        <span>{folder.isExpanded ? '📂' : '📁'}</span>
                        <span className="text-sm">{folder.name}</span>
                      </div>
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingFolder(folder.id);
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFolder(folder.id);
                          }}
                          className="text-gray-400 hover:text-red-400"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Chats in folder */}
                {folder.isExpanded && (
                  <div className="ml-4 mt-1">
                    {getChatsInFolder(folder.id).map((chat) => (
                      <div
                        key={chat.id}
                        draggable
                        onDragStart={() => handleDragStart(chat.id)}
                        className={`group relative p-2 rounded-lg cursor-pointer mb-1 ${
                          activeChat === chat.id ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
                        }`}
                        onClick={() => setActiveChat(chat.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm truncate">{chat.title}</span>
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingChat(chat.id);
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteChat(chat.id);
                              }}
                              className="text-gray-400 hover:text-red-400"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* New Folder */}
            <div className="mt-4 mb-2">
              {showNewFolderInput ? (
                <div className="flex items-center gap-2 p-2">
                  <span>📁</span>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onBlur={() => {
                      if (newFolderName.trim()) createNewFolder();
                      else {
                        setShowNewFolderInput(false);
                        setNewFolderName('');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') createNewFolder();
                      if (e.key === 'Escape') {
                        setNewFolderName('');
                        setShowNewFolderInput(false);
                      }
                    }}
                    placeholder="Folder name"
                    className="flex-1 bg-transparent text-white outline-none text-sm"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowNewFolderInput(true)}
                  className="flex items-center gap-2 p-2 w-full text-gray-400 hover:text-white text-sm"
                >
                  <span>➕</span> New folder
                </button>
              )}
            </div>
          </div>

          {/* Storage Notice */}
          <div className="p-4 border-t border-white/10">
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-xs text-yellow-200">🔒 All chats are stored locally in your browser</p>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            {/* Intent Selector */}
            <div className="p-4 border-b border-white/10">
              <div className="flex flex-wrap gap-2">
                {CHAT_INTENTS.map((intent) => (
                  <button
                    key={intent.type}
                    onClick={() => {
                      setSelectedIntent(intent);
                      setUploadedFile(null);
                      if (currentChat && currentChat.intentType && currentChat.intentType !== intent.type) {
                        toast.info('Task type changed. Next message will start a new chat.');
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
                      selectedIntent.type === intent.type
                        ? 'bg-gradient-gold text-black font-bold shadow-lg'
                        : 'bg-black-light border border-gold/30 text-gold hover:border-gold'
                    }`}
                  >
                    <span className="text-lg">{intent.icon}</span>
                    <span>{intent.label}</span>
                  </button>
                ))}
              </div>
              {(selectedIntent.type === 'vision' || selectedIntent.type === 'audio') && (
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    accept={selectedIntent.type === 'vision' ? 'image/*' : 'audio/*'}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20">
                    <span>📎</span>
                    <span>{uploadedFile ? uploadedFile.name : `Upload ${selectedIntent.type === 'vision' ? 'image' : 'audio'}`}</span>
                  </label>
                </div>
              )}
              {currentChat && currentChat.intentType && currentChat.intentType !== selectedIntent.type && (
                <div className="mt-2 text-sm text-yellow-400">
                  ⚠️ Current chat is for {
                    CHAT_INTENTS.find((i) => i.type === currentChat.intentType)?.label
                  }. Next message will create a new chat.
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {currentChat?.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 ${msg.role === 'user' ? 'flex justify-end' : ''}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'bg-white/10 border border-white/20'
                    }`}
                  >
                    {renderMessageContent(msg)}
                    {msg.role === 'assistant' && (
                      <div className="mt-2 text-xs text-gray-400">
                        {msg.provider} • {msg.model} • {msg.tokens} tokens • {msg.responseTime||100}ms
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Type your ${selectedIntent.label.toLowerCase()} request...`}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                  disabled={isLoading || (!message.trim() && !uploadedFile)}
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="w-64 bg-black/50 border-l border-white/10 p-4">
            <GlassCard className="p-4">
              <h2 className="text-xl font-bold mb-4">Your Stats</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-300">Points Balance</p>
                  <p className="text-2xl font-bold">{userStats?.points || 0}</p>
                </div>
                <div>
                  <p className="text-gray-300">Prompts Today</p>
                  <p className="text-xl">{userStats?.promptsToday || 0} / 50</p>
                </div>
                <div>
                  <p className="text-gray-300">Remaining Today</p>
                  <p className="text-xl text-green-400">{Math.max(0, 50 - (userStats?.promptsToday || 0))}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Add model info display */}
      {currentModelInfo && (
        <div className="text-xs text-gray-500 mt-1">
          Using: {currentModelInfo.name}
          {currentModelInfo.contextLength && ` (${currentModelInfo.contextLength} tokens)`}
        </div>
      )}

      {/* Update points display */}
      <div className="text-sm text-gray-500">
        <p className="text-2xl font-bold">{userStats?.promptsRemaining || 50}</p>
      </div>
    </div>
  );
};

export default ChatPage;
