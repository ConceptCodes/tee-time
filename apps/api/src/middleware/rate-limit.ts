import { createMiddleware } from "hono/factory";
import type { Context } from "hono";

/**
 * Simple in-memory rate limiter.
 * For production, consider using Redis or a dedicated rate limiting service.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const requests = new Map<string, RateLimitRecord>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requests.entries()) {
    if (now > record.resetAt) {
      requests.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware.
 * 
 * @param maxRequests - Maximum number of requests allowed in the time window
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Hono middleware
 */
export const rateLimit = (maxRequests = 10, windowMs = 60000) =>
  createMiddleware(async (c: Context, next) => {
    // Get client identifier (IP address or API key)
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() 
      ?? c.req.header("x-real-ip")
      ?? "unknown";
    
    const now = Date.now();
    const record = requests.get(ip);

    if (!record || now > record.resetAt) {
      // New window
      requests.set(ip, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      c.header("Retry-After", retryAfter.toString());
      c.header("X-RateLimit-Limit", maxRequests.toString());
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", record.resetAt.toString());
      
      return c.json(
        { 
          error: "Too many requests",
          retryAfter: retryAfter
        },
        429
      );
    }

    // Increment counter
    record.count++;
    
    // Add rate limit headers
    c.header("X-RateLimit-Limit", maxRequests.toString());
    c.header("X-RateLimit-Remaining", (maxRequests - record.count).toString());
    c.header("X-RateLimit-Reset", record.resetAt.toString());

    await next();
  });

/**
 * Stricter rate limit for sensitive endpoints.
 */
export const strictRateLimit = () => rateLimit(5, 60000); // 5 requests per minute

/**
 * Lenient rate limit for public endpoints.
 */
export const lenientRateLimit = () => rateLimit(30, 60000); // 30 requests per minute
