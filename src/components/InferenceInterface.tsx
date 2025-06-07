import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAccount } from 'wagmi';
import GlassCard from "./GlassCard";
import { toast } from "react-hot-toast";

const InferenceInterface: React.FC = () => {
  const { address } = useAccount();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<any>(null);

  const userStats = useQuery(api.userPoints.getUserStats, address ? { address } : "skip");
  const userPoints = useQuery(api.userPoints.getUserPoints, address ? { address } : "skip");
  const routeInference = useAction(api.inference.route);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !prompt) return;

    try {
      const result = await routeInference({
        prompt,
        address
      });

      setResponse(result);
      setPrompt("");
      toast.success(`Response from ${result.provider}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process prompt");
    }
  };

  const points = userPoints ?? 0;
  const canSubmit = points > 0;

  return (
    <GlassCard>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Inference Interface</h2>
        <div className="mb-4">
          <p>Available Points: {points}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-2 border rounded"
            rows={4}
            placeholder="Enter your prompt..."
            disabled={!canSubmit}
          />
          <button
            type="submit"
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            disabled={!canSubmit}
          >
            Submit
          </button>
        </form>
        {response && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <pre>{JSON.stringify(response, null, 2)}</pre>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default InferenceInterface;
