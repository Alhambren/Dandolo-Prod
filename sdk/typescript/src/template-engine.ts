/**
 * Advanced Template Engine for Dandolo Agent SDK
 * 
 * Provides comprehensive template processing with support for multiple formats,
 * variable substitution, conditional rendering, loops, and advanced features.
 */

import { EventEmitter } from 'eventemitter3';
import {
  InstructionTemplate,
  ConversationContext,
  DandoloError
} from './types';
import { createDandoloError } from './errors';

/**
 * Template processing result
 */
export interface TemplateProcessingResult {
  /** Rendered content */
  content: string;
  
  /** Variables that were used */
  variables_used: string[];
  
  /** Variables that were missing */
  missing_variables: string[];
  
  /** Processing metadata */
  metadata: {
    processing_time_ms: number;
    template_engine: string;
    functions_executed: string[];
    conditionals_evaluated: number;
    loops_executed: number;
  };
}

/**
 * Template context with built-in functions and filters
 */
export interface TemplateContext {
  /** User-provided variables */
  variables: Record<string, any>;
  
  /** Built-in functions */
  functions: Record<string, (...args: any[]) => any>;
  
  /** Built-in filters */
  filters: Record<string, (value: any, ...args: any[]) => any>;
  
  /** Conversation context */
  conversation?: ConversationContext;
  
  /** Global configuration */
  config?: Record<string, any>;
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  /** Whether template is valid */
  valid: boolean;
  
  /** Validation errors */
  errors: string[];
  
  /** Validation warnings */
  warnings: string[];
  
  /** Required variables found in template */
  required_variables: string[];
  
  /** Optional variables with defaults */
  optional_variables: Record<string, any>;
  
  /** Functions used in template */
  functions_used: string[];
  
  /** Estimated complexity score */
  complexity_score: number;
}

/**
 * Advanced Template Engine
 * 
 * Supports multiple template formats with advanced features like
 * conditionals, loops, functions, filters, and more.
 */
export class TemplateEngine extends EventEmitter {
  private templates = new Map<string, InstructionTemplate>();
  private compiledTemplates = new Map<string, any>();
  private processingStats = {
    total_processed: 0,
    cache_hits: 0,
    compilation_errors: 0,
    rendering_errors: 0,
    average_processing_time: 0
  };

