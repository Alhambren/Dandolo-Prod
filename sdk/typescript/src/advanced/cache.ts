/**
 * Intelligent Caching System
 * 
 * Provides advanced caching with TTL, LRU eviction, compression,
 * and semantic similarity matching for AI responses.
 */

import { EventEmitter } from 'eventemitter3';
import { ChatMessage, ChatCompletionResponse, StreamingChunk } from '../types';
import { estimateTokens } from '../utils';

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  maxMemoryUsage: number; // in bytes
  compressionEnabled: boolean;
  compressionThreshold: number; // minimum size to compress
  semanticSimilarityThreshold: number; // 0-1 for similarity matching
  persistToDisk: boolean;
  diskCachePath?: string;
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'smart';
  backgroundCleanup: boolean;
  cleanupInterval: number;
}

export interface CacheEntry {
  key: string;
  value: any;
  createdAt: Date;
  expiresAt: Date;
  lastAccessed: Date;
  accessCount: number;
  size: number;
  compressed: boolean;
  tags: string[];
  metadata: {
    model?: string;
    tokenCount?: number;
    similarity?: number;
    requestHash?: string;
  };
}

export interface CacheStats {
  size: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  totalRequests: number;
  averageResponseTime: number;
  evictionCount: number;
  compressionRatio: number;
}

export interface SemanticCacheKey {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Advanced caching system with semantic similarity and intelligent eviction
 */
export class IntelligentCache extends EventEmitter {
  private cache: Map<string, CacheEntry> = new Map();
  private config: Required<CacheConfig>;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;
  private memoryUsage = 0;
  
  // Semantic similarity cache for finding similar requests
  private semanticIndex: Map<string, {
    embedding: number[];
    key: string;
    tokens: string[];
  }> = new Map();

  constructor(config: Partial<CacheConfig> = {}) {
    super();

    this.config = {
      maxSize: 1000,
      defaultTTL: 3600000, // 1 hour
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      compressionEnabled: true,
      compressionThreshold: 1024, // 1KB
      semanticSimilarityThreshold: 0.85,
      persistToDisk: false,
      evictionPolicy: 'smart',
      backgroundCleanup: true,
      cleanupInterval: 300000, // 5 minutes
      ...config
    };

    this.stats = {
      size: 0,
      memoryUsage: 0,
      hitRate: 0,
      missRate: 0,
      totalHits: 0,
      totalMisses: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      evictionCount: 0,
      compressionRatio: 0
    };

    this.initialize();
  }

  /**
   * Initialize the cache system
   */
  private initialize(): void {
    if (this.config.backgroundCleanup) {
      this.startBackgroundCleanup();
    }

    this.emit('initialized', { config: this.config });
  }

  /**
   * Get cached response with semantic similarity matching
   */
  async get(key: SemanticCacheKey): Promise<ChatCompletionResponse | null> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    // Try exact match first
    const exactKey = this.generateKey(key);
    let entry = this.cache.get(exactKey);

    if (entry && !this.isExpired(entry)) {
      entry.lastAccessed = new Date();
      entry.accessCount++;
      this.stats.totalHits++;
      this.updateHitRate();
      
      const value = this.decompress(entry);
      this.emit('cache_hit', { key: exactKey, type: 'exact' });
      
      return value;
    }

    // Try semantic similarity matching
    if (this.config.semanticSimilarityThreshold > 0) {
      const similarEntry = await this.findSimilarEntry(key);
      if (similarEntry) {
        similarEntry.lastAccessed = new Date();
        similarEntry.accessCount++;
        this.stats.totalHits++;
        this.updateHitRate();
        
        const value = this.decompress(similarEntry);
        this.emit('cache_hit', { 
          key: similarEntry.key, 
          type: 'semantic',
          similarity: similarEntry.metadata.similarity 
        });
        
        return value;
      }
    }

    this.stats.totalMisses++;
    this.updateHitRate();
    this.emit('cache_miss', { key: exactKey });
    
    return null;
  }

