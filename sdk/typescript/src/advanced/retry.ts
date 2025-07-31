/**
 * Advanced Retry Mechanisms
 * 
 * Provides intelligent retry strategies with exponential backoff,
 * jitter, circuit breakers, and adaptive retry policies.
 */

import { EventEmitter } from 'eventemitter3';
import { DandoloError } from '../types';
import { createDandoloError, isRetryableError } from '../errors';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffStrategy: 'exponential' | 'linear' | 'constant' | 'adaptive';
  jitterStrategy: 'none' | 'uniform' | 'decorrelated' | 'equal';
  jitterMaxFactor: number;
  circuitBreakerEnabled: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerResetTime: number;
  adaptiveEnabled: boolean;
  adaptiveSuccessThreshold: number;
  adaptiveFailureThreshold: number;
  timeoutMultiplier: number;
  retryCondition?: (error: DandoloError, attempt: number) => boolean;
  onRetry?: (error: DandoloError, attempt: number, delay: number) => void;
  onSuccess?: (result: any, attempts: number) => void;
  onFinalFailure?: (error: DandoloError, attempts: number) => void;
}

export interface RetryStats {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  circuitBreakerTrips: number;
  averageAttempts: number;
  averageSuccessTime: number;
  currentSuccessRate: number;
  adaptiveDelayMultiplier: number;
}

export interface RetryContext {
  operation: string;
  startTime: Date;
  attempts: number;
  errors: DandoloError[];
  totalDelay: number;
  circuitBreakerOpen: boolean;
  adaptiveMultiplier: number;
}

/**
 * Advanced retry system with intelligent backoff and circuit breaking
 */
export class AdvancedRetryManager extends EventEmitter {
  private config: Required<RetryConfig>;
  private stats: RetryStats;
  private circuitBreakerState: Map<string, {
    failures: number;
    lastFailure: Date;
    isOpen: boolean;
    nextAttempt: Date;
  }> = new Map();
  
  // Adaptive retry tracking
  private adaptiveStats: Map<string, {
    recentSuccesses: number;
    recentFailures: number;
    successRate: number;
    averageResponseTime: number;
    delayMultiplier: number;
  }> = new Map();

  constructor(config: Partial<RetryConfig> = {}) {
    super();

    this.config = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffStrategy: 'exponential',
      jitterStrategy: 'uniform',
      jitterMaxFactor: 0.3,
      circuitBreakerEnabled: true,
      circuitBreakerThreshold: 5,
      circuitBreakerResetTime: 60000,
      adaptiveEnabled: true,
      adaptiveSuccessThreshold: 0.8,
      adaptiveFailureThreshold: 0.3,
      timeoutMultiplier: 1.5,
      ...config
    };

