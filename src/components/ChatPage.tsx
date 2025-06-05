import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { GlassCard } from "./GlassCard";

interface ChatPageProps {
  sessionId: string;
  walletAddress?: string;
}

interface Model {
  id: string;
  name: string;
}

export function ChatPage({ sessionId, walletAddress }: ChatPageProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const userStats = useQuery(api.analytics.getSystemStats);
  const rateLimitStatus = useQuery(api.rateLimit.getRateLimitStatus, { sessionId });
  const availableModels = useQuery(api.models.getAvailableModels) as Model[] | undefined;
  const routeInference = useAction(api.inference.route);

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
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* User Stats */}
        <GlassCard className="p-6">
          <h2 className="text-2xl font-bold mb-4">Your Stats</h2>
          <div className="space-y-2">
            <p>Daily Prompts: {userStats?.promptsToday || 0}/50</p>
            {walletAddress && (
              <p>Wallet Balance: {userStats?.totalVCU || 0} VCU</p>
            )}
          </div>
        </GlassCard>

        {/* Chat Interface */}
        <GlassCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="model" className="block text-sm font-medium mb-2">
                Select Model
              </label>
              <select
                id="model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2 rounded bg-white/10 border border-white/20"
                required
              >
                <option value="">Select a model...</option>
                {availableModels?.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prompt" className="block text-sm font-medium mb-2">
                Your Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-2 rounded bg-white/10 border border-white/20 min-h-[100px]"
                placeholder="Enter your prompt here..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Submit"}
            </button>
          </form>
        </GlassCard>

        {/* Response Display */}
        {response && (
          <GlassCard className="p-6 md:col-span-2">
            <h2 className="text-2xl font-bold mb-4">Response</h2>
            <div className="whitespace-pre-wrap">{response}</div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