  /**
   * Set cached response with intelligent compression and metadata
   */
  async set(
    key: SemanticCacheKey, 
    value: ChatCompletionResponse,
    options: {
      ttl?: number;
      tags?: string[];
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const cacheKey = this.generateKey(key);
    const now = new Date();
    const ttl = options.ttl || this.config.defaultTTL;
    
    // Calculate size and compress if needed
    const serialized = JSON.stringify(value);
    const originalSize = Buffer.byteLength(serialized, 'utf8');
    const compressed = this.shouldCompress(originalSize);
    const finalData = compressed ? this.compress(serialized) : serialized;
    const finalSize = typeof finalData === 'string' 
      ? Buffer.byteLength(finalData, 'utf8')
      : finalData.length;

    // Check memory limits
    if (this.memoryUsage + finalSize > this.config.maxMemoryUsage) {
      await this.evictToMakeSpace(finalSize);
    }

    // Create cache entry
    const entry: CacheEntry = {
      key: cacheKey,
      value: finalData,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl),
      lastAccessed: now,
      accessCount: 0,
      size: finalSize,
      compressed,
      tags: options.tags || [],
      metadata: {
        model: key.model,
        tokenCount: value.usage?.total_tokens,
        requestHash: this.hashRequest(key),
        ...options.metadata
      }
    };

    // Store in cache
    this.cache.set(cacheKey, entry);
    this.memoryUsage += finalSize;
    
    // Update semantic index
    await this.updateSemanticIndex(key, cacheKey);
    
    // Update stats
    this.updateStats();
    
    this.emit('cache_set', { 
      key: cacheKey, 
      size: finalSize, 
      compressed,
      ttl 
    });

    // Check if we need to evict
    if (this.cache.size > this.config.maxSize) {
      await this.evict(1);
    }
  }

  /**
   * Cache streaming chunks with intelligent aggregation
   */
  async cacheStream(
    key: SemanticCacheKey,
    chunks: StreamingChunk[],
    finalResponse: ChatCompletionResponse,
    options: { ttl?: number; tags?: string[] } = {}
  ): Promise<void> {
    // Create a streaming cache entry
    const streamKey = this.generateKey({ ...key, stream: true });
    
    const streamData = {
      chunks,
      final: finalResponse,
      totalTokens: finalResponse.usage?.total_tokens,
      chunkCount: chunks.length
    };

    await this.set(key, finalResponse, options);
    
    // Also cache the streaming data separately
    const entry: CacheEntry = {
      key: streamKey,
      value: this.shouldCompress(JSON.stringify(streamData).length) 
        ? this.compress(JSON.stringify(streamData))
        : JSON.stringify(streamData),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (options.ttl || this.config.defaultTTL)),
      lastAccessed: new Date(),
      accessCount: 0,
      size: Buffer.byteLength(JSON.stringify(streamData), 'utf8'),
      compressed: this.shouldCompress(JSON.stringify(streamData).length),
      tags: [...(options.tags || []), 'streaming'],
      metadata: {
        model: key.model,
        tokenCount: finalResponse.usage?.total_tokens,
        type: 'stream'
      }
    };

