/**
 * Vercel entry point for the API
 * Uses @hono/node-server/vercel to handle Node.js runtime
 */
import { handle } from "@hono/node-server/vercel";
import app from "./index";

// Export the handler for Vercel Node.js runtime
export default handle(app);
