/**
 * Advanced Connection Pool Management
 * 
 * Provides intelligent connection pooling, load balancing,
 * and resource optimization for high-performance applications.
 */

import { EventEmitter } from 'eventemitter3';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { createDandoloError } from '../errors';
import { DandoloConfig } from '../types';

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxRetries: number;
  healthCheckInterval: number;
  loadBalancing: 'round_robin' | 'least_connections' | 'random' | 'weighted';
  weights?: number[];
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerResetTime: number;
}

export interface ConnectionStats {
  total: number;
  active: number;
  idle: number;
  failed: number;
  created: number;
  destroyed: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
}

export interface PooledConnection {
  id: string;
  client: AxiosInstance;
  created: Date;
  lastUsed: Date;
  requestCount: number;
  errorCount: number;
  isHealthy: boolean;
  isActive: boolean;
  responseTimeHistory: number[];
}

/**
 * High-performance connection pool with intelligent load balancing
 */
export class ConnectionPool extends EventEmitter {
  private connections: Map<string, PooledConnection> = new Map();
  private config: Required<ConnectionPoolConfig>;
  private stats: ConnectionStats;
  private healthCheckTimer?: NodeJS.Timeout;
  private currentIndex = 0;
  private circuitBreakerOpen = false;
  private circuitBreakerTimer?: NodeJS.Timeout;
  private requestQueue: Array<{
    resolve: (connection: PooledConnection) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(
    private baseConfig: DandoloConfig,
    config: Partial<ConnectionPoolConfig> = {}
  ) {
    super();

    this.config = {
      maxConnections: 10,
      minConnections: 2,
      connectionTimeout: 30000,
      idleTimeout: 300000, // 5 minutes
      maxRetries: 3,
      healthCheckInterval: 60000, // 1 minute
      loadBalancing: 'round_robin',
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerResetTime: 60000,
      ...config
    };

    this.stats = {
      total: 0,
      active: 0,
      idle: 0,
      failed: 0,
      created: 0,
      destroyed: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0
    };

    this.initialize();
  }

  /**
   * Initialize the connection pool
   */
  private async initialize(): Promise<void> {
    // Create minimum connections
    const promises = Array.from({ length: this.config.minConnections }, () =>
      this.createConnection()
    );

    await Promise.allSettled(promises);

    // Start health check timer
    this.startHealthCheck();

    this.emit('initialized', {
      connections: this.connections.size,
      config: this.config
    });
  }

  /**
   * Get a connection from the pool
   */
  async getConnection(): Promise<PooledConnection> {
    // Check circuit breaker
    if (this.circuitBreakerOpen) {
      throw createDandoloError({
        response: {
          status: 503,
          data: {
            error: {
              message: 'Circuit breaker is open. Service temporarily unavailable.',
              type: 'server_error',
              code: 'circuit_breaker_open'
            }
          }
        }
      });
    }

    // Try to get an available connection
    let connection = this.selectConnection();

    if (!connection) {
      // No available connections, try to create a new one
      if (this.connections.size < this.config.maxConnections) {
        connection = await this.createConnection();
      } else {
        // Pool is full, wait for a connection to become available
        connection = await this.waitForConnection();
      }
    }

    // Mark connection as active
    connection.isActive = true;
    connection.lastUsed = new Date();
    this.updateStats();

    return connection;
  }

  /**
   * Return a connection to the pool
   */
  releaseConnection(connection: PooledConnection): void {
    if (this.connections.has(connection.id)) {
      connection.isActive = false;
      connection.lastUsed = new Date();
      
      // Process queued requests
      if (this.requestQueue.length > 0) {
        const queued = this.requestQueue.shift();
        if (queued) {
          queued.resolve(connection);
          return;
        }
      }

      this.updateStats();
      this.emit('connection_released', connection.id);
    }
  }

  /**
   * Execute a request using the connection pool
   */
  async execute<T>(
    requestConfig: AxiosRequestConfig,
    retries = 0
  ): Promise<T> {
    const connection = await this.getConnection();
    const startTime = Date.now();

    try {
      const response = await connection.client.request(requestConfig);
      
      // Update connection metrics
      const responseTime = Date.now() - startTime;
      connection.responseTimeHistory.push(responseTime);
      if (connection.responseTimeHistory.length > 100) {
        connection.responseTimeHistory.shift();
      }
      
      connection.requestCount++;
      this.updateResponseTimeStats(responseTime);
      
      this.releaseConnection(connection);
      this.emit('request_completed', {
        connectionId: connection.id,
        responseTime,
        status: response.status
      });
      
      return response.data;

    } catch (error) {
      connection.errorCount++;
      
      // Check if connection is unhealthy
      if (connection.errorCount > 3) {
        connection.isHealthy = false;
        this.emit('connection_unhealthy', connection.id);
      }

      // Check circuit breaker
      this.checkCircuitBreaker();

      this.releaseConnection(connection);

      // Retry if configured
      if (retries < this.config.maxRetries && this.shouldRetry(error)) {
        await this.delay(Math.pow(2, retries) * 1000); // Exponential backoff
        return this.execute(requestConfig, retries + 1);
      }

      throw createDandoloError(error);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): ConnectionStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get detailed connection information
   */
  getConnectionInfo(): Array<{
    id: string;
    created: Date;
    lastUsed: Date;
    requestCount: number;
    errorCount: number;
    isHealthy: boolean;
    isActive: boolean;
    averageResponseTime: number;
  }> {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      created: conn.created,
      lastUsed: conn.lastUsed,
      requestCount: conn.requestCount,
      errorCount: conn.errorCount,
      isHealthy: conn.isHealthy,
      isActive: conn.isActive,
      averageResponseTime: conn.responseTimeHistory.length > 0
        ? conn.responseTimeHistory.reduce((a, b) => a + b) / conn.responseTimeHistory.length
        : 0
    }));
  }

  /**
   * Manually trigger pool optimization
   */
  async optimize(): Promise<void> {
    // Remove unhealthy connections
    const unhealthyConnections = Array.from(this.connections.values())
      .filter(conn => !conn.isHealthy);

    for (const conn of unhealthyConnections) {
      await this.destroyConnection(conn.id);
    }

    // Remove idle connections if we have more than minimum
    const idleConnections = Array.from(this.connections.values())
      .filter(conn => !conn.isActive && this.isIdle(conn))
      .sort((a, b) => a.lastUsed.getTime() - b.lastUsed.getTime());

    const excessConnections = Math.max(0, this.connections.size - this.config.minConnections);
    const toRemove = Math.min(excessConnections, idleConnections.length);

    for (let i = 0; i < toRemove; i++) {
      await this.destroyConnection(idleConnections[i].id);
    }

    // Ensure we have minimum connections
    while (this.connections.size < this.config.minConnections) {
      await this.createConnection();
    }

    this.emit('pool_optimized', {
      removed: unhealthyConnections.length + toRemove,
      total: this.connections.size
    });
  }

  /**
   * Gracefully shutdown the pool
   */
  async shutdown(): Promise<void> {
    // Stop health check
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    if (this.circuitBreakerTimer) {
      clearTimeout(this.circuitBreakerTimer);
    }

    // Wait for active connections to finish
    const maxWait = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.hasActiveConnections() && Date.now() - startTime < maxWait) {
      await this.delay(100);
    }

    // Force close all connections
    const connectionIds = Array.from(this.connections.keys());
    await Promise.all(
      connectionIds.map(id => this.destroyConnection(id))
    );

    this.emit('shutdown_complete');
  }

  /**
   * Create a new connection
   */
  private async createConnection(): Promise<PooledConnection> {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const client = axios.create({
      baseURL: this.baseConfig.baseURL,
      timeout: this.config.connectionTimeout,
      headers: {
        'Authorization': `Bearer ${this.baseConfig.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': `@dandolo/agent-sdk/1.0.0 (pool:${connectionId})`,
        ...this.baseConfig.headers
      }
    });

    const connection: PooledConnection = {
      id: connectionId,
      client,
      created: new Date(),
      lastUsed: new Date(),
      requestCount: 0,
      errorCount: 0,
      isHealthy: true,
      isActive: false,
      responseTimeHistory: []
    };

    this.connections.set(connectionId, connection);
    this.stats.created++;

    this.emit('connection_created', connectionId);
    return connection;
  }

  /**
   * Destroy a connection
   */
  private async destroyConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    this.connections.delete(connectionId);
    this.stats.destroyed++;

    this.emit('connection_destroyed', connectionId);
  }

  /**
   * Select the best available connection based on load balancing strategy
   */
  private selectConnection(): PooledConnection | null {
    const availableConnections = Array.from(this.connections.values())
      .filter(conn => !conn.isActive && conn.isHealthy);

    if (availableConnections.length === 0) {
      return null;
    }

    switch (this.config.loadBalancing) {
      case 'round_robin':
        return this.selectRoundRobin(availableConnections);
      
      case 'least_connections':
        return this.selectLeastConnections(availableConnections);
      
      case 'random':
        return this.selectRandom(availableConnections);
      
      case 'weighted':
        return this.selectWeighted(availableConnections);
      
      default:
        return availableConnections[0];
    }
  }

  private selectRoundRobin(connections: PooledConnection[]): PooledConnection {
    const connection = connections[this.currentIndex % connections.length];
    this.currentIndex++;
    return connection;
  }

  private selectLeastConnections(connections: PooledConnection[]): PooledConnection {
    return connections.reduce((prev, curr) => 
      curr.requestCount < prev.requestCount ? curr : prev
    );
  }

  private selectRandom(connections: PooledConnection[]): PooledConnection {
    return connections[Math.floor(Math.random() * connections.length)];
  }

  private selectWeighted(connections: PooledConnection[]): PooledConnection {
    // Simple weighted selection (can be enhanced)
    const weights = this.config.weights || connections.map(() => 1);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < connections.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return connections[i];
      }
    }
    
    return connections[0];
  }

  /**
   * Wait for a connection to become available
   */
  private async waitForConnection(): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.requestQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
        }
        reject(createDandoloError({
          response: {
            status: 408,
            data: {
              error: {
                message: 'Connection pool timeout',
                type: 'timeout_error',
                code: 'pool_timeout'
              }
            }
          }
        }));
      }, this.config.connectionTimeout);

      this.requestQueue.push({
        resolve: (connection) => {
          clearTimeout(timeout);
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  /**
   * Start health check timer
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on all connections
   */
  private async performHealthCheck(): Promise<void> {
    const healthCheckPromises = Array.from(this.connections.values())
      .filter(conn => !conn.isActive)
      .map(conn => this.checkConnectionHealth(conn));

    await Promise.allSettled(healthCheckPromises);
    
    // Optimize pool after health check
    await this.optimize();
  }

  /**
   * Check health of a specific connection
   */
  private async checkConnectionHealth(connection: PooledConnection): Promise<void> {
    try {
      const response = await connection.client.get('/health', { timeout: 5000 });
      connection.isHealthy = response.status === 200;
      
      if (connection.isHealthy && connection.errorCount > 0) {
        connection.errorCount = Math.max(0, connection.errorCount - 1);
      }
    } catch (error) {
      connection.errorCount++;
      connection.isHealthy = connection.errorCount < 3;
      
      this.emit('health_check_failed', {
        connectionId: connection.id,
        error: error
      });
    }
  }

  /**
   * Check and update circuit breaker status
   */
  private checkCircuitBreaker(): void {
    if (!this.config.enableCircuitBreaker) return;

    const recentErrors = Array.from(this.connections.values())
      .reduce((total, conn) => total + conn.errorCount, 0);

    if (recentErrors >= this.config.circuitBreakerThreshold && !this.circuitBreakerOpen) {
      this.circuitBreakerOpen = true;
      
      this.emit('circuit_breaker_opened', {
        errorCount: recentErrors,
        threshold: this.config.circuitBreakerThreshold
      });

      // Reset circuit breaker after timeout
      this.circuitBreakerTimer = setTimeout(() => {
        this.circuitBreakerOpen = false;
        this.emit('circuit_breaker_closed');
      }, this.config.circuitBreakerResetTime);
    }
  }

  /**
   * Update pool statistics
   */
  private updateStats(): void {
    const connections = Array.from(this.connections.values());
    
    this.stats.total = connections.length;
    this.stats.active = connections.filter(c => c.isActive).length;
    this.stats.idle = connections.filter(c => !c.isActive).length;
    this.stats.failed = connections.filter(c => !c.isHealthy).length;
    
    const totalRequests = connections.reduce((sum, c) => sum + c.requestCount, 0);
    const totalErrors = connections.reduce((sum, c) => sum + c.errorCount, 0);
    
    this.stats.errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
  }

  /**
   * Update response time statistics
   */
  private updateResponseTimeStats(responseTime: number): void {
    // Simple exponential moving average
    if (this.stats.averageResponseTime === 0) {
      this.stats.averageResponseTime = responseTime;
    } else {
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime * 0.9) + (responseTime * 0.1);
    }
  }

  /**
   * Check if a connection is idle
   */
  private isIdle(connection: PooledConnection): boolean {
    const idleTime = Date.now() - connection.lastUsed.getTime();
    return idleTime > this.config.idleTimeout;
  }

  /**
   * Check if there are active connections
   */
  private hasActiveConnections(): boolean {
    return Array.from(this.connections.values()).some(conn => conn.isActive);
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: any): boolean {
    if (!error.response) return true; // Network errors
    
    const status = error.response.status;
    return status >= 500 || status === 429; // Server errors or rate limits
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ConnectionPool;