    this.cache.set(streamKey, entry);
  }

  /**
   * Invalidate cache entries by tags or patterns
   */
  async invalidate(criteria: {
    tags?: string[];
    keyPattern?: RegExp;
    model?: string;
    olderThan?: Date;
  }): Promise<number> {
    let invalidatedCount = 0;
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      let shouldInvalidate = false;

      if (criteria.tags) {
        shouldInvalidate = criteria.tags.some(tag => entry.tags.includes(tag));
      }

      if (criteria.keyPattern && criteria.keyPattern.test(key)) {
        shouldInvalidate = true;
      }

      if (criteria.model && entry.metadata.model === criteria.model) {
        shouldInvalidate = true;
      }

      if (criteria.olderThan && entry.createdAt < criteria.olderThan) {
        shouldInvalidate = true;
      }

      if (shouldInvalidate) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      await this.delete(key);
      invalidatedCount++;
    }

    this.emit('cache_invalidated', { 
      count: invalidatedCount, 
      criteria 
    });

    return invalidatedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get detailed cache information
   */
  getInfo(): {
    entries: Array<{
      key: string;
      size: number;
      age: number;
      accessCount: number;
      tags: string[];
      model?: string;
      tokenCount?: number;
    }>;
    memoryUsage: number;
    hitRate: number;
  } {
    const entries = Array.from(this.cache.values()).map(entry => ({
      key: entry.key,
      size: entry.size,
      age: Date.now() - entry.createdAt.getTime(),
      accessCount: entry.accessCount,
      tags: entry.tags,
      model: entry.metadata.model,
      tokenCount: entry.metadata.tokenCount
    }));

    return {
      entries,
      memoryUsage: this.memoryUsage,
      hitRate: this.stats.hitRate
    };
  }

  /**
   * Manually trigger cache cleanup
   */
  async cleanup(): Promise<{
    expired: number;
    evicted: number;
    memoryFreed: number;
  }> {
    const beforeSize = this.cache.size;
    const beforeMemory = this.memoryUsage;

    // Remove expired entries
    const expired = await this.removeExpired();
    
    // Evict entries if over memory limit
    let evicted = 0;
    if (this.memoryUsage > this.config.maxMemoryUsage * 0.8) {
      evicted = await this.evict(Math.floor(this.cache.size * 0.1));
    }

    const memoryFreed = beforeMemory - this.memoryUsage;

    this.emit('cache_cleaned', { expired, evicted, memoryFreed });

    return { expired, evicted, memoryFreed };
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    const memory = this.memoryUsage;

    this.cache.clear();
    this.semanticIndex.clear();
    this.memoryUsage = 0;
    this.updateStats();

    this.emit('cache_cleared', { entriesRemoved: size, memoryFreed: memory });
  }

  /**
   * Gracefully shutdown the cache
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (this.config.persistToDisk) {
      await this.persistToDisk();
    }

    this.emit('shutdown');
  }

  /**
   * Generate cache key from request parameters
   */
  private generateKey(key: SemanticCacheKey & { stream?: boolean }): string {
    const keyData = {
      messages: key.messages.map(m => ({ role: m.role, content: m.content })),
      model: key.model,
      temperature: key.temperature,
      maxTokens: key.maxTokens,
      stream: key.stream || false
    };

    return `cache_${this.hashObject(keyData)}`;
  }

  /**
   * Find semantically similar cache entries
   */
  private async findSimilarEntry(key: SemanticCacheKey): Promise<CacheEntry | null> {
    if (this.semanticIndex.size === 0) return null;

    const queryTokens = this.tokenizeMessages(key.messages);
    const queryEmbedding = await this.generateEmbedding(queryTokens);

    let bestMatch: { entry: CacheEntry; similarity: number } | null = null;

    for (const [indexKey, indexData] of this.semanticIndex.entries()) {
      const similarity = this.calculateSimilarity(queryEmbedding, indexData.embedding);
      
      if (similarity >= this.config.semanticSimilarityThreshold) {
        const entry = this.cache.get(indexData.key);
        if (entry && !this.isExpired(entry)) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { entry, similarity };
            entry.metadata.similarity = similarity;
          }
        }
      }
    }

    return bestMatch?.entry || null;
  }

  /**
   * Update semantic index for similarity matching
   */
  private async updateSemanticIndex(key: SemanticCacheKey, cacheKey: string): Promise<void> {
    const tokens = this.tokenizeMessages(key.messages);
    const embedding = await this.generateEmbedding(tokens);
    
    const indexKey = this.hashRequest(key);
    this.semanticIndex.set(indexKey, {
      embedding,
      key: cacheKey,
      tokens
    });
  }

  /**
   * Tokenize messages for semantic analysis
   */
  private tokenizeMessages(messages: ChatMessage[]): string[] {
    return messages
      .map(m => m.content)
      .join(' ')
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  /**
   * Generate simple embedding (in production, use a proper embedding model)
   */
  private async generateEmbedding(tokens: string[]): Promise<number[]> {
    // Simple word frequency-based embedding (replace with proper embeddings)
    const vocab = Array.from(new Set(tokens));
    const embedding = new Array(100).fill(0);
    
    tokens.forEach((token, index) => {
      const hash = this.simpleHash(token);
      embedding[hash % 100] += 1;
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  /**
   * Calculate cosine similarity between embeddings
   */
  private calculateSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Remove expired entries
   */
  private async removeExpired(): Promise<number> {
    const now = new Date();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      await this.delete(key);
    }

    return toDelete.length;
  }

  /**
   * Evict entries based on policy
   */
  private async evict(count: number): Promise<number> {
    if (count <= 0) return 0;

    const entries = Array.from(this.cache.values());
    let toEvict: CacheEntry[] = [];

    switch (this.config.evictionPolicy) {
      case 'lru':
        toEvict = entries
          .sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime())
          .slice(0, count);
        break;

      case 'lfu':
        toEvict = entries
          .sort((a, b) => a.accessCount - b.accessCount)
          .slice(0, count);
        break;

      case 'ttl':
        toEvict = entries
          .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())
          .slice(0, count);
        break;

      case 'smart':
      default:
        // Smart eviction considers multiple factors
        toEvict = entries
          .map(entry => ({
            entry,
            score: this.calculateEvictionScore(entry)
          }))
          .sort((a, b) => a.score - b.score)
          .slice(0, count)
          .map(item => item.entry);
        break;
    }

    for (const entry of toEvict) {
      await this.delete(entry.key);
    }

    this.stats.evictionCount += toEvict.length;
    return toEvict.length;
  }

  /**
   * Calculate eviction score for smart eviction policy
   */
  private calculateEvictionScore(entry: CacheEntry): number {
    const now = Date.now();
    const age = now - entry.createdAt.getTime();
    const timeSinceAccess = now - entry.lastAccessed.getTime();
    const timeToExpiry = entry.expiresAt.getTime() - now;
    
    // Lower score means higher priority for eviction
    let score = 0;
    
    // Age factor (older entries more likely to be evicted)
    score += age / (24 * 60 * 60 * 1000); // Days
    
    // Access frequency factor (less accessed more likely to be evicted)
    score += 1 / Math.max(1, entry.accessCount);
    
    // Recency factor (least recently used more likely to be evicted)
    score += timeSinceAccess / (60 * 60 * 1000); // Hours
    
    // Size factor (larger entries more likely to be evicted)
    score += entry.size / (1024 * 1024); // MB
    
    // Time to expiry factor (soon to expire more likely to be evicted)
    if (timeToExpiry > 0) {
      score += 1 / (timeToExpiry / (60 * 60 * 1000)); // Hours
    } else {
      score += 1000; // Already expired, highest priority for eviction
    }
    
    return score;
  }

  /**
   * Evict entries to make space for new entry
   */
  private async evictToMakeSpace(requiredSize: number): Promise<void> {
    let freedSpace = 0;
    const entries = Array.from(this.cache.values())
      .map(entry => ({
        entry,
        score: this.calculateEvictionScore(entry)
      }))
      .sort((a, b) => b.score - a.score); // Highest score first (most eligible for eviction)

    for (const { entry } of entries) {
      if (freedSpace >= requiredSize) break;
      
      freedSpace += entry.size;
      await this.delete(entry.key);
    }
  }

  /**
   * Delete a cache entry
   */
  private async delete(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.memoryUsage -= entry.size;
      
      // Remove from semantic index
      const indexKey = entry.metadata.requestHash;
      if (indexKey) {
        this.semanticIndex.delete(indexKey);
      }
      
      this.emit('cache_delete', { key, size: entry.size });
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return new Date() > entry.expiresAt;
  }

  /**
   * Compress data if beneficial
   */
  private compress(data: string): Buffer | string {
    if (!this.config.compressionEnabled) return data;
    
    // Simple compression simulation (in production, use gzip/brotli)
    const compressed = Buffer.from(data, 'utf8');
    return compressed.length < data.length * 0.8 ? compressed : data;
  }

  /**
   * Decompress cached data
   */
  private decompress(entry: CacheEntry): any {
    if (entry.compressed && Buffer.isBuffer(entry.value)) {
      return JSON.parse(entry.value.toString('utf8'));
    }
    return typeof entry.value === 'string' ? JSON.parse(entry.value) : entry.value;
  }

  /**
   * Check if data should be compressed
   */
  private shouldCompress(size: number): boolean {
    return this.config.compressionEnabled && size >= this.config.compressionThreshold;
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.memoryUsage;
    
    if (this.config.compressionEnabled) {
      const uncompressedSize = Array.from(this.cache.values())
        .reduce((total, entry) => {
          if (entry.compressed) {
            return total + (entry.size * 1.25); // Estimate original size
          }
          return total + entry.size;
        }, 0);
      
      this.stats.compressionRatio = uncompressedSize > 0 
        ? this.memoryUsage / uncompressedSize 
        : 1;
    }
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = this.stats.totalHits / this.stats.totalRequests;
      this.stats.missRate = this.stats.totalMisses / this.stats.totalRequests;
    }
  }

  /**
   * Start background cleanup process
   */
  private startBackgroundCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => {
        this.emit('cleanup_error', error);
      });
    }, this.config.cleanupInterval);
  }

  /**
   * Persist cache to disk (placeholder implementation)
   */
  private async persistToDisk(): Promise<void> {
    if (!this.config.diskCachePath) return;
    
    // In production, implement actual disk persistence
    this.emit('persisted_to_disk', { 
      path: this.config.diskCachePath,
      entries: this.cache.size 
    });
  }

  /**
   * Hash an object for consistent key generation
   */
  private hashObject(obj: any): string {
    return this.simpleHash(JSON.stringify(obj)).toString(36);
  }

  /**
   * Hash a request for semantic indexing
   */
  private hashRequest(key: SemanticCacheKey): string {
    const content = key.messages.map(m => m.content).join('');
    return this.simpleHash(content).toString(36);
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

export default IntelligentCache;