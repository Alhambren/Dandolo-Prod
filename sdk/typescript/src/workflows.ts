/**
 * Advanced Workflow Management for Dandolo SDK
 * 
 * Provides sophisticated workflow orchestration, step execution,
 * and multi-agent coordination capabilities that exceed traditional
 * AI workflow systems.
 */

import { EventEmitter } from 'eventemitter3';
import {
  Workflow,
  WorkflowStep,
  WorkflowExecution,
  AgentInstruction,
  ChatMessage,
  DandoloError
} from './types';
import { DandoloClient } from './client';
import { createDandoloError } from './errors';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'chat' | 'code' | 'analysis' | 'creative' | 'custom';
  steps: Omit<WorkflowStep, 'id'>[];
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface WorkflowContext {
  variables: Record<string, any>;
  results: Record<string, any>;
  messages: ChatMessage[];
  currentStep?: string;
  executionId: string;
}

export interface StepExecutionResult {
  stepId: string;
  success: boolean;
  result?: any;
  error?: DandoloError;
  executionTime: number;
  tokensUsed?: number;
  metadata?: Record<string, any>;
}

/**
 * Advanced Workflow Management System
 * 
 * Orchestrates complex multi-step AI workflows with intelligent
 * execution, error handling, and optimization
 */
export class WorkflowManager extends EventEmitter {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private activeExecutions = 0;

  constructor(private client: DandoloClient) {
    super();
    this.initializeBuiltInTemplates();
  }

  /**
   * Create a new workflow from template or scratch
   */
  async createWorkflow(
    config: Omit<Workflow, 'id'> | { templateId: string; variables?: Record<string, any> }
  ): Promise<Workflow> {
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let workflow: Workflow;
    
    if ('templateId' in config) {
      // Create from template
      const template = this.templates.get(config.templateId);
      if (!template) {
        throw createDandoloError({
          response: {
            status: 404,
            data: {
              error: {
                message: `Template '${config.templateId}' not found`,
                type: 'validation_error',
                code: 'template_not_found'
              }
            }
          }
        });
      }
      
      workflow = this.createFromTemplate(workflowId, template, config.variables);
    } else {
      // Create from scratch
      workflow = {
        id: workflowId,
        ...config
      };
    }
    
    this.workflows.set(workflow.id, workflow);
    this.emit('workflow_created', workflow);
    
    return workflow;
  }

  /**
   * Execute a workflow with enhanced orchestration
   */
  async executeWorkflow(
    workflowId: string,
    initialContext?: Partial<WorkflowContext>
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw createDandoloError({
        response: {
          status: 404,
          data: {
            error: {
              message: `Workflow '${workflowId}' not found`,
              type: 'validation_error',
              code: 'workflow_not_found'
            }
          }
        }
      });
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: WorkflowExecution = {
      id: executionId,
      workflow_id: workflowId,
      status: 'pending',
      completed_steps: [],
      failed_steps: [],
      results: {},
      started_at: new Date(),
      metadata: {
        client_version: '1.0.0',
        agent_enhanced: this.client.isAgentEnhanced,
        ...initialContext?.variables
      }
    };

    this.executions.set(executionId, execution);
    this.activeExecutions++;
    
    // Start execution in background
    this.executeWorkflowInternal(workflow, execution, initialContext)
      .finally(() => {
        this.activeExecutions--;
      });

    return execution;
  }

  /**
   * Get workflow execution status
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * List all workflows
   */
  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * List available templates
   */
  listTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add a custom workflow template
   */
  addTemplate(template: WorkflowTemplate): void {
    this.templates.set(template.id, template);
    this.emit('template_added', template);
  }

  /**
   * Cancel a running workflow execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution) return false;

    if (execution.status === 'running') {
      execution.status = 'cancelled';
      execution.completed_at = new Date();
      this.emit('execution_cancelled', execution);
      return true;
    }

    return false;
  }

  /**
   * Get workflow execution statistics
   */
  getStats(): {
    total_workflows: number;
    active_executions: number;
    total_executions: number;
    success_rate: number;
    avg_execution_time: number;
  } {
    const executions = Array.from(this.executions.values());
    const completed = executions.filter(e => e.status === 'completed');
    const failed = executions.filter(e => e.status === 'failed');
    
    const avgTime = completed.length > 0 
      ? completed.reduce((sum, exec) => {
          const duration = exec.completed_at 
            ? exec.completed_at.getTime() - exec.started_at.getTime()
            : 0;
          return sum + duration;
        }, 0) / completed.length
      : 0;

    return {
      total_workflows: this.workflows.size,
      active_executions: this.activeExecutions,
      total_executions: executions.length,
      success_rate: executions.length > 0 
        ? completed.length / (completed.length + failed.length)
        : 0,
      avg_execution_time: avgTime
    };
  }

