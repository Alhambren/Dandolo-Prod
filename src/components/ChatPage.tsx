import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { GlassCard } from "./GlassCard";
import { toast } from "sonner";

interface ChatPageProps {
  sessionId: string;
  walletAddress?: string;
}

export function ChatPage({ sessionId, walletAddress }: ChatPageProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [routingStatus, setRoutingStatus] = useState("");

  const userStats = useQuery(api.points.getUserStats, { sessionId });
  const rateLimitStatus = useQuery(api.rateLimit.getRateLimitStatus, { sessionId });
  const routeInference = useAction(api.inference.route);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Check daily limit
    if ((userStats?.promptsToday || 0) >= 50) {
      toast.error("Daily limit reached (50 prompts). Try again tomorrow!");
      return;
    }

    // Check rate limit
    if (!rateLimitStatus || rateLimitStatus.remaining <= 0) {
      const waitTime = rateLimitStatus ? Math.ceil((rateLimitStatus.resetTime - Date.now()) / 1000) : 0;
      toast.error(`Rate limit reached. Please wait ${waitTime} seconds.`);
      return;
    }

    setIsLoading(true);
    setRoutingStatus("Finding best provider...");
    
    try {
      const result = await routeInference({
        prompt,
        sessionId,
        walletAddress,
        model: selectedModel === "auto" ? undefined : selectedModel,
      });
      setResponse(result);
      setPrompt("");
      setRoutingStatus("");
      
      toast.success(`Response from ${result.provider} • Model: ${result.model || selectedModel}`);
    } catch (error) {
      setRoutingStatus("");
      toast.error(error instanceof Error ? error.message : "Failed to process prompt");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4">
      {/* User Stats */}
      <GlassCard className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Today's Usage</h3>
            <p className="text-sm text-gray-300">
              {userStats?.promptsToday || 0} / 50 prompts used
            </p>
          </div>
          {walletAddress && (
            <div className="text-right">
              <h3 className="text-lg font-semibold">Wallet Balance</h3>
              <p className="text-sm text-gray-300">
                {userStats?.points || 0} points
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Chat Interface */}
      <GlassCard className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-4">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-black/20 text-white border border-gray-700 rounded-lg px-4 py-2"
              disabled={isLoading}
            >
              <option value="auto">Auto-select Model</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            </select>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt..."
            className="w-full h-32 bg-black/20 text-white border border-gray-700 rounded-lg p-4 resize-none"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Processing..." : "Submit"}
          </button>
        </form>

        {routingStatus && (
          <div className="mt-4 text-center text-gray-300">
            {routingStatus}
          </div>
        )}
      </GlassCard>

      {/* Response Display */}
      {response && (
        <GlassCard className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>Provider: {response.provider}</span>
              <span>Model: {response.model || selectedModel}</span>
            </div>
            <div className="prose prose-invert max-w-none">
              {response.content}
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
