import { runAutoSync } from "../src/lib/delivery/auto-sync";

async function main() {
  console.log("Starting AutoSync test...");
  try {
    const logs = await runAutoSync();
    console.log("AutoSync finished successfully.");
    console.log("Logs generated:", logs.length);
    console.log(logs);
  } catch (error) {
    console.error("AutoSync failed with error:", error);
  }
}

main().catch(console.error);
