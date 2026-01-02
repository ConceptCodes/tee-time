/**
 * Build script for Vercel deployment
 * Bundles the API with all workspace dependencies into a single file
 * 
 * This approach is necessary because:
 * 1. We use bun workspaces with workspace:* dependencies
 * 2. Vercel can't resolve workspace:* protocol natively
 * 3. We need to bundle all dependencies into a single file
 */

import { $ } from "bun";
import { mkdir, rm } from "fs/promises";
import { existsSync } from "fs";

const OUTPUT_DIR = "api";

async function build() {
  console.log("🔨 Building for Vercel...");

  // Clean previous output
  if (existsSync(OUTPUT_DIR)) {
    await rm(OUTPUT_DIR, { recursive: true });
  }

  // Create output directory
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Bundle the application using vercel.ts entry point
  // Use node target since we need Node.js APIs (PostgreSQL)
  console.log("📦 Bundling application...");
  const result = await $`bun build src/vercel.ts --outfile=${OUTPUT_DIR}/index.mjs --target=node --format=esm --minify --external=pg-native`.quiet();
  
  if (result.exitCode !== 0) {
    console.error("❌ Bundle failed:", result.stderr.toString());
    process.exit(1);
  }
  
  console.log("✅ Bundle complete");
  console.log("🎉 Build complete!");
  console.log(`   Output: ${OUTPUT_DIR}/index.mjs`);
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
