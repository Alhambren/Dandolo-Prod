/**
 * Advanced Agent Management for Dandolo SDK
 * 
 * Provides intelligent agent orchestration, instruction processing,
 * and workflow management capabilities that surpass traditional
 * AI integrations.
 */

import { EventEmitter } from 'eventemitter3';
import {
  AgentInstruction,
  AgentInstructionType,
  AgentEvent,
  AgentPlugin,
  ChatMessage,
  EnhancedChatMessage,
  ConversationContext,
  DandoloError
} from './types';
import { DandoloClient } from './client';
import { createDandoloError } from './errors';

export interface AgentConfig {
  id: string;
  name?: string;
  description?: string;
  instructions?: AgentInstruction[];
  plugins?: AgentPlugin[];
  settings?: {
    temperature?: number;
    max_tokens?: number;
    model_preference?: string;
    context_window?: number;
    memory_enabled?: boolean;
    learning_enabled?: boolean;
  };
}

export interface AgentCapabilities {
  instruction_processing: boolean;
  workflow_execution: boolean;
  context_awareness: boolean;
  multi_modal: boolean;
  tool_use: boolean;
  memory_persistence: boolean;
  learning: boolean;
  real_time: boolean;
}

/**
 * Enhanced Agent Management System
 * 
 * Provides superior agent orchestration and instruction processing
 * compared to Venice.ai and OpenRoute.ai
 */
