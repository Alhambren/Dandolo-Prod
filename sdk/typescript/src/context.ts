/**
 * Advanced Context Management for Dandolo SDK
 * 
 * Provides intelligent conversation context management, memory persistence,
 * and context optimization that exceeds traditional AI context handling.
 */

import { EventEmitter } from 'eventemitter3';
import {
  ConversationContext,
  EnhancedChatMessage,
  ChatMessage,
  DandoloError
} from './types';
import { DandoloClient } from './client';
import { createDandoloError } from './errors';

export interface ContextSummary {
  id: string;
  original_message_count: number;
  summary_tokens: number;
  created_at: Date;
  summary: string;
  key_points: string[];
  entities: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface ContextAnalytics {
  total_messages: number;
  total_tokens: number;
  avg_message_length: number;
  conversation_duration: number;
  topic_distribution: Record<string, number>;
  engagement_score: number;
  complexity_score: number;
}

export interface ContextOptimizationResult {
  original_tokens: number;
  optimized_tokens: number;
  reduction_percentage: number;
  optimization_techniques: string[];
  preserved_information: string[];
}

/**
 * Advanced Context Management System
 * 
 * Provides intelligent context handling with memory, summarization,
 * and optimization capabilities
 */
export class ContextManager extends EventEmitter {
  private contexts: Map<string, ConversationContext> = new Map();
  private summaries: Map<string, ContextSummary> = new Map();
  private analytics: Map<string, ContextAnalytics> = new Map();

  constructor(private client: DandoloClient) {
    super();
  }

  /**
   * Create a new conversation context
   */
  createContext(settings?: ConversationContext['settings']): ConversationContext {
    const contextId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const context: ConversationContext = {
      id: contextId,
      messages: [],
      metadata: {
        created_at: new Date(),
        updated_at: new Date(),
        message_count: 0,
        total_tokens: 0,
        agent_id: this.client.configuration.agentId
      },
      settings: {
        max_messages: 100,
        max_tokens: 8000,
        auto_summarize: true,
        summarize_threshold: 6000,
        ...settings
      }
    };

    this.contexts.set(contextId, context);
    this.emit('context_created', context);
    
    return context;
  }

  /**
   * Get an existing context
   */
  getContext(contextId: string): ConversationContext | undefined {
    return this.contexts.get(contextId);
  }

  /**
   * Add a message to context with intelligent management
   */
  async addMessage(
    contextId: string,
    message: ChatMessage
  ): Promise<EnhancedChatMessage> {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw createDandoloError({
        response: {
          status: 404,
          data: {
            error: {
              message: `Context '${contextId}' not found`,
              type: 'validation_error',
              code: 'context_not_found'
            }
          }
        }
      });
    }

    const enhancedMessage: EnhancedChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date(),
      token_count: this.estimateTokens(message.content),
      context_id: contextId
    };

    // Add to context
    context.messages.push(enhancedMessage);
    context.metadata.message_count++;
    context.metadata.total_tokens += enhancedMessage.token_count || 0;
    context.metadata.updated_at = new Date();

    // Check if we need to optimize context
    if (context.settings?.auto_summarize && 
        context.metadata.total_tokens > (context.settings.summarize_threshold || 6000)) {
      await this.optimizeContext(contextId);
    }

    // Check message limits
    if (context.settings?.max_messages && 
        context.messages.length > context.settings.max_messages) {
      await this.trimContext(contextId);
    }

    this.emit('message_added', { contextId, message: enhancedMessage });
    this.updateAnalytics(context);

