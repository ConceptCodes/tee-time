/**
 * Security utilities for sanitizing user input and protecting against attacks.
 */

/**
 * Sanitizes user input to prevent prompt injection attacks.
 * Removes or neutralizes patterns commonly used in prompt injection.
 * 
 * @param input - Raw user input string
 * @returns Sanitized input safe for LLM prompts
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove potential prompt injection patterns
  const dangerousPatterns = [
    // Direct instruction attempts
    /ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|commands?)/gi,
    /disregard\s+(previous|all|above|prior)\s+(instructions?|prompts?|commands?)/gi,
    /forget\s+(previous|all|above|prior)\s+(instructions?|prompts?|commands?)/gi,
    
    // Role manipulation attempts
    /you\s+are\s+now/gi,
    /act\s+as\s+(if|a|an)/gi,
    /pretend\s+(you|to)\s+are/gi,
    /roleplay\s+as/gi,
    
    // System/Assistant role injection
    /system\s*:/gi,
    /assistant\s*:/gi,
    /\[system\]/gi,
    /\[assistant\]/gi,
    
    // Special tokens (common in various LLM APIs)
    /<\|.*?\|>/g,
    /\{system\}/gi,
    /\{assistant\}/gi,
    
    // Instruction override attempts
    /new\s+instructions?/gi,
    /updated\s+instructions?/gi,
    /override\s+instructions?/gi,
  ];

  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // Remove excessive whitespace and control characters
  sanitized = sanitized
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars except \t, \n, \r
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Limit length to prevent abuse
  const MAX_INPUT_LENGTH = 500;
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_INPUT_LENGTH);
  }

  return sanitized;
}

export type RedactionEntry = {
  token: string;
  value: string;
  type: 'email' | 'phone' | 'coordinates' | 'address';
};

export type RedactionResult = {
  redacted: string;
  redactions: RedactionEntry[];
  nextIndex: number;
};

const addressPattern =
  /\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,3}\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|parkway|pkwy)\b/gi;

const coordinatePattern =
  /\b-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}\b/g;

export const redactSensitiveText = (
  input: string,
  options?: { startIndex?: number }
): RedactionResult => {
  if (!input || typeof input !== 'string') {
    return { redacted: '', redactions: [], nextIndex: options?.startIndex ?? 1 };
  }

  let index = options?.startIndex ?? 1;
  const redactions: RedactionEntry[] = [];

  const replaceWithToken =
    (type: RedactionEntry['type']) => (value: string) => {
      const token = `[redacted-${type}-${index}]`;
      redactions.push({ token, value, type });
      index += 1;
      return token;
    };

  let redacted = input;
  redacted = redacted.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    replaceWithToken('email')
  );
  redacted = redacted.replace(
    /(\+?\d[\d\s().-]{7,}\d)/g,
    replaceWithToken('phone')
  );
  redacted = redacted.replace(
    coordinatePattern,
    replaceWithToken('coordinates')
  );
  redacted = redacted.replace(
    addressPattern,
    replaceWithToken('address')
  );

  return { redacted, redactions, nextIndex: index };
};

/**
 * Validates that user input doesn't contain suspicious patterns.
 * Returns true if input appears safe, false otherwise.
 * 
 * @param input - User input to validate
 * @returns true if input appears safe
 */
export function isInputSafe(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Check for excessive special characters (potential injection)
  const specialCharRatio = (input.match(/[<>{}[\]|\\]/g) || []).length / input.length;
  if (specialCharRatio > 0.3) {
    return false;
  }

  // Check for suspicious encoding attempts
  const suspiciousPatterns = [
    /\\x[0-9a-f]{2}/gi, // Hex encoding
    /\\u[0-9a-f]{4}/gi, // Unicode encoding
    /&#\d+;/gi,         // HTML entity encoding
    /%[0-9a-f]{2}/gi,   // URL encoding
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitizes and validates user input in one call.
 * Throws an error if input is deemed unsafe.
 * 
 * @param input - User input to sanitize and validate
 * @returns Sanitized input
 * @throws Error if input is unsafe
 */
export function sanitizeAndValidate(input: string): string {
  const sanitized = sanitizeUserInput(input);
  
  if (!isInputSafe(input)) {
    throw new Error('Input contains suspicious patterns');
  }
  
  return sanitized;
}