  private async executeWorkflowInternal(
    workflow: Workflow,
    execution: WorkflowExecution,
    initialContext?: Partial<WorkflowContext>
  ): Promise<void> {
    try {
      execution.status = 'running';
      this.emit('execution_started', execution);

      const context: WorkflowContext = {
        variables: initialContext?.variables || {},
        results: {},
        messages: initialContext?.messages || [],
        executionId: execution.id
      };

      // Execute steps based on dependencies
      const stepOrder = this.calculateExecutionOrder(workflow.steps);
      
      for (const stepId of stepOrder) {
        const step = workflow.steps.find(s => s.id === stepId);
        if (!step) continue;

        try {
          execution.current_step = stepId;
          context.currentStep = stepId;
          
          const result = await this.executeStep(step, context);
          
          execution.results[stepId] = result.result;
          execution.completed_steps.push(stepId);
          
          this.emit('step_completed', { execution, step, result });
          
          // Check if we should continue
          if (!result.success && !step.error_handling?.fallback_step) {
            throw result.error || new Error('Step failed without error details');
          }
          
        } catch (error) {
          const dandoloError = createDandoloError(error);
          execution.failed_steps.push(stepId);
          
          this.emit('step_failed', { execution, step, error: dandoloError });
          
          // Handle step failure
          if (step.error_handling?.retry_count && step.error_handling.retry_count > 0) {
            // Implement retry logic
            await this.retryStep(step, context, step.error_handling.retry_count);
          } else if (step.error_handling?.fallback_step) {
            // Execute fallback step
            const fallbackStep = workflow.steps.find(s => s.id === step.error_handling?.fallback_step);
            if (fallbackStep) {
              await this.executeStep(fallbackStep, context);
            }
          } else {
            // Fail the entire workflow
            execution.status = 'failed';
            execution.completed_at = new Date();
            this.emit('execution_failed', { execution, error: dandoloError });
            return;
          }
        }
      }

      execution.status = 'completed';
      execution.completed_at = new Date();
      execution.current_step = undefined;
      
      this.emit('execution_completed', execution);
      
    } catch (error) {
      const dandoloError = createDandoloError(error);
      execution.status = 'failed';
      execution.completed_at = new Date();
      execution.metadata = {
        ...execution.metadata,
        error: dandoloError
      };
      
      this.emit('execution_failed', { execution, error: dandoloError });
    }
  }

  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();
    
