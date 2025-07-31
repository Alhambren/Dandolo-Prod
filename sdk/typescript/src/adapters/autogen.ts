/**
 * AutoGen Compatibility Adapter for Dandolo SDK
 * 
 * Provides seamless integration with Microsoft AutoGen framework
 * while leveraging Dandolo's superior multi-agent capabilities.
 */

import { EventEmitter } from 'eventemitter3';
import {
  ChatMessage,
  AgentInstruction,
  Workflow,
  WorkflowStep,
  ConversationContext
} from '../types';
import { DandoloClient } from '../client';
import { Agent, AgentManager, AgentConfig } from '../agents';
import { WorkflowManager } from '../workflows';

// AutoGen-compatible interfaces
export interface AutoGenAgent {
  name: string;
  system_message?: string;
  llm_config?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    timeout?: number;
  };
  human_input_mode?: 'ALWAYS' | 'NEVER' | 'TERMINATE';
  max_consecutive_auto_reply?: number;
  code_execution_config?: {
    work_dir?: string;
    use_docker?: boolean;
    timeout?: number;
  };
}

export interface AutoGenConversation {
  agents: AutoGenAgent[];
  messages: Array<{
    role: string;
    content: string;
    name?: string;
  }>;
  max_turns?: number;
  silent?: boolean;
}

export interface AutoGenGroupChat {
  agents: AutoGenAgent[];
  admin_name?: string;
  max_round?: number;
  speaker_selection_method?: 'auto' | 'manual' | 'random' | 'round_robin';
  allow_repeat_speaker?: boolean;
}

/**
 * AutoGen-compatible adapter with enhanced multi-agent orchestration
 */
export class DandoloAutoGenAdapter extends EventEmitter {
  private agentManager: AgentManager;
  private workflowManager: WorkflowManager;
  private autoGenAgents: Map<string, AutoGenAgent> = new Map();
  private dandoloAgents: Map<string, Agent> = new Map();

  constructor(private client: DandoloClient) {
    super();
    this.agentManager = new AgentManager(client);
    this.workflowManager = new WorkflowManager(client);
  }

  /**
   * Create an AutoGen-compatible Conversable Agent
   */
  async createConversableAgent(config: AutoGenAgent): Promise<DandoloAutoGenAgent> {
    // Store AutoGen config
    this.autoGenAgents.set(config.name, config);

    // Convert to Dandolo agent config
    const dandoloConfig: AgentConfig = {
      id: config.name,
      name: config.name,
      description: `AutoGen agent: ${config.name}`,
      instructions: config.system_message ? [{
        type: 'system_prompt',
        content: config.system_message,
        metadata: {
          priority: 'high',
          model_preference: config.llm_config?.model,
          temperature: config.llm_config?.temperature,
          max_tokens: config.llm_config?.max_tokens
        }
      }] : undefined,
      settings: {
        temperature: config.llm_config?.temperature,
        max_tokens: config.llm_config?.max_tokens,
        model_preference: config.llm_config?.model
      }
    };

    // Create Dandolo agent
    const dandoloAgent = await this.agentManager.createAgent(dandoloConfig);
    this.dandoloAgents.set(config.name, dandoloAgent);

    // Create wrapper
    const autoGenAgent = new DandoloAutoGenAgent(
      config,
      dandoloAgent,
      this.client,
      this
    );

    this.emit('agent_created', { name: config.name, agent: autoGenAgent });
    return autoGenAgent;
  }

  /**
   * Create an AutoGen-compatible Assistant Agent
   */
  async createAssistantAgent(config: Omit<AutoGenAgent, 'human_input_mode'> & {
    system_message: string;
  }): Promise<DandoloAutoGenAgent> {
    return this.createConversableAgent({
      ...config,
      human_input_mode: 'NEVER'
    });
  }