    return enhancedMessage;
  }

  /**
   * Optimize context using intelligent summarization
   */
  async optimizeContext(contextId: string): Promise<ContextOptimizationResult> {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw createDandoloError({
        response: {
          status: 404,
          data: {
            error: {
              message: `Context '${contextId}' not found`,
              type: 'validation_error',
              code: 'context_not_found'
            }
          }
        }
      });
    }

    const originalTokens = context.metadata.total_tokens;
    
    // Identify messages to summarize (keep recent ones)
    const keepRecentCount = 10;
    const messagesToSummarize = context.messages.slice(0, -keepRecentCount);
    const recentMessages = context.messages.slice(-keepRecentCount);

    if (messagesToSummarize.length === 0) {
      return {
        original_tokens: originalTokens,
        optimized_tokens: originalTokens,
        reduction_percentage: 0,
        optimization_techniques: [],
        preserved_information: []
      };
    }

    // Create summary
    const summary = await this.createSummary(messagesToSummarize);
    
    // Create summary message
    const summaryMessage: EnhancedChatMessage = {
      role: 'system',
      content: `[Context Summary] ${summary.summary}`,
      id: `summary_${Date.now()}`,
      created_at: new Date(),
      token_count: summary.summary_tokens,
      context_id: contextId,
      metadata: {
        is_summary: true,
        original_message_count: messagesToSummarize.length,
        key_points: summary.key_points
      }
    };

    // Replace old messages with summary
    context.messages = [summaryMessage, ...recentMessages];
    
    // Update metadata
    const newTokens = this.calculateTotalTokens(context.messages);
    context.metadata.total_tokens = newTokens;
    context.metadata.updated_at = new Date();

    // Store summary
    this.summaries.set(summary.id, summary);

    const result: ContextOptimizationResult = {
      original_tokens: originalTokens,
      optimized_tokens: newTokens,
      reduction_percentage: ((originalTokens - newTokens) / originalTokens) * 100,
      optimization_techniques: ['intelligent_summarization', 'recent_message_preservation'],
      preserved_information: summary.key_points
    };

    this.emit('context_optimized', { contextId, result });
    
    return result;
  }

  /**
   * Analyze conversation context
   */
  analyzeContext(contextId: string): ContextAnalytics {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw createDandoloError({
        response: {
          status: 404,
          data: {
            error: {
              message: `Context '${contextId}' not found`,
              type: 'validation_error',
              code: 'context_not_found'
            }
          }
        }
      });
    }

    const analytics = this.calculateAnalytics(context);
    this.analytics.set(contextId, analytics);
    
    return analytics;
  }

  /**
   * Search messages within context
   */
  searchMessages(
    contextId: string,
    query: string,
    options?: {
      limit?: number;
      role?: 'user' | 'assistant' | 'system';
      beforeDate?: Date;
      afterDate?: Date;
    }
  ): EnhancedChatMessage[] {
    const context = this.contexts.get(contextId);
    if (!context) return [];

    let results = context.messages.filter(message => {
      // Text search
      const matchesQuery = message.content.toLowerCase().includes(query.toLowerCase());
      
      // Role filter
      const matchesRole = !options?.role || message.role === options.role;
      
      // Date filters
      const matchesDateRange = (!options?.beforeDate || message.created_at! <= options.beforeDate) &&
                              (!options?.afterDate || message.created_at! >= options.afterDate);
      
      return matchesQuery && matchesRole && matchesDateRange;
    });

    // Apply limit
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get context statistics
   */
  getContextStats(contextId: string): {
    message_count: number;
    total_tokens: number;
    duration_minutes: number;
    optimization_count: number;
    last_activity: Date;
  } {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw createDandoloError({
        response: {
          status: 404,
          data: {
            error: {
              message: `Context '${contextId}' not found`,
              type: 'validation_error',
              code: 'context_not_found'
            }
          }
        }
      });
    }

    const duration = context.metadata.updated_at.getTime() - context.metadata.created_at.getTime();
    
    return {
      message_count: context.metadata.message_count,
      total_tokens: context.metadata.total_tokens,
      duration_minutes: Math.floor(duration / (1000 * 60)),
      optimization_count: this.summaries.size,
      last_activity: context.metadata.updated_at
    };
  }

  /**
   * Export context for external use
   */
  exportContext(contextId: string, format: 'json' | 'markdown' | 'txt' = 'json'): string {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw createDandoloError({
        response: {
          status: 404,
          data: {
            error: {
              message: `Context '${contextId}' not found`,
              type: 'validation_error',
              code: 'context_not_found'
            }
          }
        }
      });
    }

    switch (format) {
      case 'json':
        return JSON.stringify(context, null, 2);
      
      case 'markdown':
        return this.contextToMarkdown(context);
      
      case 'txt':
        return this.contextToText(context);
      
      default:
        return JSON.stringify(context, null, 2);
    }
  }

  /**
   * Clear context while preserving metadata
   */
  clearContext(contextId: string): boolean {
    const context = this.contexts.get(contextId);
    if (!context) return false;

    context.messages = [];
    context.metadata.message_count = 0;
    context.metadata.total_tokens = 0;
    context.metadata.updated_at = new Date();

    this.emit('context_cleared', { contextId });
    return true;
  }

  /**
   * Delete context completely
   */
  deleteContext(contextId: string): boolean {
    const deleted = this.contexts.delete(contextId);
    if (deleted) {
      this.summaries.delete(contextId);
      this.analytics.delete(contextId);
      this.emit('context_deleted', { contextId });
    }
    return deleted;
  }

  /**
   * List all contexts
   */
  listContexts(): Array<{
    id: string;
    message_count: number;
    total_tokens: number;
    created_at: Date;
    last_activity: Date;
  }> {
    return Array.from(this.contexts.values()).map(context => ({
      id: context.id,
      message_count: context.metadata.message_count,
      total_tokens: context.metadata.total_tokens,
      created_at: context.metadata.created_at,
      last_activity: context.metadata.updated_at
    }));
  }

  private async createSummary(messages: EnhancedChatMessage[]): Promise<ContextSummary> {
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    
    const summaryResponse = await this.client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert at summarizing conversations. Create a concise but comprehensive summary that preserves key information, decisions, and context.'
        },
        {
          role: 'user',
          content: `Please summarize this conversation, extracting key points, important entities, and overall sentiment:\n\n${conversation}`
        }
      ],
      model: this.client.configuration.defaultModel,
      temperature: 0.3,
      max_tokens: 500
    });

    const summaryContent = summaryResponse.choices[0]?.message.content || '';
    
    // Extract structured information (simplified)
    const keyPoints = this.extractKeyPoints(summaryContent);
    const entities = this.extractEntities(summaryContent);
    const sentiment = this.analyzeSentiment(summaryContent);

    return {
      id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      original_message_count: messages.length,
      summary_tokens: this.estimateTokens(summaryContent),
      created_at: new Date(),
      summary: summaryContent,
      key_points: keyPoints,
      entities: entities,
      sentiment
    };
  }

  private async trimContext(contextId: string): Promise<void> {
    const context = this.contexts.get(contextId);
    if (!context || !context.settings?.max_messages) return;

    const maxMessages = context.settings.max_messages;
    if (context.messages.length <= maxMessages) return;

    // Keep the most recent messages
    const messagesToRemove = context.messages.length - maxMessages;
    const removedMessages = context.messages.splice(0, messagesToRemove);
    
    // Update metadata
    const removedTokens = removedMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
    context.metadata.total_tokens -= removedTokens;
    context.metadata.message_count = context.messages.length;
    context.metadata.updated_at = new Date();

    this.emit('context_trimmed', { contextId, removedMessages: messagesToRemove });
  }

  private calculateAnalytics(context: ConversationContext): ContextAnalytics {
    const messages = context.messages;
    const totalTokens = context.metadata.total_tokens;
    const messageCount = messages.length;
    
    const avgMessageLength = messageCount > 0 
      ? messages.reduce((sum, msg) => sum + msg.content.length, 0) / messageCount
      : 0;
    
    const duration = context.metadata.updated_at.getTime() - context.metadata.created_at.getTime();
    
    // Simple topic distribution (word frequency)
    const topicDistribution = this.calculateTopicDistribution(messages);
    
    // Engagement score based on message frequency and length
    const engagementScore = this.calculateEngagementScore(messages, duration);
    
    // Complexity score based on vocabulary and sentence structure
    const complexityScore = this.calculateComplexityScore(messages);

    return {
      total_messages: messageCount,
      total_tokens: totalTokens,
      avg_message_length: avgMessageLength,
      conversation_duration: duration,
      topic_distribution: topicDistribution,
      engagement_score: engagementScore,
      complexity_score: complexityScore
    };
  }

  private updateAnalytics(context: ConversationContext): void {
    const analytics = this.calculateAnalytics(context);
    this.analytics.set(context.id, analytics);
    this.emit('analytics_updated', { contextId: context.id, analytics });
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 4 characters per token
    return Math.ceil(text.length / 4);
  }

  private calculateTotalTokens(messages: EnhancedChatMessage[]): number {
    return messages.reduce((sum, msg) => sum + (msg.token_count || this.estimateTokens(msg.content)), 0);
  }

  private extractKeyPoints(summary: string): string[] {
    // Simple key point extraction
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.slice(0, 5).map(s => s.trim());
  }

  private extractEntities(text: string): string[] {
    // Simple entity extraction (capitalized words)
    const words = text.split(/\s+/);
    const entities = words.filter(word => 
      /^[A-Z][a-z]+/.test(word) && word.length > 2
    );
    return [...new Set(entities)].slice(0, 10);
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'success', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'negative', 'failure', 'problem', 'issue'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateTopicDistribution(messages: EnhancedChatMessage[]): Record<string, number> {
    const wordCount: Record<string, number> = {};
    
    for (const message of messages) {
      const words = message.content.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      for (const word of words) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    }
    
    // Return top 10 words
    const sorted = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    return Object.fromEntries(sorted);
  }

  private calculateEngagementScore(messages: EnhancedChatMessage[], duration: number): number {
    if (messages.length === 0 || duration === 0) return 0;
    
    const messagesPerMinute = messages.length / (duration / (1000 * 60));
    const avgLength = messages.reduce((sum, msg) => sum + msg.content.length, 0) / messages.length;
    
    // Normalize to 0-100 scale
    return Math.min(100, (messagesPerMinute * 10) + (avgLength / 10));
  }

  private calculateComplexityScore(messages: EnhancedChatMessage[]): number {
    if (messages.length === 0) return 0;
    
    let totalComplexity = 0;
    
    for (const message of messages) {
      const sentences = message.content.split(/[.!?]+/).length;
      const words = message.content.split(/\s+/).length;
      const avgWordsPerSentence = words / Math.max(sentences, 1);
      
      // Simple complexity based on sentence length and vocabulary diversity
      const uniqueWords = new Set(message.content.toLowerCase().split(/\s+/)).size;
      const vocabularyDiversity = uniqueWords / Math.max(words, 1);
      
      totalComplexity += avgWordsPerSentence + (vocabularyDiversity * 50);
    }
    
    return Math.min(100, totalComplexity / messages.length);
  }

  private contextToMarkdown(context: ConversationContext): string {
    const lines = [
      `# Conversation Context: ${context.id}`,
      '',
      `**Created:** ${context.metadata.created_at.toISOString()}`,
      `**Updated:** ${context.metadata.updated_at.toISOString()}`,
      `**Messages:** ${context.metadata.message_count}`,
      `**Total Tokens:** ${context.metadata.total_tokens}`,
      '',
      '## Messages',
      ''
    ];

    for (const message of context.messages) {
      lines.push(`### ${message.role.charAt(0).toUpperCase() + message.role.slice(1)}`);
      lines.push('');
      lines.push(message.content);
      lines.push('');
      if (message.created_at) {
        lines.push(`*${message.created_at.toISOString()}*`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  private contextToText(context: ConversationContext): string {
    const lines = [
      `Conversation Context: ${context.id}`,
      `Created: ${context.metadata.created_at.toISOString()}`,
      `Updated: ${context.metadata.updated_at.toISOString()}`,
      `Messages: ${context.metadata.message_count}`,
      `Total Tokens: ${context.metadata.total_tokens}`,
      '',
      'Messages:',
      ''
    ];

    for (const message of context.messages) {
      lines.push(`[${message.role.toUpperCase()}] ${message.content}`);
      if (message.created_at) {
        lines.push(`  ${message.created_at.toISOString()}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

export default ContextManager;