  // Built-in functions available in templates
  private readonly BUILT_IN_FUNCTIONS = {
    // String functions
    upper: (str: string) => str.toUpperCase(),
    lower: (str: string) => str.toLowerCase(),
    capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
    trim: (str: string) => str.trim(),
    replace: (str: string, search: string, replace: string) => str.replace(new RegExp(search, 'g'), replace),
    substring: (str: string, start: number, end?: number) => str.substring(start, end),
    
    // Number functions
    format_number: (num: number, decimals = 2) => num.toFixed(decimals),
    round: (num: number) => Math.round(num),
    ceil: (num: number) => Math.ceil(num),
    floor: (num: number) => Math.floor(num),
    
    // Date functions
    format_date: (date: Date | string, format = 'YYYY-MM-DD') => {
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    },
    now: () => new Date(),
    timestamp: () => Date.now(),
    
    // Array functions
    join: (arr: any[], separator = ', ') => arr.join(separator),
    length: (arr: any[]) => arr.length,
    first: (arr: any[]) => arr[0],
    last: (arr: any[]) => arr[arr.length - 1],
    slice: (arr: any[], start: number, end?: number) => arr.slice(start, end),
    
    // Object functions
    keys: (obj: Record<string, any>) => Object.keys(obj),
    values: (obj: Record<string, any>) => Object.values(obj),
    
    // Utility functions
    default: (value: any, defaultValue: any) => value ?? defaultValue,
    escape_html: (str: string) => str.replace(/[&<>"']/g, (match) => {
      const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return escapeMap[match];
    }),
    escape_json: (str: string) => JSON.stringify(str),
    
    // Conditional functions
    if: (condition: any, trueValue: any, falseValue: any) => condition ? trueValue : falseValue,
    unless: (condition: any, value: any, falseValue: any) => !condition ? value : falseValue,
    
    // Random functions
    random: () => Math.random(),
    random_int: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
    uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })
  };

  // Built-in filters for value transformation
  private readonly BUILT_IN_FILTERS = {
    // String filters
    upper: (value: string) => value.toUpperCase(),
    lower: (value: string) => value.toLowerCase(),
    title: (value: string) => value.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
    reverse: (value: string) => value.split('').reverse().join(''),
    
    // Number filters
    currency: (value: number, symbol = '$') => `${symbol}${value.toFixed(2)}`,
    percentage: (value: number) => `${(value * 100).toFixed(2)}%`,
    
    // Array filters
    sort: (arr: any[]) => [...arr].sort(),
    unique: (arr: any[]) => [...new Set(arr)],
    
    // Date filters
    date: (value: Date | string, format = 'YYYY-MM-DD') => {
      const date = new Date(value);
      return date.toISOString().split('T')[0];
    },
    
    // Utility filters
    json: (value: any) => JSON.stringify(value, null, 2),
    truncate: (value: string, length = 100) => 
      value.length > length ? value.substring(0, length) + '...' : value
  };

  constructor() {
    super();
  }

  /**
   * Process a template with variables and context
   */
  async processTemplate(
    template: string | InstructionTemplate,
    context: TemplateContext
  ): Promise<TemplateProcessingResult> {
    const startTime = Date.now();
    
    try {
      let templateObj: InstructionTemplate;
      
      if (typeof template === 'string') {
        // Create a temporary template object
        templateObj = {
          id: `temp_${Date.now()}`,
          name: 'Temporary Template',
          template,
          required_variables: [],
          engine: 'handlebars'
        };
      } else {
        templateObj = template;
      }

      // Validate template first
      const validation = await this.validateTemplate(templateObj);
      if (!validation.valid) {
        throw createDandoloError({
          response: {
            status: 400,
            data: {
              error: {
                message: 'Template validation failed',
                type: 'validation_error',
                code: 'invalid_template',
                details: validation.errors
              }
            }
          }
        });
      }

      // Check for missing required variables
      const missingVariables = validation.required_variables.filter(
        variable => !(variable in context.variables)
      );

      if (missingVariables.length > 0) {
        throw createDandoloError({
          response: {
            status: 400,
            data: {
              error: {
                message: 'Missing required template variables',
                type: 'validation_error',
                code: 'missing_variables',
                details: { missing: missingVariables }
              }
            }
          }
        });
      }

      // Process template based on engine
      const result = await this.renderTemplate(templateObj, context);
      
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime);

      this.emit('template_processed', {
        template: templateObj,
        result,
        processing_time_ms: processingTime
      });

      return {
        content: result.content,
        variables_used: result.variables_used,
        missing_variables: missingVariables,
        metadata: {
          processing_time_ms: processingTime,
          template_engine: templateObj.engine,
          functions_executed: result.functions_executed,
          conditionals_evaluated: result.conditionals_evaluated,
          loops_executed: result.loops_executed
        }
      };

    } catch (error) {
      this.processingStats.rendering_errors++;
      this.emit('template_error', { template, error });
      throw error;
    }
  }

  /**
   * Validate a template for syntax and requirements
   */
  async validateTemplate(template: InstructionTemplate): Promise<TemplateValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredVariables: string[] = [];
    const optionalVariables: Record<string, any> = {};
    const functionsUsed: string[] = [];
    let complexityScore = 0;

    try {
      // Basic validation
      if (!template.template || template.template.trim().length === 0) {
        errors.push('Template content cannot be empty');
      }

      if (!template.engine) {
        warnings.push('No template engine specified, defaulting to handlebars');
      }

      // Engine-specific validation
      switch (template.engine) {
        case 'handlebars':
          const handlebarsValidation = this.validateHandlebarsTemplate(template.template);
          errors.push(...handlebarsValidation.errors);
          warnings.push(...handlebarsValidation.warnings);
          requiredVariables.push(...handlebarsValidation.variables);
          functionsUsed.push(...handlebarsValidation.functions);
          complexityScore += handlebarsValidation.complexity;
          break;

        case 'mustache':
          const mustacheValidation = this.validateMustacheTemplate(template.template);
          errors.push(...mustacheValidation.errors);
          warnings.push(...mustacheValidation.warnings);
          requiredVariables.push(...mustacheValidation.variables);
          complexityScore += mustacheValidation.complexity;
          break;

        case 'jinja2':
          const jinja2Validation = this.validateJinja2Template(template.template);
          errors.push(...jinja2Validation.errors);
          warnings.push(...jinja2Validation.warnings);
          requiredVariables.push(...jinja2Validation.variables);
          functionsUsed.push(...jinja2Validation.functions);
          complexityScore += jinja2Validation.complexity;
          break;

        case 'liquid':
          const liquidValidation = this.validateLiquidTemplate(template.template);
          errors.push(...liquidValidation.errors);
          warnings.push(...liquidValidation.warnings);
          requiredVariables.push(...liquidValidation.variables);
          functionsUsed.push(...liquidValidation.functions);
          complexityScore += liquidValidation.complexity;
          break;

        default:
          errors.push(`Unsupported template engine: ${template.engine}`);
      }

      // Security validation
      const securityValidation = this.validateTemplateSecurity(template.template);
      errors.push(...securityValidation.errors);
      warnings.push(...securityValidation.warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        required_variables: [...new Set(requiredVariables)],
        optional_variables: optionalVariables,
        functions_used: [...new Set(functionsUsed)],
        complexity_score: complexityScore
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Template validation failed: ${error.message}`],
        warnings: [],
        required_variables: [],
        optional_variables: {},
        functions_used: [],
        complexity_score: 0
      };
    }
  }

  /**
   * Render template with the specified engine
   */
  private async renderTemplate(
    template: InstructionTemplate,
    context: TemplateContext
  ): Promise<{
    content: string;
    variables_used: string[];
    functions_executed: string[];
    conditionals_evaluated: number;
    loops_executed: number;
  }> {
    // Create enhanced context with built-in functions and filters
    const enhancedContext = {
      ...context,
      functions: {
        ...this.BUILT_IN_FUNCTIONS,
        ...context.functions
      },
      filters: {
        ...this.BUILT_IN_FILTERS,
        ...context.filters
      }
    };

    let content: string;
    let variablesUsed: string[] = [];
    let functionsExecuted: string[] = [];
    let conditionalsEvaluated = 0;
    let loopsExecuted = 0;

    switch (template.engine) {
      case 'handlebars':
        const handlebarsResult = await this.renderHandlebarsTemplate(template, enhancedContext);
        content = handlebarsResult.content;
        variablesUsed = handlebarsResult.variables_used;
        functionsExecuted = handlebarsResult.functions_executed;
        conditionalsEvaluated = handlebarsResult.conditionals_evaluated;
        loopsExecuted = handlebarsResult.loops_executed;
        break;

      case 'mustache':
        const mustacheResult = await this.renderMustacheTemplate(template, enhancedContext);
        content = mustacheResult.content;
        variablesUsed = mustacheResult.variables_used;
        break;

      case 'jinja2':
        const jinja2Result = await this.renderJinja2Template(template, enhancedContext);
        content = jinja2Result.content;
        variablesUsed = jinja2Result.variables_used;
        functionsExecuted = jinja2Result.functions_executed;
        conditionalsEvaluated = jinja2Result.conditionals_evaluated;
        loopsExecuted = jinja2Result.loops_executed;
        break;

      case 'liquid':
        const liquidResult = await this.renderLiquidTemplate(template, enhancedContext);
        content = liquidResult.content;
        variablesUsed = liquidResult.variables_used;
        functionsExecuted = liquidResult.functions_executed;
        conditionalsEvaluated = liquidResult.conditionals_evaluated;
        loopsExecuted = liquidResult.loops_executed;
        break;

      default:
        // Fallback to simple template processing
        content = this.renderSimpleTemplate(template.template, context.variables);
        variablesUsed = this.extractVariableNames(template.template);
    }

    return {
      content,
      variables_used: variablesUsed,
      functions_executed: functionsExecuted,
      conditionals_evaluated: conditionalsEvaluated,
      loops_executed: loopsExecuted
    };
  }

  // Engine-specific validation methods
  private validateHandlebarsTemplate(template: string): {
    errors: string[];
    warnings: string[];
    variables: string[];
    functions: string[];
    complexity: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const variables: string[] = [];
    const functions: string[] = [];
    let complexity = 0;

    // Basic syntax validation
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Mismatched handlebars braces');
    }

    // Extract variables and helpers
    const variablePattern = /\{\{\s*([^}#/\s]+)\s*\}\}/g;
    let match;
    
    while ((match = variablePattern.exec(template)) !== null) {
      const variable = match[1];
      if (variable.includes('(')) {
        // It's a helper/function
        const functionName = variable.split('(')[0].trim();
        functions.push(functionName);
        complexity += 2;
      } else {
        variables.push(variable);
        complexity += 1;
      }
    }

    // Check for conditionals
    const conditionalPattern = /\{\{#(if|unless|each|with)\s/g;
    const conditionals = (template.match(conditionalPattern) || []).length;
    complexity += conditionals * 3;

    return {
      errors,
      warnings,
      variables: [...new Set(variables)],
      functions: [...new Set(functions)],
      complexity
    };
  }

  private validateMustacheTemplate(template: string): {
    errors: string[];
    warnings: string[];
    variables: string[];
    complexity: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const variables: string[] = [];
    let complexity = 0;

    // Basic mustache validation
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Mismatched mustache braces');
    }

    // Extract variables
    const variablePattern = /\{\{\s*([^}#/\s]+)\s*\}\}/g;
    let match;
    
    while ((match = variablePattern.exec(template)) !== null) {
      variables.push(match[1]);
      complexity += 1;
    }

    // Check for sections
    const sectionPattern = /\{\{#\w+\}\}/g;
    const sections = (template.match(sectionPattern) || []).length;
    complexity += sections * 2;

    return {
      errors,
      warnings,
      variables: [...new Set(variables)],
      complexity
    };
  }

  private validateJinja2Template(template: string): {
    errors: string[];
    warnings: string[];
    variables: string[];
    functions: string[];
    complexity: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const variables: string[] = [];
    const functions: string[] = [];
    let complexity = 0;

    // Basic Jinja2 validation
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;
    const openStatements = (template.match(/\{%/g) || []).length;
    const closeStatements = (template.match(/%\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Mismatched Jinja2 expression braces');
    }
    
    if (openStatements !== closeStatements) {
      errors.push('Mismatched Jinja2 statement braces');
    }

    // Extract variables and functions
    const variablePattern = /\{\{\s*([^}|]+)(\|[^}]+)?\s*\}\}/g;
    let match;
    
    while ((match = variablePattern.exec(template)) !== null) {
      const variable = match[1].trim();
      if (variable.includes('(')) {
        const functionName = variable.split('(')[0].trim();
        functions.push(functionName);
        complexity += 2;
      } else {
        variables.push(variable);
        complexity += 1;
      }
    }

    // Check for control structures
    const controlPattern = /\{%\s*(if|for|while|set|macro)\s/g;
    const controls = (template.match(controlPattern) || []).length;
    complexity += controls * 3;

    return {
      errors,
      warnings,
      variables: [...new Set(variables)],
      functions: [...new Set(functions)],
      complexity
    };
  }

  private validateLiquidTemplate(template: string): {
    errors: string[];
    warnings: string[];
    variables: string[];
    functions: string[];
    complexity: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const variables: string[] = [];
    const functions: string[] = [];
    let complexity = 0;

    // Basic Liquid validation
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;
    const openTags = (template.match(/\{%/g) || []).length;
    const closeTags = (template.match(/%\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Mismatched Liquid object braces');
    }
    
    if (openTags !== closeTags) {
      errors.push('Mismatched Liquid tag braces');
    }

    // Extract variables and filters
    const variablePattern = /\{\{\s*([^}|]+)(\|[^}]+)?\s*\}\}/g;
    let match;
    
    while ((match = variablePattern.exec(template)) !== null) {
      const variable = match[1].trim();
      variables.push(variable);
      complexity += 1;
      
      if (match[2]) {
        // Has filters
        const filters = match[2].split('|').slice(1);
        functions.push(...filters.map(f => f.trim().split(' ')[0]));
        complexity += filters.length;
      }
    }

    // Check for tags
    const tagPattern = /\{%\s*(if|for|case|unless|capture)\s/g;
    const tags = (template.match(tagPattern) || []).length;
    complexity += tags * 3;

    return {
      errors,
      warnings,
      variables: [...new Set(variables)],
      functions: [...new Set(functions)],
      complexity
    };
  }

  private validateTemplateSecurity(template: string): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/i,
      /function\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i // Event handlers
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(template)) {
        errors.push(`Potentially dangerous content detected: ${pattern.source}`);
      }
    }

    // Check for excessive complexity
    const complexity = template.length + (template.match(/\{\{/g) || []).length * 2;
    if (complexity > 10000) {
      warnings.push('Template complexity is very high, consider simplifying');
    }

    return { errors, warnings };
  }

  // Engine-specific rendering methods (simplified implementations)
  private async renderHandlebarsTemplate(
    template: InstructionTemplate,
    context: TemplateContext
  ): Promise<{
    content: string;
    variables_used: string[];
    functions_executed: string[];
    conditionals_evaluated: number;
    loops_executed: number;
  }> {
    // Simplified handlebars-like rendering
    let content = template.template;
    const variablesUsed: string[] = [];
    const functionsExecuted: string[] = [];
    let conditionalsEvaluated = 0;
    let loopsExecuted = 0;

    // Replace simple variables
    const variablePattern = /\{\{\s*([^}#/\s]+)\s*\}\}/g;
    content = content.replace(variablePattern, (match, variable) => {
      if (variable in context.variables) {
        variablesUsed.push(variable);
        return String(context.variables[variable]);
      }
      return match;
    });

    // Handle simple conditionals
    const conditionalPattern = /\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs;
    content = content.replace(conditionalPattern, (match, variable, block) => {
      conditionalsEvaluated++;
      if (context.variables[variable]) {
        variablesUsed.push(variable);
        return block;
      }
      return '';
    });

    return {
      content,
      variables_used: [...new Set(variablesUsed)],
      functions_executed: [...new Set(functionsExecuted)],
      conditionals_evaluated: conditionalsEvaluated,
      loops_executed: loopsExecuted
    };
  }

  private async renderMustacheTemplate(
    template: InstructionTemplate,
    context: TemplateContext
  ): Promise<{ content: string; variables_used: string[] }> {
    // Simplified mustache rendering
    let content = template.template;
    const variablesUsed: string[] = [];

    const variablePattern = /\{\{\s*([^}]+)\s*\}\}/g;
    content = content.replace(variablePattern, (match, variable) => {
      if (variable in context.variables) {
        variablesUsed.push(variable);
        return String(context.variables[variable]);
      }
      return match;
    });

    return {
      content,
      variables_used: [...new Set(variablesUsed)]
    };
  }

  private async renderJinja2Template(
    template: InstructionTemplate,
    context: TemplateContext
  ): Promise<{
    content: string;
    variables_used: string[];
    functions_executed: string[];
    conditionals_evaluated: number;
    loops_executed: number;
  }> {
    // Simplified jinja2-like rendering
    return this.renderHandlebarsTemplate(template, context);
  }

  private async renderLiquidTemplate(
    template: InstructionTemplate,
    context: TemplateContext
  ): Promise<{
    content: string;
    variables_used: string[];
    functions_executed: string[];
    conditionals_evaluated: number;
    loops_executed: number;
  }> {
    // Simplified liquid-like rendering
    return this.renderHandlebarsTemplate(template, context);
  }

  private renderSimpleTemplate(template: string, variables: Record<string, any>): string {
    let content = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      content = content.replace(regex, String(value));
    }
    
    return content;
  }

  private extractVariableNames(template: string): string[] {
    const variables: string[] = [];
    const pattern = /\{\{\s*([^}]+)\s*\}\}/g;
    let match;
    
    while ((match = pattern.exec(template)) !== null) {
      variables.push(match[1].trim());
    }
    
    return [...new Set(variables)];
  }

  private updateProcessingStats(processingTime: number): void {
    this.processingStats.total_processed++;
    const totalTime = this.processingStats.average_processing_time * (this.processingStats.total_processed - 1);
    this.processingStats.average_processing_time = (totalTime + processingTime) / this.processingStats.total_processed;
  }

  /**
   * Get template processing statistics
   */
  getProcessingStats(): typeof this.processingStats {
    return { ...this.processingStats };
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.compiledTemplates.clear();
    this.emit('cache_cleared');
  }

  /**
   * Register a custom function
   */
  registerFunction(name: string, fn: (...args: any[]) => any): void {
    this.BUILT_IN_FUNCTIONS[name] = fn;
    this.emit('function_registered', { name, fn });
  }

  /**
   * Register a custom filter
   */
  registerFilter(name: string, fn: (value: any, ...args: any[]) => any): void {
    this.BUILT_IN_FILTERS[name] = fn;
    this.emit('filter_registered', { name, fn });
  }

  /**
   * Get available functions
   */
  getAvailableFunctions(): string[] {
    return Object.keys(this.BUILT_IN_FUNCTIONS);
  }

  /**
   * Get available filters
   */
  getAvailableFilters(): string[] {
    return Object.keys(this.BUILT_IN_FILTERS);
  }
}

export default TemplateEngine;