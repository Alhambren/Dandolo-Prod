/**
 * Core type definitions for the Dandolo Agent SDK
 * Provides comprehensive typing for the best developer experience
 */

// ============================================================================
// Core Configuration Types
// ============================================================================

export interface DandoloConfig {
  /** Your Dandolo API key (ak_ for agents, dk_ for developers) */
  apiKey: string;
  
  /** Base URL for the Dandolo API */
  baseURL?: string;
  
  /** Your agent ID for enhanced features */
  agentId?: string;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Maximum number of retries for failed requests */
  maxRetries?: number;
  
  /** Enable debug logging */
  debug?: boolean;
  
  /** Custom headers to include with requests */
  headers?: Record<string, string>;
  
  /** Default model to use if not specified */
  defaultModel?: string;
  
  /** Enable agent-enhanced features */
  agentEnhanced?: boolean;
}

// ============================================================================
// Agent Instruction Types
// ============================================================================

export type AgentInstructionType = 
  | 'system_prompt'
  | 'workflow_step' 
  | 'context_injection'
  | 'tool_use'
  | 'multi_modal'
  | 'image_analysis'
  | 'audio_processing'
  | 'code_generation'
  | 'code_analysis'
  | 'data_analysis'
  | 'template_instruction'
  | 'conditional_instruction'
  | 'loop_instruction'
  | 'parallel_instruction'
  | 'validation_instruction';

export interface AgentInstruction {
  type: AgentInstructionType;
  content: string;
  metadata?: {
    priority?: 'high' | 'medium' | 'low';
    context_window?: number;
    model_preference?: string;
    temperature?: number;
    max_tokens?: number;
    workflow_id?: string;
    step_id?: string;
    dependencies?: string[];
    tools?: string[];
    format?: 'json' | 'yaml' | 'markdown' | 'plain' | 'xml' | 'csv' | 'code';
    
    // Multi-modal metadata
    media_type?: 'text' | 'image' | 'audio' | 'video' | 'code' | 'data';
    image_format?: 'png' | 'jpg' | 'jpeg' | 'gif' | 'webp' | 'svg';
    audio_format?: 'mp3' | 'wav' | 'ogg' | 'flac' | 'm4a';
    code_language?: string;
    data_schema?: Record<string, any>;
    
    // Template system metadata  
    template_variables?: Record<string, any>;
    template_engine?: 'handlebars' | 'mustache' | 'jinja2' | 'liquid';
    
    // Validation metadata
    validation_rules?: ValidationRule[];
    sanitization_enabled?: boolean;
    security_level?: 'strict' | 'moderate' | 'permissive';
    
    // Performance metadata
    cache_enabled?: boolean;
    cache_ttl?: number;
    timeout_ms?: number;
    
    // Conditional execution
    conditions?: ConditionalRule[];
    loop_config?: LoopConfig;
    parallel_config?: ParallelConfig;
  };
}

// ============================================================================
// Advanced Instruction Types
// ============================================================================

export interface ValidationRule {
  /** Rule type */
  type: 'required' | 'format' | 'length' | 'pattern' | 'custom';
  
  /** Field or content to validate */
  field?: string;
  
  /** Expected value or pattern */
  value?: any;
  
  /** Error message if validation fails */
  message?: string;
  
  /** Custom validation function */
  validator?: (value: any) => boolean | Promise<boolean>;
}

export interface ConditionalRule {
  /** Condition type */
  type: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than' | 'custom';
  
  /** Field to evaluate */
  field: string;
  
  /** Expected value */
  value: any;
  
  /** Action to take if condition is met */
  action: 'execute' | 'skip' | 'abort' | 'branch';
  
  /** Target instruction or branch if action is taken */
  target?: string;
  
  /** Custom condition function */
  condition?: (context: any) => boolean | Promise<boolean>;
}

export interface LoopConfig {
  /** Loop type */
  type: 'for' | 'while' | 'foreach' | 'until';
  
  /** Maximum iterations */
  max_iterations: number;
  
  /** Loop variable name */
  variable?: string;
  
  /** Iterable data for foreach loops */
  iterable?: any[];
  
  /** Condition for while/until loops */
  condition?: string | ((context: any) => boolean);
  
  /** Break condition */
  break_condition?: string | ((context: any) => boolean);
}

export interface ParallelConfig {
  /** Maximum parallel executions */
  max_parallel: number;
  
  /** Whether to wait for all to complete */
  wait_for_all: boolean;
  
  /** Timeout for parallel execution */
  timeout_ms?: number;
  
  /** Error handling strategy */
  error_strategy: 'fail_fast' | 'continue' | 'collect_errors';
}

export interface MultiModalContent {
  /** Content type */
  type: 'text' | 'image' | 'audio' | 'code' | 'data';
  
  /** Content data */
  data: string | Buffer | ArrayBuffer;
  
  /** MIME type */
  mime_type?: string;
  
  /** Content metadata */
  metadata?: {
    filename?: string;
    size?: number;
    dimensions?: { width: number; height: number };
    duration?: number;
    language?: string;
    encoding?: string;
  };
}

