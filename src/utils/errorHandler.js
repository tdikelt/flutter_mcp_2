export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.successCount = 0;
    this.requestCount = 0;
  }

  async execute(fn, fallback = null) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker is OPEN. Service unavailable until ${new Date(this.nextAttemptTime).toISOString()}`);
      }
      // Try half-open
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.successCount++;
    this.requestCount++;
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  onFailure() {
    this.failures++;
    this.requestCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
    }
  }

  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
      requestCount: this.requestCount,
      successRate: this.requestCount > 0 ? (this.successCount / this.requestCount) * 100 : 0,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.successCount = 0;
    this.requestCount = 0;
  }
}

export class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 1000;
    this.maxDelay = options.maxDelay || 10000;
    this.factor = options.factor || 2;
    this.jitter = options.jitter || true;
  }

  async execute(fn, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          console.error(`Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw new Error(`Failed after ${this.maxRetries + 1} attempts: ${lastError.message}`);
  }

  calculateDelay(attempt) {
    let delay = Math.min(
      this.initialDelay * Math.pow(this.factor, attempt),
      this.maxDelay
    );
    
    if (this.jitter) {
      // Add random jitter to prevent thundering herd
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class ErrorLogger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'error';
    this.errors = [];
    this.maxErrorHistory = options.maxErrorHistory || 100;
  }

  log(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      type: error.constructor.name
    };

    this.errors.push(errorEntry);
    
    // Keep error history bounded
    if (this.errors.length > this.maxErrorHistory) {
      this.errors.shift();
    }

    // Log to console based on level
    if (this.logLevel === 'error' || this.logLevel === 'warn' || this.logLevel === 'info') {
      console.error(`[ERROR] ${errorEntry.timestamp}: ${error.message}`, context);
    }

    return errorEntry;
  }

  getRecentErrors(count = 10) {
    return this.errors.slice(-count);
  }

  getErrorStats() {
    const stats = {};
    
    this.errors.forEach(error => {
      const type = error.type;
      stats[type] = (stats[type] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byType: stats,
      recent: this.getRecentErrors(5)
    };
  }

  clear() {
    this.errors = [];
  }
}

// Error types
export class NetworkError extends Error {
  constructor(message, statusCode = null) {
    super(message);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
  }
}

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class TimeoutError extends Error {
  constructor(message, timeout = null) {
    super(message);
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}

// Global error handler with retry and circuit breaker
export class RobustErrorHandler {
  constructor() {
    this.circuitBreakers = new Map();
    this.retryHandler = new RetryHandler();
    this.errorLogger = new ErrorLogger();
  }

  getCircuitBreaker(service) {
    if (!this.circuitBreakers.has(service)) {
      this.circuitBreakers.set(service, new CircuitBreaker());
    }
    return this.circuitBreakers.get(service);
  }

  async executeWithProtection(service, fn, options = {}) {
    const {
      fallback = null,
      retry = true,
      timeout = 30000
    } = options;

    const circuitBreaker = this.getCircuitBreaker(service);

    try {
      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new TimeoutError(`Operation timed out after ${timeout}ms`, timeout)), timeout);
      });

      const operation = async () => {
        return await circuitBreaker.execute(
          () => retry ? this.retryHandler.execute(fn) : fn(),
          fallback
        );
      };

      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      this.errorLogger.log(error, { service, options });
      throw error;
    }
  }

  getStatus() {
    const status = {};
    
    this.circuitBreakers.forEach((breaker, service) => {
      status[service] = breaker.getStatus();
    });

    return {
      services: status,
      errors: this.errorLogger.getErrorStats()
    };
  }
}

// Singleton instance
export const errorHandler = new RobustErrorHandler();

// Decorator for automatic error handling
export function withErrorHandling(service, options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      return errorHandler.executeWithProtection(
        service,
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}