  /**
   * Create an AutoGen-compatible User Proxy Agent
   */
  async createUserProxyAgent(config: Omit<AutoGenAgent, 'human_input_mode'> & {
    is_termination_msg?: (message: string) => boolean;
  }): Promise<DandoloAutoGenAgent> {
    const agent = await this.createConversableAgent({
      ...config,
      human_input_mode: 'ALWAYS'
    });

    // Add termination checking capability
    if (config.is_termination_msg) {
      agent.setTerminationChecker(config.is_termination_msg);
    }

    return agent;
  }

  /**
   * Create an AutoGen-compatible Group Chat
   */
  async createGroupChat(config: AutoGenGroupChat): Promise<DandoloAutoGenGroupChat> {
    // Ensure all agents are created
    const agents: DandoloAutoGenAgent[] = [];
    for (const agentConfig of config.agents) {
      let agent = this.getAgent(agentConfig.name);
      if (!agent) {
        agent = await this.createConversableAgent(agentConfig);
      }
      agents.push(agent);
    }

    return new DandoloAutoGenGroupChat(config, agents, this.workflowManager);
  }

  /**
   * Start a conversation between two agents
   */
  async initiateChat(
    agent1Name: string,
    agent2Name: string,
    message: string,
    options?: {
      max_turns?: number;
      silent?: boolean;
      context_id?: string;
    }
  ): Promise<AutoGenConversationResult> {
    const agent1 = this.getAgent(agent1Name);
    const agent2 = this.getAgent(agent2Name);

    if (!agent1 || !agent2) {
      throw new Error(`One or both agents not found: ${agent1Name}, ${agent2Name}`);
    }

    const conversation = new DandoloAutoGenConversation(
      [agent1, agent2],
      this.client,
      options
    );

    return conversation.start(message);
  }

  /**
   * Get an existing agent by name
   */
  getAgent(name: string): DandoloAutoGenAgent | undefined {
    const dandoloAgent = this.dandoloAgents.get(name);
    const autoGenConfig = this.autoGenAgents.get(name);
    
    if (dandoloAgent && autoGenConfig) {
      return new DandoloAutoGenAgent(autoGenConfig, dandoloAgent, this.client, this);
    }
    
    return undefined;
  }

  /**
   * List all created agents
   */
  listAgents(): string[] {
    return Array.from(this.autoGenAgents.keys());
  }

  /**
   * Convert AutoGen conversation to Dandolo workflow
   */
  async createWorkflowFromConversation(
    conversation: AutoGenConversation
  ): Promise<Workflow> {
    const steps: WorkflowStep[] = [];
    
    // Create steps for each agent interaction
    for (let i = 0; i < conversation.agents.length; i++) {
      const agent = conversation.agents[i];
      steps.push({
        id: `step_${i}`,
        name: `${agent.name} Response`,
        description: `Generate response from ${agent.name}`,
        type: 'prompt',
        config: {
          prompt: '{{previous_message}}',
          model: agent.llm_config?.model,
          temperature: agent.llm_config?.temperature,
          max_tokens: agent.llm_config?.max_tokens
        },
        dependencies: i > 0 ? [`step_${i-1}`] : undefined
      });
    }

    return this.workflowManager.createWorkflow({
      name: 'AutoGen Conversation Workflow',
      description: 'Converted from AutoGen conversation',
      version: '1.0.0',
      steps,
      metadata: {
        source: 'autogen',
        agent_count: conversation.agents.length
      }
    });
  }
}

/**
 * AutoGen-compatible agent wrapper
 */
export class DandoloAutoGenAgent {
  private terminationChecker?: (message: string) => boolean;
  private conversationHistory: ChatMessage[] = [];

  constructor(
    private config: AutoGenAgent,
    private dandoloAgent: Agent,
    private client: DandoloClient,
    private adapter: DandoloAutoGenAdapter
  ) {}

  get name(): string {
    return this.config.name;
  }

  get system_message(): string | undefined {
    return this.config.system_message;
  }

