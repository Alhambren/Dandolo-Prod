/**
 * Advanced Instruction Processing System for Dandolo Agent SDK
 * 
 * Provides comprehensive instruction validation, sanitization, multi-modal processing,
 * template rendering, and security validation capabilities.
 */

import { EventEmitter } from 'eventemitter3';
import {
  AgentInstruction,
  AgentInstructionType,
  ValidationRule,
  ConditionalRule,
  LoopConfig,
  ParallelConfig,
  MultiModalContent,
  InstructionTemplate,
  InstructionValidationResult,
  ValidationError,
  ValidationWarning,
  ConversationContext,
  DandoloError
} from './types';
import { createDandoloError } from './errors';

/**
 * Comprehensive Instruction Processor
 * 
 * Handles all aspects of instruction processing including validation,
 * sanitization, multi-modal content, templates, and security
 */
export class InstructionProcessor extends EventEmitter {
  private templates = new Map<string, InstructionTemplate>();
  private validationCache = new Map<string, InstructionValidationResult>();
  private processingStats = {
    total_processed: 0,
    validation_failures: 0,
    security_blocks: 0,
    cache_hits: 0,
    average_processing_time: 0
  };

  // Security patterns for prompt injection detection
  private readonly SECURITY_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions?/i,
    /disregard\s+(all\s+)?previous\s+instructions?/i,
    /forget\s+(all\s+)?previous\s+instructions?/i,
    /system:\s*[\"\']?[^\"\']*[\"\']?\s*$/i,
    /\[INST\]/i,
    /\<\|system\|\>/i,
    /\<\|user\|\>/i,
    /\<\|assistant\|\>/i,
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/i,
    /data:text\/html/i,
    /eval\s*\(/i,
    /function\s*\(/i,
    /setTimeout\s*\(/i,
    /setInterval\s*\(/i
  ];

  // Dangerous content patterns
  private readonly DANGEROUS_PATTERNS = [
    /\b(password|token|key|secret|auth|login|credential)\b/i,
    /\b(execute|run|exec|spawn|shell|cmd|command)\b.*?\([^)]*\)/i,
    /\b(rm|del|delete|drop|truncate|destroy)\b/i,
    /\b(sudo|admin|root|administrator)\b/i
  ];

  constructor() {
    super();
    this.initializeDefaultTemplates();
  }

  /**
   * Process a single instruction with comprehensive validation and enhancement
   */
  async processInstruction(
    instruction: AgentInstruction,
    context?: ConversationContext
  ): Promise<{
    processed: AgentInstruction;
    validation: InstructionValidationResult;
    metadata: {
      processing_time_ms: number;
      security_assessment: any;
      enhancements_applied: string[];
    };
  }> {
    const startTime = Date.now();
    
    try {
      // 1. Validate instruction
      const validation = await this.validateInstruction(instruction);
      
      if (!validation.valid && validation.security_assessment.risk_level === 'critical') {
        this.processingStats.security_blocks++;
        throw createDandoloError({
          response: {
            status: 400,
            data: {
              error: {
                message: 'Instruction blocked due to security concerns',
                type: 'security_error',
                code: 'instruction_blocked',
                details: validation.security_assessment
              }
            }
          }
        });
      }

      // 2. Apply sanitization if needed
      let processedInstruction = validation.sanitized_instruction || instruction;

      // 3. Process multi-modal content
      if (this.isMultiModal(processedInstruction)) {
        processedInstruction = await this.processMultiModalContent(processedInstruction);
      }

      // 4. Process templates
      if (this.isTemplate(processedInstruction)) {
        processedInstruction = await this.processTemplate(processedInstruction, context);
      }

      // 5. Apply conditional logic
      if (processedInstruction.metadata?.conditions) {
        const shouldExecute = await this.evaluateConditions(
          processedInstruction.metadata.conditions,
          context
        );
        if (!shouldExecute) {
          processedInstruction.metadata.execution_skipped = true;
        }
      }

      // 6. Apply enhancements
      const enhancements = await this.applyEnhancements(processedInstruction, context);
      processedInstruction = enhancements.instruction;

      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime);

      this.emit('instruction_processed', {
        original: instruction,
        processed: processedInstruction,
        validation,
        processing_time_ms: processingTime
      });

      return {
        processed: processedInstruction,
        validation,
        metadata: {
          processing_time_ms: processingTime,
          security_assessment: validation.security_assessment,
          enhancements_applied: enhancements.applied
        }
      };

    } catch (error) {
      this.processingStats.validation_failures++;
      this.emit('instruction_failed', { instruction, error });
      throw error;
    }
  }

  /**
   * Process multiple instructions with optimization
   */
  async processInstructions(
    instructions: AgentInstruction[],
    context?: ConversationContext
  ): Promise<{
    processed: AgentInstruction[];
    validation_results: InstructionValidationResult[];
    optimization_applied: {
      deduplication: number;
      reordering: boolean;
      parallelization: number;
    };
    total_processing_time_ms: number;
  }> {
    const startTime = Date.now();
    
    // 1. Deduplicate instructions
    const { unique, duplicates } = this.deduplicateInstructions(instructions);
    
    // 2. Optimize order based on dependencies and priorities
    const optimized = this.optimizeInstructionOrder(unique);
    
    // 3. Identify parallelizable instructions
    const parallelGroups = this.identifyParallelGroups(optimized);
    
    // 4. Process instructions (some in parallel)
    const processed: AgentInstruction[] = [];
    const validationResults: InstructionValidationResult[] = [];
    
    for (const group of parallelGroups) {
      if (group.length === 1) {
        // Process single instruction
        const result = await this.processInstruction(group[0], context);
        processed.push(result.processed);
        validationResults.push(result.validation);
      } else {
        // Process parallel group
        const parallelResults = await Promise.all(
          group.map(inst => this.processInstruction(inst, context))
        );
        processed.push(...parallelResults.map(r => r.processed));
        validationResults.push(...parallelResults.map(r => r.validation));
      }
    }

    const totalTime = Date.now() - startTime;

    return {
      processed,
      validation_results: validationResults,
      optimization_applied: {
        deduplication: duplicates,
        reordering: optimized.length !== instructions.length,
        parallelization: parallelGroups.filter(g => g.length > 1).length
      },
      total_processing_time_ms: totalTime
    };
  }

  /**
   * Validate an instruction for security and correctness
   */
  async validateInstruction(instruction: AgentInstruction): Promise<InstructionValidationResult> {
    const cacheKey = this.createCacheKey(instruction);
    
    // Check cache first
    if (this.validationCache.has(cacheKey)) {
      this.processingStats.cache_hits++;
      return this.validationCache.get(cacheKey)!;
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitizedInstruction: AgentInstruction | undefined;

    // 1. Basic validation
    if (!instruction.type) {
      errors.push({
        code: 'MISSING_TYPE',
        message: 'Instruction type is required',
        field: 'type',
        severity: 'error'
      });
    }

    if (!instruction.content || instruction.content.trim().length === 0) {
      errors.push({
        code: 'EMPTY_CONTENT',
        message: 'Instruction content cannot be empty',
        field: 'content',
        severity: 'error'
      });
    }

    // 2. Type-specific validation
    const typeValidation = await this.validateInstructionType(instruction);
    errors.push(...typeValidation.errors);
    warnings.push(...typeValidation.warnings);

    // 3. Security validation
    const securityAssessment = await this.performSecurityAssessment(instruction);
    
    if (securityAssessment.risk_level === 'high' || securityAssessment.risk_level === 'critical') {
      if (securityAssessment.risk_level === 'critical') {
        errors.push({
          code: 'SECURITY_VIOLATION',
          message: 'Critical security violation detected',
          severity: 'error'
        });
      } else {
        warnings.push({
          code: 'SECURITY_WARNING',
          message: 'Potential security risk detected',
          severity: 'warning',
          suggestion: 'Consider reviewing instruction content'
        });
      }
    }

    // 4. Apply sanitization if needed
    if (securityAssessment.mitigation_applied.length > 0) {
      sanitizedInstruction = await this.sanitizeInstruction(instruction, securityAssessment);
    }

    // 5. Metadata validation
    if (instruction.metadata) {
      const metadataValidation = this.validateMetadata(instruction.metadata);
      errors.push(...metadataValidation.errors);
      warnings.push(...metadataValidation.warnings);
    }

    const result: InstructionValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitized_instruction: sanitizedInstruction,
      security_assessment: securityAssessment
    };

    // Cache the result
    this.validationCache.set(cacheKey, result);

    return result;
  }

  /**
   * Process multi-modal content in an instruction
   */
  private async processMultiModalContent(instruction: AgentInstruction): Promise<AgentInstruction> {
    if (!this.isMultiModal(instruction)) return instruction;

    const processed = { ...instruction };
    const mediaType = instruction.metadata?.media_type;

    switch (mediaType) {
      case 'image':
        processed.metadata = {
          ...processed.metadata,
          processed_image_metadata: await this.processImageContent(instruction.content)
        };
        break;
        
      case 'audio':
        processed.metadata = {
          ...processed.metadata,
          processed_audio_metadata: await this.processAudioContent(instruction.content)
        };
        break;
        
      case 'code':
        processed.metadata = {
          ...processed.metadata,
          processed_code_metadata: await this.processCodeContent(instruction.content)
        };
        break;
        
      case 'data':
        processed.metadata = {
          ...processed.metadata,
          processed_data_metadata: await this.processDataContent(instruction.content)
        };
        break;
    }

    return processed;
  }

  /**
   * Process template instructions with variable substitution
   */
  private async processTemplate(
    instruction: AgentInstruction,
    context?: ConversationContext
  ): Promise<AgentInstruction> {
    if (!this.isTemplate(instruction)) return instruction;

    const templateEngine = instruction.metadata?.template_engine || 'handlebars';
    const variables = instruction.metadata?.template_variables || {};

    // Add context variables if available
    const allVariables = {
      ...variables,
      ...(context ? this.extractContextVariables(context) : {})
    };

    let processedContent: string;

    switch (templateEngine) {
      case 'handlebars':
        processedContent = await this.processHandlebarsTemplate(instruction.content, allVariables);
        break;
      case 'mustache':
        processedContent = await this.processMustacheTemplate(instruction.content, allVariables);
        break;
      case 'jinja2':
        processedContent = await this.processJinja2Template(instruction.content, allVariables);
        break;
      case 'liquid':
        processedContent = await this.processLiquidTemplate(instruction.content, allVariables);
        break;
      default:
        // Simple variable substitution
        processedContent = this.processSimpleTemplate(instruction.content, allVariables);
    }

    return {
      ...instruction,
      content: processedContent,
      metadata: {
        ...instruction.metadata,
        template_processed: true,
        variables_used: Object.keys(allVariables)
      }
    };
  }

  /**
   * Perform comprehensive security assessment
   */
  private async performSecurityAssessment(instruction: AgentInstruction): Promise<{
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    threats_detected: string[];
    mitigation_applied: string[];
  }> {
    const threatsDetected: string[] = [];
    const mitigationApplied: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    const content = instruction.content.toLowerCase();

    // Check for prompt injection patterns
    for (const pattern of this.SECURITY_PATTERNS) {
      if (pattern.test(instruction.content)) {
        threatsDetected.push('prompt_injection');
        riskLevel = 'critical';
        break;
      }
    }

    // Check for dangerous content patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(instruction.content)) {
        threatsDetected.push('dangerous_content');
        if (riskLevel === 'low') riskLevel = 'high';
      }
    }

    // Check content length (potential DoS)
    if (instruction.content.length > 50000) {
      threatsDetected.push('excessive_length');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Check for excessive repetition
    const words = instruction.content.split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 100 && uniqueWords.size / words.length < 0.3) {
      threatsDetected.push('excessive_repetition');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Apply security level settings
    const securityLevel = instruction.metadata?.security_level || 'moderate';
    if (securityLevel === 'strict' && riskLevel === 'medium') {
      riskLevel = 'high';
    }

    return {
      risk_level: riskLevel,
      threats_detected: threatsDetected,
      mitigation_applied: mitigationApplied
    };
  }

  /**
   * Sanitize instruction content based on security assessment
   */
  private async sanitizeInstruction(
    instruction: AgentInstruction,
    securityAssessment: any
  ): Promise<AgentInstruction> {
    let sanitizedContent = instruction.content;
    const mitigationApplied: string[] = [];

    // Remove suspicious patterns
    for (const pattern of this.SECURITY_PATTERNS) {
      if (pattern.test(sanitizedContent)) {
        sanitizedContent = sanitizedContent.replace(pattern, '[REDACTED]');
        mitigationApplied.push('pattern_removal');
      }
    }

    // Truncate excessive content
    if (sanitizedContent.length > 10000) {
      sanitizedContent = sanitizedContent.substring(0, 10000) + '\n[Content truncated for security]';
      mitigationApplied.push('content_truncation');
    }

    return {
      ...instruction,
      content: sanitizedContent,
      metadata: {
        ...instruction.metadata,
        sanitized: true,
        mitigation_applied: mitigationApplied
      }
    };
  }

  // Helper methods for multi-modal processing
  private async processImageContent(content: string): Promise<any> {
    return {
      type: 'image',
      analyzed: true,
      timestamp: new Date().toISOString()
    };
  }

  private async processAudioContent(content: string): Promise<any> {
    return {
      type: 'audio',
      analyzed: true,
      timestamp: new Date().toISOString()
    };
  }

  private async processCodeContent(content: string): Promise<any> {
    return {
      type: 'code',
      lines: content.split('\n').length,
      analyzed: true,
      timestamp: new Date().toISOString()
    };
  }

  private async processDataContent(content: string): Promise<any> {
    return {
      type: 'data',
      size: content.length,
      analyzed: true,
      timestamp: new Date().toISOString()
    };
  }

  // Template processing methods
  private async processHandlebarsTemplate(template: string, variables: Record<string, any>): Promise<string> {
    // Simple handlebars-like processing (would use actual handlebars in production)
    return this.processSimpleTemplate(template, variables);
  }

  private async processMustacheTemplate(template: string, variables: Record<string, any>): Promise<string> {
    return this.processSimpleTemplate(template, variables);
  }

  private async processJinja2Template(template: string, variables: Record<string, any>): Promise<string> {
    return this.processSimpleTemplate(template, variables);
  }

  private async processLiquidTemplate(template: string, variables: Record<string, any>): Promise<string> {
    return this.processSimpleTemplate(template, variables);
  }

  private processSimpleTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processed = processed.replace(regex, String(value));
    }
    