export interface InstructionTemplate {
  /** Template ID */
  id: string;
  
  /** Template name */
  name: string;
  
  /** Template content with placeholders */
  template: string;
  
  /** Required variables */
  required_variables: string[];
  
  /** Optional variables with defaults */
  optional_variables?: Record<string, any>;
  
  /** Template engine to use */
  engine: 'handlebars' | 'mustache' | 'jinja2' | 'liquid';
  
  /** Template metadata */
  metadata?: {
    description?: string;
    category?: string;
    tags?: string[];
    version?: string;
  };
}

export interface InstructionValidationResult {
  /** Whether instruction is valid */
  valid: boolean;
  
  /** Validation errors */
  errors: ValidationError[];
  
  /** Validation warnings */
  warnings: ValidationWarning[];
  
  /** Sanitized instruction (if applicable) */
  sanitized_instruction?: AgentInstruction;
  
  /** Security assessment */
  security_assessment: {
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    threats_detected: string[];
    mitigation_applied: string[];
  };
}

export interface ValidationError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Field that failed validation */
  field?: string;
  
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  /** Warning code */
  code: string;
  
  /** Warning message */
  message: string;
  
  /** Field that triggered warning */
  field?: string;
  
  /** Suggested action */
  suggestion?: string;
}

// ============================================================================
// Message and Conversation Types
// ============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  
  // Enhanced agent features
  agent_instruction?: AgentInstruction;
  context_id?: string;
  thread_id?: string;
  parent_message_id?: string;
  timestamp?: number;
}

export interface EnhancedChatMessage extends ChatMessage {
  /** Unique message ID */
  id?: string;
  
  /** Message creation timestamp */
  created_at?: Date;
  
  /** Token count for this message */
  token_count?: number;
  
  /** Model used to generate this message */
  model?: string;
  
  /** Processing metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// Request and Response Types
// ============================================================================

export interface ChatCompletionRequest {
  /** Array of messages in the conversation */
  messages: ChatMessage[];
  
  /** Model to use for the completion */
  model?: string;
  
  /** Temperature for randomness (0-2) */
  temperature?: number;
  
  /** Maximum tokens to generate */
  max_tokens?: number;
  
  /** Enable streaming responses */
  stream?: boolean;
  
  /** Agent instructions for enhanced processing */
  instructions?: AgentInstruction[];
  
  /** Context ID for conversation continuity */
  context_id?: string;
  
  /** Workflow ID for multi-step processes */
  workflow_id?: string;
  
  /** Agent-specific options */
  agent_options?: {
    stream_mode?: 'standard' | 'agent_enhanced' | 'workflow_aware';
    context_preservation?: boolean;
    instruction_parsing?: boolean;
    multi_step_workflow?: boolean;
  };
}

export interface ChatCompletionResponse {
  /** Unique completion ID */
  id: string;
  
  /** Object type (always 'chat.completion') */
  object: 'chat.completion';
  
  /** Creation timestamp */
  created: number;
  
  /** Model used for the completion */
  model: string;
  
  /** Array of completion choices */
  choices: {
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: 'stop' | 'length' | 'content_filter' | 'function_call';
  }[];
  
  /** Token usage information */
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  
  /** Enhanced agent metadata (for agent keys only) */
  dandolo_agent?: {
    agent_id: string;
    context_id?: string;
    workflow_id?: string;
    processing_time_ms: number;
    instruction_count: number;
  };
}

// ============================================================================
// Streaming Types
// ============================================================================

export interface StreamingChunk {
  /** Streaming content */
  content: string;
  
  /** Whether this is the final chunk */
  done: boolean;
  
  /** Model used */
  model?: string;
  
  /** Token count (final chunk only) */
  tokens?: number;
  
  /** Agent metadata */
  agent_metadata?: Record<string, any>;
  
  /** Workflow state */
  workflow_state?: Record<string, any>;
  
  /** Instruction feedback */
  instruction_feedback?: string[];
}

export interface StreamingOptions {
  /** Streaming mode */
  mode?: 'standard' | 'agent_enhanced' | 'workflow_aware';
  
  /** Chunk callback */
  onChunk?: (chunk: StreamingChunk) => void;
  
  /** Completion callback */
  onComplete?: (response: ChatCompletionResponse) => void;
  
  /** Error callback */
  onError?: (error: Error) => void;
  
  /** Enable real-time updates */
  realtime?: boolean;
}

// ============================================================================
// Workflow Types
// ============================================================================

export interface WorkflowStep {
  /** Unique step ID */
  id: string;
  
  /** Step name */
  name: string;
  
  /** Step description */
  description?: string;
  
  /** Step type */
  type: 'prompt' | 'function' | 'condition' | 'loop' | 'parallel';
  
  /** Step configuration */
  config: Record<string, any>;
  
  /** Dependencies (step IDs that must complete first) */
  dependencies?: string[];
  
  /** Success criteria */
  success_criteria?: string[];
  