  /**
   * Generate a reply to a message (AutoGen compatible)
   */
  async generateReply(
    messages: Array<{ role: string; content: string; name?: string }>,
    sender?: DandoloAutoGenAgent
  ): Promise<string> {
    // Convert AutoGen messages to Dandolo format
    const chatMessages: ChatMessage[] = messages.map(msg => ({
      role: this.mapAutoGenRole(msg.role),
      content: msg.content
    }));

    // Add to conversation history
    this.conversationHistory.push(...chatMessages);

    // Process with Dandolo agent
    const lastMessage = chatMessages[chatMessages.length - 1];
    const processedMessage = await this.dandoloAgent.processMessage(lastMessage);

    // Generate response using Dandolo client
    const response = await this.client.chat.completions.create({
      messages: [...this.conversationHistory],
      model: this.config.llm_config?.model,
      temperature: this.config.llm_config?.temperature,
      max_tokens: this.config.llm_config?.max_tokens
    });

    const reply = response.choices[0]?.message.content || '';
    
    // Add reply to history
    this.conversationHistory.push({
      role: 'assistant',
      content: reply
    });

    return reply;
  }

  /**
   * Send a message to another agent
   */
  async send(
    message: string,
    recipient: DandoloAutoGenAgent,
    requestReply = true
  ): Promise<string | undefined> {
    const messages = [
      ...this.conversationHistory,
      { role: 'user', content: message, name: this.name }
    ];

    if (requestReply) {
      return recipient.generateReply(messages, this);
    }

    return undefined;
  }

