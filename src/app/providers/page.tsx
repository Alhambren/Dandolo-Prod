"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export default function ProvidersPage() {
  const cleanupData = useMutation(api.providers.cleanupAllBadData);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Providers</h1>
      
      <button
        onClick={async () => {
          try {
            const result = await cleanupData();
            console.log("Cleanup result:", result);
            toast.success(`Cleaned up: ${JSON.stringify(result)}`);
          } catch (error) {
            toast.error("Cleanup failed: " + (error instanceof Error ? error.message : "Unknown error"));
          }
        }}
        className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
      >
        🧹 Run Cleanup
      </button>
    </div>
  );
} 