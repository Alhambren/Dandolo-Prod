import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

// Add cleanup mutation
const cleanupData = useMutation(api.providers.cleanupAllBadData);

// Add cleanup button in the UI
<button 
  onClick={async () => {
    const result = await cleanupData();
    console.log("Cleanup result:", result);
    toast.success(`Cleaned up: ${JSON.stringify(result)}`);
  }}
  className="bg-red-500 text-white px-4 py-2 rounded"
>
  Run Cleanup
</button> 