  /**
   * Check if a message should terminate the conversation
   */
  isTerminationMessage(message: string): boolean {
    if (this.terminationChecker) {
      return this.terminationChecker(message);
    }
    
    // Default termination conditions
    const terminationKeywords = ['TERMINATE', 'goodbye', 'finished', 'done', 'exit'];
    return terminationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Set custom termination checker
   */
  setTerminationChecker(checker: (message: string) => boolean): void {
    this.terminationChecker = checker;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  private mapAutoGenRole(role: string): 'system' | 'user' | 'assistant' {
    switch (role.toLowerCase()) {
      case 'system': return 'system';
      case 'user': return 'user';
      case 'assistant': return 'assistant';
      default: return 'user';
    }
  }
}

/**
 * AutoGen-compatible group chat implementation
 */
export class DandoloAutoGenGroupChat {
  private currentSpeaker = 0;
  private conversationHistory: Array<{
    speaker: string;
    message: string;
    timestamp: Date;
  }> = [];

  constructor(
    private config: AutoGenGroupChat,
    private agents: DandoloAutoGenAgent[],
    private workflowManager: WorkflowManager
  ) {}

  /**
   * Start group chat conversation
   */
  async startConversation(
    initialMessage: string,
    options?: {
      max_rounds?: number;
      silent?: boolean;
    }
  ): Promise<GroupChatResult> {
    const maxRounds = options?.max_rounds || this.config.max_round || 10;
    const results: Array<{
      speaker: string;
      message: string;
      round: number;
    }> = [];

    // Add initial message
    this.conversationHistory.push({
      speaker: 'user',
      message: initialMessage,
      timestamp: new Date()
    });

    for (let round = 0; round < maxRounds; round++) {
      // Select next speaker
      const speaker = this.selectNextSpeaker();
      
      // Generate response
      const messages = this.conversationHistory.map(entry => ({
        role: entry.speaker === 'user' ? 'user' : 'assistant',
        content: entry.message,
        name: entry.speaker
      }));

      const response = await speaker.generateReply(messages);
      
      // Add to history
      this.conversationHistory.push({
        speaker: speaker.name,
        message: response,
        timestamp: new Date()
      });

      results.push({
        speaker: speaker.name,
        message: response,
        round: round + 1
      });

      // Check for termination
      if (speaker.isTerminationMessage(response)) {
        break;
      }

      if (!options?.silent) {
        console.log(`[${speaker.name}]: ${response}`);
      }
    }

    return {
      results,
      total_rounds: results.length,
      terminated: results.length < maxRounds,
      final_speaker: results[results.length - 1]?.speaker
    };
  }

  /**
   * Add a new agent to the group chat
   */
  addAgent(agent: DandoloAutoGenAgent): void {
    this.agents.push(agent);
  }

  /**
   * Remove an agent from the group chat
   */
  removeAgent(agentName: string): boolean {
    const index = this.agents.findIndex(agent => agent.name === agentName);
    if (index !== -1) {
      this.agents.splice(index, 1);
      return true;
    }
    return false;
  }

  private selectNextSpeaker(): DandoloAutoGenAgent {
    switch (this.config.speaker_selection_method) {
      case 'random':
        return this.agents[Math.floor(Math.random() * this.agents.length)];
      
      case 'round_robin':
        const speaker = this.agents[this.currentSpeaker];
        this.currentSpeaker = (this.currentSpeaker + 1) % this.agents.length;
        return speaker;
      
      case 'manual':
        // For now, default to round robin for manual mode
        return this.selectNextSpeaker();
      
      case 'auto':
      default:
        // Intelligent speaker selection based on conversation context
        return this.selectSpeakerIntelligently();
    }
  }

  private selectSpeakerIntelligently(): DandoloAutoGenAgent {
    // Simple heuristic: select based on recent activity
    const recentMessages = this.conversationHistory.slice(-3);
    const speakerCounts = new Map<string, number>();

    for (const message of recentMessages) {
      speakerCounts.set(message.speaker, (speakerCounts.get(message.speaker) || 0) + 1);
    }

    // Select agent who has spoken least recently
    let selectedAgent = this.agents[0];
    let minCount = Infinity;

    for (const agent of this.agents) {
      const count = speakerCounts.get(agent.name) || 0;
      if (count < minCount) {
        minCount = count;
        selectedAgent = agent;
      }
    }

    return selectedAgent;
  }
}

/**
 * AutoGen-compatible conversation orchestrator
 */
export class DandoloAutoGenConversation {
  constructor(
    private agents: DandoloAutoGenAgent[],
    private client: DandoloClient,
    private options?: {
      max_turns?: number;
      silent?: boolean;
      context_id?: string;
    }
  ) {}

  async start(initialMessage: string): Promise<AutoGenConversationResult> {
    const maxTurns = this.options?.max_turns || 10;
    const results: ConversationTurn[] = [];
    
    let currentMessage = initialMessage;
    let currentSpeaker = 0;

    for (let turn = 0; turn < maxTurns; turn++) {
      const speaker = this.agents[currentSpeaker];
      const nextSpeaker = this.agents[(currentSpeaker + 1) % this.agents.length];

      // Generate response
      const response = await speaker.send(currentMessage, nextSpeaker, true);
      
      if (!response) break;

      results.push({
        turn: turn + 1,
        speaker: speaker.name,
        message: response,
        timestamp: new Date()
      });

      // Check for termination
      if (speaker.isTerminationMessage(response)) {
        break;
      }

      // Prepare for next turn
      currentMessage = response;
      currentSpeaker = (currentSpeaker + 1) % this.agents.length;

      if (!this.options?.silent) {
        console.log(`[${speaker.name}]: ${response}`);
      }
    }

    return {
      turns: results,
      total_turns: results.length,
      completed: true,
      context_id: this.options?.context_id
    };
  }
}

// Type definitions for results
export interface AutoGenConversationResult {
  turns: ConversationTurn[];
  total_turns: number;
  completed: boolean;
  context_id?: string;
}

export interface ConversationTurn {
  turn: number;
  speaker: string;
  message: string;
  timestamp: Date;
}

export interface GroupChatResult {
  results: Array<{
    speaker: string;
    message: string;
    round: number;
  }>;
  total_rounds: number;
  terminated: boolean;
  final_speaker?: string;
}

export default DandoloAutoGenAdapter;