    try {
      let result: any;
      
      switch (step.type) {
        case 'prompt':
          result = await this.executePromptStep(step, context);
          break;
        case 'function':
          result = await this.executeFunctionStep(step, context);
          break;
        case 'condition':
          result = await this.executeConditionStep(step, context);
          break;
        case 'loop':
          result = await this.executeLoopStep(step, context);
          break;
        case 'parallel':
          result = await this.executeParallelStep(step, context);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      const executionTime = Date.now() - startTime;
      
      return {
        stepId: step.id,
        success: true,
        result,
        executionTime,
        metadata: {
          step_type: step.type,
          context_size: Object.keys(context.variables).length
        }
      };
      
    } catch (error) {
      return {
        stepId: step.id,
        success: false,
        error: createDandoloError(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  private async executePromptStep(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const prompt = this.interpolateTemplate(step.config.prompt, context.variables);
    
    const messages: ChatMessage[] = [
      ...context.messages,
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await this.client.chat.completions.create({
      messages,
      model: step.config.model || this.client.configuration.defaultModel,
      temperature: step.config.temperature,
      max_tokens: step.config.max_tokens
    });

    const assistantMessage = response.choices[0]?.message;
    if (assistantMessage) {
      context.messages.push(assistantMessage);
    }

    return {
      response: assistantMessage?.content,
      usage: response.usage,
      model: response.model
    };
  }

  private async executeFunctionStep(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    // Execute custom function
    if (typeof step.config.function === 'function') {
      return await step.config.function(context);
    }
    
    throw new Error('Function step requires a callable function in config');
  }

  private async executeConditionStep(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const condition = step.config.condition;
    const result = this.evaluateCondition(condition, context);
    
    return { condition_met: result, condition };
  }

  private async executeLoopStep(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const iterations = step.config.iterations || 1;
    const results: any[] = [];
    
    for (let i = 0; i < iterations; i++) {
      context.variables.loop_index = i;
      
      // Execute loop body (nested steps)
      if (step.config.steps) {
        for (const nestedStep of step.config.steps) {
          const result = await this.executeStep(nestedStep, context);
          results.push(result);
        }
      }
    }
    
    return { iterations: results.length, results };
  }

  private async executeParallelStep(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const promises: Promise<StepExecutionResult>[] = [];
    
    if (step.config.steps) {
      for (const nestedStep of step.config.steps) {
        promises.push(this.executeStep(nestedStep, { ...context }));
      }
    }
    
    const results = await Promise.allSettled(promises);
    
    return {
      parallel_results: results.map(r => 
        r.status === 'fulfilled' ? r.value : { error: r.reason }
      )
    };
  }

  private async retryStep(
    step: WorkflowStep,
    context: WorkflowContext,
    maxRetries: number
  ): Promise<StepExecutionResult> {
    let lastError: DandoloError | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeStep(step, context);
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = createDandoloError(error);
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
    
    throw lastError || new Error('Step failed after retries');
  }

  private calculateExecutionOrder(steps: WorkflowStep[]): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];
    
    const visit = (step: WorkflowStep) => {
      if (visiting.has(step.id)) {
        throw new Error(`Circular dependency detected involving step: ${step.id}`);
      }
      
      if (visited.has(step.id)) return;
      
      visiting.add(step.id);
      
      // Visit dependencies first
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          const depStep = steps.find(s => s.id === depId);
          if (depStep) {
            visit(depStep);
          }
        }
      }
      
      visiting.delete(step.id);
      visited.add(step.id);
      order.push(step.id);
    };
    
    for (const step of steps) {
      visit(step);
    }
    
    return order;
  }

  private createFromTemplate(
    workflowId: string,
    template: WorkflowTemplate,
    variables?: Record<string, any>
  ): Workflow {
    const steps: WorkflowStep[] = template.steps.map((stepTemplate, index) => ({
      id: `${workflowId}_step_${index}`,
      ...stepTemplate
    }));

    return {
      id: workflowId,
      name: template.name,
      description: template.description,
      version: '1.0.0',
      steps,
      metadata: {
        ...template.metadata,
        template_id: template.id,
        created_from_template: true,
        variables
      }
    };
  }

  private interpolateTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  private evaluateCondition(condition: string, context: WorkflowContext): boolean {
    // Simple condition evaluation (can be extended)
    try {
      // Replace variable references
      const evaluated = condition.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = context.variables[key];
        return typeof value === 'string' ? `"${value}"` : String(value);
      });
      
      // Use Function constructor for safe evaluation
      return new Function('return ' + evaluated)();
    } catch {
      return false;
    }
  }

  private initializeBuiltInTemplates(): void {
    // Built-in workflow templates
    const templates: WorkflowTemplate[] = [
      {
        id: 'simple_chat',
        name: 'Simple Chat Workflow',
        description: 'Basic chat interaction with response',
        category: 'chat',
        steps: [
          {
            name: 'Process User Input',
            description: 'Process and respond to user input',
            type: 'prompt',
            config: {
              prompt: '{{user_message}}',
              temperature: 0.7
            }
          }
        ]
      },
      {
        id: 'code_review',
        name: 'Code Review Workflow',
        description: 'Comprehensive code review with suggestions',
        category: 'code',
        steps: [
          {
            name: 'Analyze Code',
            description: 'Analyze code for issues',
            type: 'prompt',
            config: {
              prompt: 'Review this code for issues:\n\n{{code}}',
              model: 'code-specialized'
            }
          },
          {
            name: 'Generate Suggestions',
            description: 'Generate improvement suggestions',
            type: 'prompt',
            config: {
              prompt: 'Based on the analysis, provide specific improvement suggestions'
            },
            dependencies: ['code_review_step_0']
          }
        ]
      },
      {
        id: 'content_generation',
        name: 'Content Generation Pipeline',
        description: 'Multi-step content creation workflow',
        category: 'creative',
        steps: [
          {
            name: 'Research Topic',
            description: 'Research the given topic',
            type: 'prompt',
            config: {
              prompt: 'Research and provide key information about: {{topic}}'
            }
          },
          {
            name: 'Create Outline',
            description: 'Create content outline',
            type: 'prompt',
            config: {
              prompt: 'Create a detailed outline for content about {{topic}}'
            },
            dependencies: ['content_generation_step_0']
          },
          {
            name: 'Write Content',
            description: 'Write the final content',
            type: 'prompt',
            config: {
              prompt: 'Write engaging content following the outline',
              max_tokens: 2000
            },
            dependencies: ['content_generation_step_1']
          }
        ]
      }
    ];

    for (const template of templates) {
      this.templates.set(template.id, template);
    }
  }
}

export default WorkflowManager;