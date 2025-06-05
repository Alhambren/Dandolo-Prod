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
  const routeInference = useAction(api.inference.route);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Check daily limit
    if ((userStats?.promptsToday || 0) >= 50) {
      toast.error("Daily limit reached (50 prompts). Try again tomorrow!");
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

  // Rest of the component remains the same
  // ...
}
