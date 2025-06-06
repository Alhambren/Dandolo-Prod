import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import GlassCard from './GlassCard';

const ChatPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const userStats = useQuery(api.points.getUserStats, { userId: undefined, sessionId: 'test-session' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle message submission
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white" data-testid="chat-page">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <GlassCard className="p-4 h-[600px] flex flex-col" data-testid="chat-container">
              <div className="flex-1 overflow-y-auto mb-4" data-testid="chat-messages">
                {/* Chat messages will go here */}
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  data-testid="chat-input"
                />
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
                  data-testid="send-button"
                >
                  Send
                </button>
              </form>
            </GlassCard>
          </div>

          <div>
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
                  <p className="text-gray-300">Points Today</p>
                  <p className="text-2xl font-bold">{userStats?.pointsToday || 0}</p>
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