    this.stats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      circuitBreakerTrips: 0,
      averageAttempts: 0,
      averageSuccessTime: 0,
      currentSuccessRate: 0,
      adaptiveDelayMultiplier: 1.0
    };
  }

  /**
   * Execute operation with intelligent retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: {
      operationName?: string;
      timeout?: number;
      customConfig?: Partial<RetryConfig>;
    } = {}
  ): Promise<T> {
    const operationName = context.operationName || 'unknown';
    const config = { ...this.config, ...context.customConfig };
    
    // Check circuit breaker
    if (config.circuitBreakerEnabled && this.isCircuitBreakerOpen(operationName)) {
      const error = createDandoloError({
        response: {
          status: 503,
          data: {
            error: {
              message: 'Circuit breaker is open for this operation',
              type: 'server_error',
              code: 'circuit_breaker_open'
            }
          }
        }
      });
      
      this.emit('circuit_breaker_blocked', { operation: operationName, error });
      throw error;
    }

    const retryContext: RetryContext = {
      operation: operationName,
      startTime: new Date(),
      attempts: 0,
      errors: [],
      totalDelay: 0,
      circuitBreakerOpen: false,
      adaptiveMultiplier: this.getAdaptiveMultiplier(operationName)
    };

    return this.executeWithRetry(operation, config, retryContext, context.timeout);
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Required<RetryConfig>,
    context: RetryContext,
    timeout?: number
  ): Promise<T> {
    while (context.attempts < config.maxAttempts) {
      context.attempts++;
      this.stats.totalAttempts++;

      try {
        // Apply timeout if specified
        const result = timeout 
          ? await this.withTimeout(operation(), timeout * Math.pow(config.timeoutMultiplier, context.attempts - 1))
          : await operation();
        
        // Success - update stats and adaptive metrics
        this.handleSuccess(context, result);
        return result;

      } catch (error) {
        const dandoloError = createDandoloError(error);
        context.errors.push(dandoloError);
        
        // Check if we should retry
        const shouldRetry = this.shouldRetry(dandoloError, context.attempts, config);
        
        if (!shouldRetry || context.attempts >= config.maxAttempts) {
          this.handleFinalFailure(context, dandoloError, config);
          throw dandoloError;
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(context.attempts - 1, config, context);
        context.totalDelay += delay;
        
        this.emit('retry_attempt', {
          operation: context.operation,
          attempt: context.attempts,
          error: dandoloError,
          delay,
          totalDelay: context.totalDelay
        });

        config.onRetry?.(dandoloError, context.attempts, delay);
        
        await this.delay(delay);
      }
    }

    // This should never be reached, but just in case
    const finalError = context.errors[context.errors.length - 1];
    this.handleFinalFailure(context, finalError, config);
    throw finalError;
  }

  /**
   * Calculate retry delay based on strategy and context
   */
  private calculateDelay(
    attempt: number,
    config: Required<RetryConfig>,
    context: RetryContext
  ): number {
    let baseDelay = config.baseDelay;
    
    // Apply adaptive multiplier
    if (config.adaptiveEnabled) {
      baseDelay *= context.adaptiveMultiplier;
    }

    let delay: number;

    // Calculate base delay based on strategy
    switch (config.backoffStrategy) {
      case 'exponential':
        delay = baseDelay * Math.pow(2, attempt);
        break;
      
      case 'linear':
        delay = baseDelay * (attempt + 1);
        break;
      
      case 'constant':
        delay = baseDelay;
        break;
      
      case 'adaptive':
        delay = this.calculateAdaptiveDelay(context.operation, baseDelay, attempt);
        break;
      
      default:
        delay = baseDelay;
    }

    // Cap at max delay
    delay = Math.min(delay, config.maxDelay);

    // Apply jitter
    delay = this.applyJitter(delay, config);

    return Math.max(0, Math.floor(delay));
  }

  /**
   * Apply jitter to delay to avoid thundering herd
   */
  private applyJitter(delay: number, config: Required<RetryConfig>): number {
    const jitterAmount = delay * config.jitterMaxFactor;

    switch (config.jitterStrategy) {
      case 'uniform':
        return delay + (Math.random() * jitterAmount * 2 - jitterAmount);
      
      case 'decorrelated':
        return Math.random() * delay * 3;
      
      case 'equal':
        return delay + (Math.random() * jitterAmount);
      
      case 'none':
      default:
        return delay;
    }
  }

  /**
   * Calculate adaptive delay based on recent performance
   */
  private calculateAdaptiveDelay(
    operation: string,
    baseDelay: number,
    attempt: number
  ): number {
    const stats = this.adaptiveStats.get(operation);
    if (!stats) return baseDelay;

    // Increase delay if success rate is low
    if (stats.successRate < this.config.adaptiveFailureThreshold) {
      return baseDelay * Math.pow(2, attempt) * 2;
    }
    
    // Decrease delay if success rate is high
    if (stats.successRate > this.config.adaptiveSuccessThreshold) {
      return baseDelay * Math.pow(1.5, attempt);
    }
    
    // Normal exponential backoff
    return baseDelay * Math.pow(2, attempt);
  }

  /**
   * Get adaptive multiplier for operation
   */
  private getAdaptiveMultiplier(operation: string): number {
    if (!this.config.adaptiveEnabled) return 1.0;
    
    const stats = this.adaptiveStats.get(operation);
    return stats?.delayMultiplier || 1.0;
  }

  /**
   * Check if operation should be retried
   */
  private shouldRetry(
    error: DandoloError,
    attempt: number,
    config: Required<RetryConfig>
  ): boolean {
    // Custom retry condition takes precedence
    if (config.retryCondition) {
      return config.retryCondition(error, attempt);
    }

    // Don't retry if we've hit max attempts
    if (attempt >= config.maxAttempts) {
      return false;
    }

    // Use built-in retry logic
    return isRetryableError(error);
  }

  /**
   * Handle successful operation
   */
  private handleSuccess<T>(context: RetryContext, result: T): void {
    const duration = Date.now() - context.startTime.getTime();
    
    if (context.attempts > 1) {
      this.stats.successfulRetries++;
    }

    // Update adaptive stats
    this.updateAdaptiveStats(context.operation, true, duration);
    
    // Reset circuit breaker on success
    if (this.config.circuitBreakerEnabled) {
      this.resetCircuitBreaker(context.operation);
    }

    this.updateStats();
    
    this.emit('operation_success', {
      operation: context.operation,
      attempts: context.attempts,
      duration,
      totalDelay: context.totalDelay
    });

    this.config.onSuccess?.(result, context.attempts);
  }

  /**
   * Handle final failure
   */
  private handleFinalFailure(
    context: RetryContext,
    error: DandoloError,
    config: Required<RetryConfig>
  ): void {
    this.stats.failedRetries++;
    
    // Update adaptive stats
    const duration = Date.now() - context.startTime.getTime();
    this.updateAdaptiveStats(context.operation, false, duration);
    
    // Update circuit breaker
    if (config.circuitBreakerEnabled) {
      this.updateCircuitBreaker(context.operation);
    }

    this.updateStats();
    
    this.emit('operation_failed', {
      operation: context.operation,
      attempts: context.attempts,
      error,
      totalDelay: context.totalDelay,
      errors: context.errors
    });

    config.onFinalFailure?.(error, context.attempts);
  }

  /**
   * Check if circuit breaker is open for operation
   */
  private isCircuitBreakerOpen(operation: string): boolean {
    const state = this.circuitBreakerState.get(operation);
    if (!state) return false;

    if (state.isOpen) {
      // Check if it's time to try again
      if (Date.now() >= state.nextAttempt.getTime()) {
        state.isOpen = false;
        this.emit('circuit_breaker_half_open', { operation });
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Update circuit breaker state on failure
   */
  private updateCircuitBreaker(operation: string): void {
    let state = this.circuitBreakerState.get(operation);
    
    if (!state) {
      state = {
        failures: 0,
        lastFailure: new Date(),
        isOpen: false,
        nextAttempt: new Date()
      };
      this.circuitBreakerState.set(operation, state);
    }

    state.failures++;
    state.lastFailure = new Date();

    if (state.failures >= this.config.circuitBreakerThreshold && !state.isOpen) {
      state.isOpen = true;
      state.nextAttempt = new Date(Date.now() + this.config.circuitBreakerResetTime);
      this.stats.circuitBreakerTrips++;
      
      this.emit('circuit_breaker_opened', {
        operation,
        failures: state.failures,
        resetTime: state.nextAttempt
      });
    }
  }

  /**
   * Reset circuit breaker on success
   */
  private resetCircuitBreaker(operation: string): void {
    const state = this.circuitBreakerState.get(operation);
    if (state && (state.failures > 0 || state.isOpen)) {
      state.failures = 0;
      state.isOpen = false;
      
      this.emit('circuit_breaker_reset', { operation });
    }
  }

  /**
   * Update adaptive statistics
   */
  private updateAdaptiveStats(
    operation: string,
    success: boolean,
    duration: number
  ): void {
    if (!this.config.adaptiveEnabled) return;

    let stats = this.adaptiveStats.get(operation);
    
    if (!stats) {
      stats = {
        recentSuccesses: 0,
        recentFailures: 0,
        successRate: 0,
        averageResponseTime: 0,
        delayMultiplier: 1.0
      };
      this.adaptiveStats.set(operation, stats);
    }

    // Update success/failure counts (sliding window)
    if (success) {
      stats.recentSuccesses++;
      stats.averageResponseTime = (stats.averageResponseTime + duration) / 2;
    } else {
      stats.recentFailures++;
    }

    // Keep only recent data (last 100 operations)
    const total = stats.recentSuccesses + stats.recentFailures;
    if (total > 100) {
      const ratio = 100 / total;
      stats.recentSuccesses = Math.floor(stats.recentSuccesses * ratio);
      stats.recentFailures = Math.floor(stats.recentFailures * ratio);
    }

    // Calculate success rate
    const totalRecent = stats.recentSuccesses + stats.recentFailures;
    stats.successRate = totalRecent > 0 ? stats.recentSuccesses / totalRecent : 0;

    // Adjust delay multiplier based on success rate
    if (stats.successRate < this.config.adaptiveFailureThreshold) {
      stats.delayMultiplier = Math.min(stats.delayMultiplier * 1.2, 3.0);
    } else if (stats.successRate > this.config.adaptiveSuccessThreshold) {
      stats.delayMultiplier = Math.max(stats.delayMultiplier * 0.9, 0.5);
    }
  }

  /**
   * Update general statistics
   */
  private updateStats(): void {
    const totalOperations = this.stats.successfulRetries + this.stats.failedRetries;
    
    if (totalOperations > 0) {
      this.stats.currentSuccessRate = this.stats.successfulRetries / totalOperations;
      this.stats.averageAttempts = this.stats.totalAttempts / totalOperations;
    }

    // Calculate adaptive delay multiplier average
    const adaptiveStats = Array.from(this.adaptiveStats.values());
    if (adaptiveStats.length > 0) {
      this.stats.adaptiveDelayMultiplier = adaptiveStats.reduce(
        (sum, stat) => sum + stat.delayMultiplier, 0
      ) / adaptiveStats.length;
    }
  }

  /**
   * Get retry statistics
   */
  getStats(): RetryStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get detailed operation statistics
   */
  getOperationStats(): Array<{
    operation: string;
    successRate: number;
    averageResponseTime: number;
    delayMultiplier: number;
    circuitBreakerOpen: boolean;
    recentFailures: number;
  }> {
    const result: Array<{
      operation: string;
      successRate: number;
      averageResponseTime: number;
      delayMultiplier: number;
      circuitBreakerOpen: boolean;
      recentFailures: number;
    }> = [];

    for (const [operation, stats] of this.adaptiveStats.entries()) {
      const circuitState = this.circuitBreakerState.get(operation);
      
      result.push({
        operation,
        successRate: stats.successRate,
        averageResponseTime: stats.averageResponseTime,
        delayMultiplier: stats.delayMultiplier,
        circuitBreakerOpen: circuitState?.isOpen || false,
        recentFailures: stats.recentFailures
      });
    }

    return result;
  }

  /**
   * Reset statistics and circuit breakers
   */
  reset(): void {
    this.stats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      circuitBreakerTrips: 0,
      averageAttempts: 0,
      averageSuccessTime: 0,
      currentSuccessRate: 0,
      adaptiveDelayMultiplier: 1.0
    };

    this.circuitBreakerState.clear();
    this.adaptiveStats.clear();
    
    this.emit('stats_reset');
  }

  /**
   * Manually open circuit breaker for operation
   */
  openCircuitBreaker(operation: string, resetTime?: number): void {
    const state = this.circuitBreakerState.get(operation) || {
      failures: 0,
      lastFailure: new Date(),
      isOpen: false,
      nextAttempt: new Date()
    };

    state.isOpen = true;
    state.nextAttempt = new Date(
      Date.now() + (resetTime || this.config.circuitBreakerResetTime)
    );
    
    this.circuitBreakerState.set(operation, state);
    this.emit('circuit_breaker_manually_opened', { operation });
  }

  /**
   * Manually close circuit breaker for operation
   */
  closeCircuitBreaker(operation: string): void {
    const state = this.circuitBreakerState.get(operation);
    if (state) {
      state.isOpen = false;
      state.failures = 0;
      this.emit('circuit_breaker_manually_closed', { operation });
    }
  }

  /**
   * Add timeout to promise
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(createDandoloError({
            response: {
              status: 408,
              data: {
                error: {
                  message: `Operation timed out after ${timeoutMs}ms`,
                  type: 'timeout_error',
                  code: 'operation_timeout'
                }
              }
            }
          }));
        }, timeoutMs);
      })
    ]);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AdvancedRetryManager;