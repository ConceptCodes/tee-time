/**
 * Retry utilities with exponential backoff for resilient LLM calls.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Whether to add jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** Function to determine if error is retryable (default: all errors retryable) */
  isRetryable?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
  isRetryable: () => true,
};

/**
 * Executes a function with retry logic and exponential backoff.
 * 
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Result of the function
 * @throws Last error if all retries exhausted
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => generateObject({ model, schema, prompt }),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if error is not retryable
      if (!opts.isRetryable(error)) {
        throw lastError;
      }

      // Don't retry if this was the last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const exponentialDelay = opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt);
      let delay = Math.min(exponentialDelay, opts.maxDelay);

      // Add jitter to prevent thundering herd
      if (opts.jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }

      console.warn(
        `Retry attempt ${attempt + 1}/${opts.maxRetries} after ${Math.round(delay)}ms:`,
        lastError.message
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms to wait before attempting recovery (default: 60000) */
  resetTimeout?: number;
  /** Number of successful calls needed to close circuit (default: 2) */
  successThreshold?: number;
}

/**
 * Circuit breaker implementation to prevent cascading failures.
 * 
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker(
 *   () => callLLMAPI(),
 *   { failureThreshold: 5, resetTimeout: 60000 }
 * );
 * 
 * const result = await breaker.execute();
 * ```
 */
export class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(
    private readonly fn: () => Promise<T>,
    options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 60000,
      successThreshold: options.successThreshold ?? 2,
    };
  }

  async execute(): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Try to recover
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await this.fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        console.log('Circuit breaker CLOSED - service recovered');
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.resetTimeout;
      console.error(
        `Circuit breaker OPEN - too many failures (${this.failureCount}). ` +
        `Will retry at ${new Date(this.nextAttempt).toISOString()}`
      );
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }
}

/**
 * Combines retry logic with circuit breaker for maximum resilience.
 * 
 * NOTE: This creates a new CircuitBreaker instance per call, meaning circuit
 * state is not preserved across calls. This provides per-request isolation
 * but does not protect against repeated failures across different requests.
 * For shared circuit state, create a single CircuitBreaker instance and reuse it.
 * 
 * @example
 * ```typescript
 * const result = await withRetryAndCircuitBreaker(
 *   () => generateObject({ model, schema, prompt }),
 *   { maxRetries: 3 },
 *   { failureThreshold: 5 }
 * );
 * ```
 */
export async function withRetryAndCircuitBreaker<T>(
  fn: () => Promise<T>,
  retryOptions: RetryOptions = {},
  circuitOptions: CircuitBreakerOptions = {}
): Promise<T> {
  const breaker = new CircuitBreaker(fn, circuitOptions);
  return withRetry(() => breaker.execute(), retryOptions);
}