  /** Error handling */
  error_handling?: {
    retry_count?: number;
    fallback_step?: string;
  };
}

export interface Workflow {
  /** Unique workflow ID */
  id: string;
  
  /** Workflow name */
  name: string;
  
  /** Workflow description */
  description?: string;
  
  /** Workflow version */
  version: string;
  
  /** Workflow steps */
  steps: WorkflowStep[];
  
  /** Global configuration */
  config?: {
    max_parallel?: number;
    timeout_ms?: number;
    retry_policy?: 'exponential' | 'linear' | 'none';
  };
  
  /** Workflow metadata */
  metadata?: Record<string, any>;
}

export interface WorkflowExecution {
  /** Execution ID */
  id: string;
  
  /** Workflow ID being executed */
  workflow_id: string;
  
  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  /** Current step */
  current_step?: string;
  
  /** Completed steps */
  completed_steps: string[];
  
  /** Failed steps */
  failed_steps: string[];
  
  /** Step results */
  results: Record<string, any>;
  
  /** Execution metadata */
  metadata?: Record<string, any>;
  
  /** Start time */
  started_at: Date;
  
  /** End time */
  completed_at?: Date;
}

// ============================================================================
// Context and Memory Types
// ============================================================================

export interface ConversationContext {
  /** Context ID */
  id: string;
  
  /** Messages in this context */
  messages: EnhancedChatMessage[];
  
  /** Context metadata */
  metadata: {
    created_at: Date;
    updated_at: Date;
    message_count: number;
    total_tokens: number;
    last_model_used?: string;
    agent_id?: string;
  };
  
  /** Context settings */
  settings?: {
    max_messages?: number;
    max_tokens?: number;
    auto_summarize?: boolean;
    summarize_threshold?: number;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export interface DandoloError {
  /** Error message */
  message: string;
  
  /** Error type */
  type: 'authentication_error' | 'validation_error' | 'rate_limit_error' | 'server_error' | 'network_error';
  
  /** Error code */
  code: string;
  
  /** HTTP status code */
  status?: number;
  
  /** Request ID for debugging */
  request_id?: string;
  
  /** Additional error details */
  details?: Record<string, any>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type ModelType = 'text' | 'code' | 'image' | 'multimodal' | 'audio';

export interface Model {
  /** Model ID */
  id: string;
  
  /** Model name */
  name: string;
  
  /** Model type */
  type: ModelType;
  
  /** Context length */
  context_length?: number;
  
  /** Model capabilities */
  capabilities?: string[];
  
  /** Pricing information */
  pricing?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface RateLimitInfo {
  /** Requests limit */
  limit: number;
  
  /** Remaining requests */
  remaining: number;
  
  /** Reset timestamp */
  reset: number;
  
  /** Key type */
  type: string;
}

// ============================================================================
// Event Types for Real-time Features
// ============================================================================

export interface AgentEvent {
  /** Event type */
  type: 'message' | 'workflow_update' | 'context_change' | 'error' | 'rate_limit_warning';
  
  /** Event data */
  data: any;
  
  /** Event timestamp */
  timestamp: Date;
  
  /** Agent ID */
  agent_id?: string;
  
  /** Context ID */
  context_id?: string;
}

// ============================================================================
// Plugin and Extension Types
// ============================================================================

export interface AgentPlugin {
  /** Plugin name */
  name: string;
  
  /** Plugin version */
  version: string;
  
  /** Plugin description */
  description?: string;
  
  /** Plugin configuration */
  config?: Record<string, any>;
  
  /** Plugin hooks */
  hooks?: {
    beforeRequest?: (request: any) => any;
    afterResponse?: (response: any) => any;
    onError?: (error: any) => any;
  };
}

// ============================================================================
// Framework Integration Types
// ============================================================================

export interface LangChainCompatibility {
  /** Convert to LangChain message format */
  toLangChainMessages: (messages: ChatMessage[]) => any[];
  
  /** Convert from LangChain message format */
  fromLangChainMessages: (langchainMessages: any[]) => ChatMessage[];
}

export interface AutoGenCompatibility {
  /** Convert to AutoGen agent format */
  toAutoGenAgent: (config: any) => any;
  
  /** Handle AutoGen conversation */
  handleAutoGenConversation: (conversation: any) => Promise<any>;
}

// ============================================================================
// Export Everything
// ============================================================================

export type {
  // Core types
  DandoloConfig,
  ChatMessage,
  EnhancedChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  
  // Agent types
  AgentInstruction,
  AgentInstructionType,
  
  // Streaming types
  StreamingChunk,
  StreamingOptions,
  
  // Workflow types
  Workflow,
  WorkflowStep,
  WorkflowExecution,
  
  // Context types
  ConversationContext,
  
  // Error types
  DandoloError,
  
  // Utility types
  Model,
  ModelType,
  RateLimitInfo,
  AgentEvent,
  AgentPlugin,
  
  // Framework integration
  LangChainCompatibility,
  AutoGenCompatibility
};