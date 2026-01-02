/**
 * Build script for Vercel deployment using the Build Output API
 * Creates the .vercel/output directory structure expected by Vercel
 * 
 * This approach is necessary because:
 * 1. We use bun workspaces with workspace:* dependencies
 * 2. Vercel can't resolve workspace:* protocol natively
 * 3. We need to bundle all dependencies into a single file
 */

import { $ } from "bun";
import { mkdir, writeFile, rm } from "fs/promises";
import { existsSync } from "fs";

const OUTPUT_DIR = ".vercel/output";
const FUNCTIONS_DIR = `${OUTPUT_DIR}/functions/api.func`;
const STATIC_DIR = `${OUTPUT_DIR}/static`;

async function build() {
  console.log("🔨 Building for Vercel...");

  // Clean previous output
  if (existsSync(OUTPUT_DIR)) {
    await rm(OUTPUT_DIR, { recursive: true });
  }

  // Create output directories
  await mkdir(FUNCTIONS_DIR, { recursive: true });
  await mkdir(STATIC_DIR, { recursive: true });

  // Bundle the application
  // Use vercel.ts entry point which wraps the app with @hono/node-server/vercel handler
  console.log("📦 Bundling application...");
  const result = await $`bun build src/vercel.ts --outfile=${FUNCTIONS_DIR}/index.js --target=node --format=esm --minify --external=pg-native`.quiet();
  
  if (result.exitCode !== 0) {
    console.error("❌ Bundle failed:", result.stderr.toString());
    process.exit(1);
  }
  
  console.log("✅ Bundle complete");

  // Create the Vercel Build Output config
  const config = {
    version: 3,
    routes: [
      // Health check routes
      { src: "/health", dest: "/api" },
      { src: "/ready", dest: "/api" },
      // API routes
      { src: "/api/(.*)", dest: "/api" },
      // Webhooks
      { src: "/webhooks/(.*)", dest: "/api" },
      // Catch-all
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/api" }
    ]
  };
  
  await writeFile(`${OUTPUT_DIR}/config.json`, JSON.stringify(config, null, 2));
  console.log("✅ Created config.json");

  // Create function config (.vc-config.json)
  // Using Node.js runtime with the @hono/node-server/vercel handler
  const functionConfig = {
    runtime: "nodejs20.x",
    handler: "index.default",
    launcherType: "Nodejs",
    shouldAddHelpers: false,
    shouldAddSourcemapSupport: false,
    supportsResponseStreaming: true
  };
  
  await writeFile(`${FUNCTIONS_DIR}/.vc-config.json`, JSON.stringify(functionConfig, null, 2));
  console.log("✅ Created function config");

  // Create package.json for ES module support in the function directory
  // This is required for Node.js to recognize the ESM syntax
  const functionPackageJson = {
    type: "module"
  };
  
  await writeFile(`${FUNCTIONS_DIR}/package.json`, JSON.stringify(functionPackageJson, null, 2));
  console.log("✅ Created function package.json");

  // Create a placeholder static file (required for static directory)
  await writeFile(`${STATIC_DIR}/.gitkeep`, "");

  console.log("🎉 Build complete!");
  console.log(`   Output: ${OUTPUT_DIR}`);
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
