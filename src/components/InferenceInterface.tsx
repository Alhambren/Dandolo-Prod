import { useState } from "react";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import GlassCard from "./GlassCard";
import { toast } from "sonner";

interface InferenceInterfaceProps {
  sessionId: string;
}

export function InferenceInterface({ sessionId }: InferenceInterfaceProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const userPoints = useQuery(api.points.getUserPoints, { sessionId });
  const routeInference = useAction(api.inference.route);
  const addPoints = useMutation(api.points.addUserPoints);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const result = await routeInference({
        prompt,
        sessionId,
      });
      setResponse(result);
      setPrompt("");
      toast.success(`Response from ${result.provider}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process prompt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyPoints = async () => {
    try {
      // Simulate buying $1 worth of points (100 points)
      await addPoints({
        sessionId,
        amount: 100,
        spent: 100, // $1.00 in cents
      });
      toast.success("Added 100 points to your account!");
    } catch (error) {
      toast.error("Failed to add points");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
          AI Chat Interface
        </h1>
        <p className="text-gray-300">
          Your prompts are automatically routed to the best available provider
        </p>
      </div>

      {/* Points Display */}
      <GlassCard>
        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-purple-400">{userPoints || 0} Points</div>
            <div className="text-gray-300">1 point = 1 prompt</div>
          </div>
          <button
            onClick={handleBuyPoints}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all"
          >
            Buy 100 Points ($1)
          </button>
        </div>
      </GlassCard>

      {/* Chat Interface */}
      <GlassCard>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Ask anything... Your prompt will be routed to the best available AI provider"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !prompt.trim() || (userPoints || 0) < 1}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? "Processing..." : `Send Prompt (1 point)`}
            </button>
          </form>
        </div>
      </GlassCard>

      {/* Response */}
      {response && (
        <GlassCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Response</h3>
              <div className="text-sm text-gray-400">
                Provider: {response.provider} • {response.responseTime}ms • {response.tokens} tokens
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-gray-200 whitespace-pre-wrap">{response.response}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Info */}
      <GlassCard>
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">1</span>
              </div>
              <div className="text-white font-semibold mb-2">Submit Prompt</div>
              <div className="text-sm text-gray-400">Your prompt is received and validated</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">2</span>
              </div>
              <div className="text-white font-semibold mb-2">Route to Provider</div>
              <div className="text-sm text-gray-400">Best provider selected based on performance</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold">3</span>
              </div>
              <div className="text-white font-semibold mb-2">Get Response</div>
              <div className="text-sm text-gray-400">AI response delivered back to you</div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
