/**
 * Vercel entry point for the API
 * Exports a standard Vercel serverless function handler
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "./index";

// Convert Vercel request to standard Request
function toRequest(req: VercelRequest): Request {
  const url = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  // Add body for non-GET/HEAD requests
  if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
    if (typeof req.body === "string") {
      init.body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      init.body = req.body;
    } else {
      init.body = JSON.stringify(req.body);
    }
  }

  return new Request(url.toString(), init);
}

// Standard Vercel handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const request = toRequest(req);
    const response = await app.fetch(request);
    
    // Set status
    res.status(response.status);
    
    // Set headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    // Send body
    const body = await response.text();
    res.send(body);
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
