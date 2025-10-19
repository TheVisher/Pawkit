export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryCondition?: (error: any) => boolean;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public lastError: any,
    public attempts: number
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    jitter = true,
    retryCondition = (error) => {
      // Retry on network errors, 5xx errors, and rate limiting
      if (error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT') {
        return true;
      }
      if (error?.status >= 500) {
        return true;
      }
      if (error?.status === 429) {
        return true;
      }
      return false;
    }
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's the last attempt or if retry condition is false
      if (attempt === maxAttempts || !retryCondition(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitteredDelay = jitter 
        ? delay + Math.random() * delay * 0.1 
        : delay;
      
      console.log(`[Retry] Attempt ${attempt} failed, retrying in ${Math.round(jitteredDelay)}ms:`, error);
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
  
  throw new RetryError(
    `Operation failed after ${maxAttempts} attempts`,
    lastError,
    maxAttempts
  );
}

/**
 * Retry with circuit breaker pattern
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold = 5,
    private timeout = 60000, // 1 minute
    private resetTimeout = 30000 // 30 seconds
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
  
  getState() {
    return this.state;
  }
  
  getFailures() {
    return this.failures;
  }
}

/**
 * Retry with rate limiting
 */
export class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests = 10,
    private windowMs = 60000 // 1 minute
  ) {}
  
  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`[RateLimiter] Waiting ${waitTime}ms for rate limit reset`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.waitForSlot();
      }
    }
    
    this.requests.push(now);
  }
}

/**
 * Combined retry with circuit breaker and rate limiting
 */
export async function withAdvancedRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions & {
    circuitBreaker?: CircuitBreaker;
    rateLimiter?: RateLimiter;
  } = {}
): Promise<T> {
  const { circuitBreaker, rateLimiter, ...retryOptions } = options;
  
  return withRetry(async () => {
    if (rateLimiter) {
      await rateLimiter.waitForSlot();
    }
    
    if (circuitBreaker) {
      return circuitBreaker.execute(fn);
    }
    
    return fn();
  }, retryOptions);
}
