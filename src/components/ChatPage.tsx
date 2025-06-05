import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { GlassCard } from "./GlassCard";

interface ChatPageProps {
  sessionId: string;
  walletAddress?: string;
}

interface Model {
  id: string;
  name: string;
  available: boolean;
  lastUpdated: number;
}

export function ChatPage({ sessionId, walletAddress }: ChatPageProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const userStats = useQuery(api.analytics.getSystemStats);
  const rateLimitStatus = useQuery(api.rateLimit.getRateLimitStatus, { sessionId });
  const models = useQuery(api.models.getAvailableModels);
  const refreshModels = useAction(api.models.refreshModelCache);
  const routeInference = useAction(api.inference.route);

  // Refresh models on mount
  useEffect(() => {
    const refreshModelList = async () => {
      try {
        await refreshModels();
        console.log("Models refreshed successfully");
      } catch (error) {
        console.error("Failed to refresh models:", error);
        toast.error("Failed to refresh available models");
      }
    };
    refreshModelList();
  }, [refreshModels]);

  // Debug log models
  useEffect(() => {
    if (models) {
      console.log("Available models:", models);
    }
  }, [models]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Check daily limit
    if (userStats && userStats.promptsToday >= 50) {
      toast.error("Daily prompt limit reached (50 prompts/day)");
      return;
    }

    // Check rate limit
    if (rateLimitStatus && rateLimitStatus.remaining <= 0) {
      const waitTime = Math.ceil((rateLimitStatus.resetTime - Date.now()) / 1000);
      toast.error(`Rate limited. Please wait ${waitTime} seconds`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await routeInference({
        prompt,
        model: selectedModel,
        walletAddress,
        sessionId,
      });

      setResponse(result.response);
      toast.success("Response received!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-red bg-clip-text text-transparent mb-4">
          AI Chat Interface
        </h1>
        <p className="text-gray-300">Your prompts are routed through our decentralized Venice.ai network</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stats Card */}
        <GlassCard>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Your Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Daily Prompts:</span>
                <span className="text-gold">{rateLimitStatus?.current || 0}/50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Remaining:</span>
                <span className="text-red">{rateLimitStatus?.remaining || 50}</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Chat Interface */}
        <GlassCard>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red"
                required
              >
                <option value="">Select a model...</option>
                {models?.map((model) => (
                  <option key={model.id} value={model.id} disabled={!model.available}>
                    {model.name} {model.available ? "" : "(Unavailable)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                placeholder="Enter your prompt here..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !prompt.trim() || !selectedModel}
              className="w-full primary-cta disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Submit Prompt"}
            </button>
          </form>
        </GlassCard>
      </div>

      {/* Response Display */}
      {response && (
        <GlassCard>
          <div className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Response</h3>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-gray-200 whitespace-pre-wrap">{response}</p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
