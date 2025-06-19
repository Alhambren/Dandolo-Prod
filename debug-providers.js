// Simple script to check provider status
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient("https://good-monitor-677.convex.cloud");

async function checkProviders() {
  try {
    console.log("Checking providers...");
    const count = await convex.mutation("debug:listAllProvidersWithKeys");
    console.log(`Total providers: ${count}`);
  } catch (error) {
    console.error("Error checking providers:", error);
  }
}

checkProviders(); 