    return processed;
  }

  // Utility methods
  private isMultiModal(instruction: AgentInstruction): boolean {
    return instruction.type === 'multi_modal' || 
           instruction.metadata?.media_type !== undefined ||
           ['image_analysis', 'audio_processing', 'code_analysis', 'data_analysis'].includes(instruction.type);
  }

  private isTemplate(instruction: AgentInstruction): boolean {
    return instruction.type === 'template_instruction' ||
           instruction.metadata?.template_variables !== undefined ||
           instruction.content.includes('{{') && instruction.content.includes('}}');
  }

  private createCacheKey(instruction: AgentInstruction): string {
    return `${instruction.type}:${instruction.content.substring(0, 100)}:${JSON.stringify(instruction.metadata || {})}`;
  }

  private deduplicateInstructions(instructions: AgentInstruction[]): { unique: AgentInstruction[]; duplicates: number } {
    const seen = new Set<string>();
    const unique: AgentInstruction[] = [];
    let duplicates = 0;

    for (const instruction of instructions) {
      const key = this.createCacheKey(instruction);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(instruction);
      } else {
        duplicates++;
      }
    }

    return { unique, duplicates };
  }

  private optimizeInstructionOrder(instructions: AgentInstruction[]): AgentInstruction[] {
    // Sort by priority and dependencies
    return instructions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityA = priorityOrder[a.metadata?.priority || 'medium'];
      const priorityB = priorityOrder[b.metadata?.priority || 'medium'];
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      
      // Consider dependencies (simplified)
      const depsA = a.metadata?.dependencies?.length || 0;
      const depsB = b.metadata?.dependencies?.length || 0;
      
      return depsA - depsB;
    });
  }

  private identifyParallelGroups(instructions: AgentInstruction[]): AgentInstruction[][] {
    const groups: AgentInstruction[][] = [];
    const processed = new Set<string>();
    
    for (const instruction of instructions) {
      if (processed.has(instruction.type)) continue;
      
      const canParallelize = !instruction.metadata?.dependencies?.length;
      if (canParallelize) {
        const parallelGroup = instructions.filter(i => 
          i.type === instruction.type && 
          !i.metadata?.dependencies?.length &&
          !processed.has(i.type)
        );
        
        if (parallelGroup.length > 1) {
          groups.push(parallelGroup);
          parallelGroup.forEach(i => processed.add(i.type));
        } else {
          groups.push([instruction]);
          processed.add(instruction.type);
        }
      } else {
        groups.push([instruction]);
        processed.add(instruction.type);
      }
    }
    
    return groups;
  }

  private async evaluateConditions(
    conditions: ConditionalRule[],
    context?: ConversationContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, context);
      if (!result) return false;
    }
    return true;
  }

  private async evaluateCondition(
    condition: ConditionalRule,
    context?: ConversationContext
  ): Promise<boolean> {
    if (condition.condition) {
      return condition.condition(context);
    }
    
    // Simple evaluation based on type
    switch (condition.type) {
      case 'equals':
        return condition.field === condition.value;
      case 'contains':
        return String(condition.field).includes(String(condition.value));
      default:
        return true;
    }
  }

  private async applyEnhancements(
    instruction: AgentInstruction,
    context?: ConversationContext
  ): Promise<{ instruction: AgentInstruction; applied: string[] }> {
    const applied: string[] = [];
    let enhanced = { ...instruction };

    // Add context awareness
    if (context && !enhanced.metadata?.context_window) {
      enhanced.metadata = {
        ...enhanced.metadata,
        context_window: Math.min(4000, context.messages.length * 100)
      };
      applied.push('context_awareness');
    }

    // Add caching if beneficial
    if (!enhanced.metadata?.cache_enabled && this.shouldCache(enhanced)) {
      enhanced.metadata = {
        ...enhanced.metadata,
        cache_enabled: true,
        cache_ttl: 300000 // 5 minutes
      };
      applied.push('caching');
    }

    return { instruction: enhanced, applied };
  }

  private shouldCache(instruction: AgentInstruction): boolean {
    return instruction.type === 'system_prompt' || 
           instruction.content.length > 1000 ||
           instruction.metadata?.priority === 'high';
  }

  private validateInstructionType(instruction: AgentInstruction): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const validTypes: AgentInstructionType[] = [
      'system_prompt', 'workflow_step', 'context_injection', 'tool_use', 'multi_modal',
      'image_analysis', 'audio_processing', 'code_generation', 'code_analysis', 
      'data_analysis', 'template_instruction', 'conditional_instruction',
      'loop_instruction', 'parallel_instruction', 'validation_instruction'
    ];

    if (!validTypes.includes(instruction.type)) {
      errors.push({
        code: 'INVALID_TYPE',
        message: `Invalid instruction type: ${instruction.type}`,
        field: 'type',
        severity: 'error'
      });
    }

    return { errors, warnings };
  }

  private validateMetadata(metadata: any): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (metadata.temperature !== undefined) {
      if (typeof metadata.temperature !== 'number' || metadata.temperature < 0 || metadata.temperature > 2) {
        errors.push({
          code: 'INVALID_TEMPERATURE',
          message: 'Temperature must be a number between 0 and 2',
          field: 'metadata.temperature',
          severity: 'error'
        });
      }
    }

    if (metadata.max_tokens !== undefined) {
      if (typeof metadata.max_tokens !== 'number' || metadata.max_tokens < 1) {
        errors.push({
          code: 'INVALID_MAX_TOKENS',
          message: 'max_tokens must be a positive number',
          field: 'metadata.max_tokens',
          severity: 'error'
        });
      }
    }

    return { errors, warnings };
  }

  private extractContextVariables(context: ConversationContext): Record<string, any> {
    return {
      message_count: context.messages.length,
      total_tokens: context.metadata.total_tokens,
      last_model: context.metadata.last_model_used,
      context_id: context.id,
      created_at: context.metadata.created_at.toISOString()
    };
  }

  private updateProcessingStats(processingTime: number): void {
    this.processingStats.total_processed++;
    const totalTime = this.processingStats.average_processing_time * (this.processingStats.total_processed - 1);
    this.processingStats.average_processing_time = (totalTime + processingTime) / this.processingStats.total_processed;
  }

  private initializeDefaultTemplates(): void {
    // Add some default templates for common use cases
    const defaultTemplates: InstructionTemplate[] = [
      {
        id: 'system-prompt-with-context',
        name: 'System Prompt with Context',
        template: 'You are {{role}}. Context: {{context}}. Instructions: {{instructions}}',
        required_variables: ['role', 'instructions'],
        optional_variables: { context: 'No additional context provided' },
        engine: 'handlebars',
        metadata: {
          description: 'Basic system prompt template with role and context',
          category: 'system',
          tags: ['prompt', 'system', 'context']
        }
      }
    ];

    for (const template of defaultTemplates) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): typeof this.processingStats {
    return { ...this.processingStats };
  }

  /**
   * Clear processing cache
   */
  clearCache(): void {
    this.validationCache.clear();
    this.emit('cache_cleared');
  }

  /**
   * Add a custom template
   */
  addTemplate(template: InstructionTemplate): void {
    this.templates.set(template.id, template);
    this.emit('template_added', template);
  }

  /**
   * Get available templates
   */
  getTemplates(): InstructionTemplate[] {
    return Array.from(this.templates.values());
  }
}

export default InstructionProcessor;