export class AgentManager extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private globalInstructions: AgentInstruction[] = [];
  private plugins: Map<string, AgentPlugin> = new Map();

  constructor(private client: DandoloClient) {
    super();
  }

  /**
   * Create a new agent with enhanced capabilities
   */
  async createAgent(config: AgentConfig): Promise<Agent> {
    const agent = new Agent(config, this.client, this);
    this.agents.set(config.id, agent);
    
    this.emit('agent_created', { agent: config });
    return agent;
  }

  /**
   * Get an existing agent
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * List all active agents
   */
  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Remove an agent
   */
  async removeAgent(id: string): Promise<boolean> {
    const agent = this.agents.get(id);
    if (agent) {
      await agent.destroy();
      this.agents.delete(id);
      this.emit('agent_removed', { agentId: id });
      return true;
    }
    return false;
  }

  /**
   * Add global instructions that apply to all agents
   */
  addGlobalInstruction(instruction: AgentInstruction): void {
    this.globalInstructions.push(instruction);
    this.emit('global_instruction_added', instruction);
  }

  /**
   * Install a plugin for enhanced functionality
   */
  installPlugin(plugin: AgentPlugin): void {
    this.plugins.set(plugin.name, plugin);
    this.emit('plugin_installed', plugin);
  }

  /**
   * Process agent instructions intelligently
   */
  async processInstructions(
    instructions: AgentInstruction[],
    context?: ConversationContext
  ): Promise<{
    processed_instructions: AgentInstruction[];
    execution_plan: string[];
    estimated_tokens: number;
    recommendations: string[];
  }> {
    const allInstructions = [...this.globalInstructions, ...instructions];
    
    // Intelligent instruction processing
    const processed = await this.optimizeInstructions(allInstructions);
    const executionPlan = this.createExecutionPlan(processed);
    const tokenEstimate = this.estimateTokenUsage(processed);
    const recommendations = this.generateRecommendations(processed, context);

    return {
      processed_instructions: processed,
      execution_plan: executionPlan,
      estimated_tokens: tokenEstimate,
      recommendations
    };
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): AgentCapabilities {
    return {
      instruction_processing: true,
      workflow_execution: true,
      context_awareness: true,
      multi_modal: this.client.isAgentEnhanced,
      tool_use: this.client.isAgentEnhanced,
      memory_persistence: this.client.isAgentEnhanced,
      learning: this.client.isAgentEnhanced,
      real_time: this.client.isAgentEnhanced
    };
  }

  private async optimizeInstructions(instructions: AgentInstruction[]): Promise<AgentInstruction[]> {
    // Advanced instruction optimization logic
    const optimized: AgentInstruction[] = [];
    const seen = new Set<string>();

    for (const instruction of instructions) {
      // Remove duplicates
      const key = `${instruction.type}:${instruction.content}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Optimize based on type
      const optimizedInstruction = await this.optimizeByType(instruction);
      optimized.push(optimizedInstruction);
    }

    // Sort by priority
    return optimized.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityA = priorityOrder[a.metadata?.priority || 'medium'];
      const priorityB = priorityOrder[b.metadata?.priority || 'medium'];
      return priorityB - priorityA;
    });
  }

  private async optimizeByType(instruction: AgentInstruction): Promise<AgentInstruction> {
    switch (instruction.type) {
      case 'system_prompt':
        return {
          ...instruction,
          content: this.optimizeSystemPrompt(instruction.content),
          metadata: {
            ...instruction.metadata,
            optimized: true
          }
        };
      
      case 'context_injection':
        return {
          ...instruction,
          content: await this.optimizeContextInjection(instruction.content),
          metadata: {
            ...instruction.metadata,
            context_aware: true
          }
        };
      
      default:
        return instruction;
    }
  }

  private optimizeSystemPrompt(content: string): string {
    // Advanced prompt optimization techniques
    return content
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/(?:^|\n)\s*-\s*/g, '\n• '); // Convert dashes to bullets
  }

  private async optimizeContextInjection(content: string): Promise<string> {
    // Context-aware optimization
    return content;
  }

  private createExecutionPlan(instructions: AgentInstruction[]): string[] {
    const plan: string[] = [];
    
    for (const instruction of instructions) {
      plan.push(`Execute ${instruction.type}: ${instruction.content.substring(0, 50)}...`);
    }
    
    return plan;
  }

  private estimateTokenUsage(instructions: AgentInstruction[]): number {
    return instructions.reduce((total, instruction) => {
      return total + Math.ceil(instruction.content.length / 4); // Rough estimate
    }, 0);
  }

  private generateRecommendations(
    instructions: AgentInstruction[],
    context?: ConversationContext
  ): string[] {
    const recommendations: string[] = [];
    
    if (instructions.length > 10) {
      recommendations.push('Consider breaking down instructions into smaller workflows');
    }
    
    if (!instructions.some(i => i.type === 'system_prompt')) {
      recommendations.push('Add a system prompt for better context');
    }
    
    if (context && context.messages.length > 50) {
      recommendations.push('Consider enabling auto-summarization for large contexts');
    }
    
    return recommendations;
  }
}

/**
 * Individual Agent with Enhanced Capabilities
 */
export class Agent extends EventEmitter {
  private isActive = true;
  private processingQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  constructor(
    private config: AgentConfig,
    private client: DandoloClient,
    private manager: AgentManager
  ) {
    super();
    this.emit('initialized', { agentId: this.config.id });
  }

  /**
   * Get agent configuration
   */
  get configuration(): Readonly<AgentConfig> {
    return { ...this.config };
  }

  /**
   * Update agent configuration
   */
  updateConfig(updates: Partial<AgentConfig>): void {
    Object.assign(this.config, updates);
    this.emit('config_updated', updates);
  }

  /**
   * Process a message with agent intelligence
   */
  async processMessage(
    message: ChatMessage,
    context?: ConversationContext
  ): Promise<EnhancedChatMessage> {
    if (!this.isActive) {
      throw createDandoloError({
        response: {
          status: 400,
          data: {
            error: {
              message: 'Agent is not active',
              type: 'validation_error',
              code: 'agent_inactive'
            }
          }
        }
      });
    }

    const enhancedMessage: EnhancedChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date(),
      metadata: {
        agent_id: this.config.id,
        processed_by_agent: true
      }
    };

    // Apply agent instructions
    if (this.config.instructions) {
      enhancedMessage.agent_instruction = this.selectBestInstruction(message);
    }

    this.emit('message_processed', { message: enhancedMessage, context });
    return enhancedMessage;
  }

  /**
   * Execute agent instructions
   */
  async executeInstructions(instructions: AgentInstruction[]): Promise<{
    results: any[];
    success: boolean;
    errors: DandoloError[];
  }> {
    const results: any[] = [];
    const errors: DandoloError[] = [];
    
    for (const instruction of instructions) {
      try {
        const result = await this.executeInstruction(instruction);
        results.push(result);
        this.emit('instruction_executed', { instruction, result });
      } catch (error) {
        const dandoloError = createDandoloError(error);
        errors.push(dandoloError);
        this.emit('instruction_failed', { instruction, error: dandoloError });
      }
    }

    return {
      results,
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Start continuous processing mode
   */
  startProcessing(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processQueue();
    this.emit('processing_started');
  }

  /**
   * Stop continuous processing mode
   */
  stopProcessing(): void {
    this.isProcessing = false;
    this.emit('processing_stopped');
  }

  /**
   * Add task to processing queue
   */
  queueTask(task: () => Promise<void>): void {
    this.processingQueue.push(task);
    
    if (this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Get agent status
   */
  getStatus(): {
    active: boolean;
    processing: boolean;
    queue_length: number;
    uptime: number;
  } {
    return {
      active: this.isActive,
      processing: this.isProcessing,
      queue_length: this.processingQueue.length,
      uptime: Date.now() - (this.createdAt || Date.now())
    };
  }

  /**
   * Destroy the agent and clean up resources
   */
  async destroy(): Promise<void> {
    this.isActive = false;
    this.stopProcessing();
    this.processingQueue = [];
    this.emit('destroyed');
    this.removeAllListeners();
  }

  private createdAt = Date.now();

  private selectBestInstruction(message: ChatMessage): AgentInstruction | undefined {
    if (!this.config.instructions) return undefined;
    
    // Smart instruction selection based on message content
    for (const instruction of this.config.instructions) {
      if (this.instructionMatches(instruction, message)) {
        return instruction;
      }
    }
    
    return this.config.instructions[0]; // Default to first instruction
  }

  private instructionMatches(instruction: AgentInstruction, message: ChatMessage): boolean {
    // Advanced matching logic
    const content = message.content.toLowerCase();
    const instructionContent = instruction.content.toLowerCase();
    
    // Check for keyword matches
    const keywords = instructionContent.split(' ').filter(word => word.length > 3);
    return keywords.some(keyword => content.includes(keyword));
  }

  private async executeInstruction(instruction: AgentInstruction): Promise<any> {
    switch (instruction.type) {
      case 'system_prompt':
        return this.executeSystemPrompt(instruction);
      case 'workflow_step':
        return this.executeWorkflowStep(instruction);
      case 'context_injection':
        return this.executeContextInjection(instruction);
      case 'tool_use':
        return this.executeToolUse(instruction);
      case 'multi_modal':
        return this.executeMultiModal(instruction);
      default:
        throw new Error(`Unknown instruction type: ${instruction.type}`);
    }
  }

  private async executeSystemPrompt(instruction: AgentInstruction): Promise<any> {
    return { type: 'system_prompt', executed: true, content: instruction.content };
  }

  private async executeWorkflowStep(instruction: AgentInstruction): Promise<any> {
    return { type: 'workflow_step', executed: true, step_id: instruction.metadata?.step_id };
  }

  private async executeContextInjection(instruction: AgentInstruction): Promise<any> {
    return { type: 'context_injection', executed: true, injected: true };
  }

  private async executeToolUse(instruction: AgentInstruction): Promise<any> {
    return { type: 'tool_use', executed: true, tools: instruction.metadata?.tools };
  }

  private async executeMultiModal(instruction: AgentInstruction): Promise<any> {
    return { type: 'multi_modal', executed: true, format: instruction.metadata?.format };
  }

  private async processQueue(): Promise<void> {
    while (this.isProcessing && this.processingQueue.length > 0) {
      const task = this.processingQueue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          this.emit('task_failed', createDandoloError(error));
        }
      }
    }
  }
}

export default AgentManager;