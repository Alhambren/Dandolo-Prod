/**
 * Comprehensive Unit Tests for TemplateEngine
 * 
 * Tests template processing, validation, variable substitution,
 * and all supported template formats.
 */

import { TemplateEngine, TemplateContext, TemplateProcessingResult } from '../template-engine';
import { InstructionTemplate, ConversationContext } from '../types';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  afterEach(() => {
    engine.removeAllListeners();
    engine.clearCache();
  });

  describe('processTemplate', () => {
    it('should process simple string template', async () => {
      const template = 'Hello {{name}}!';
      const context: TemplateContext = {
        variables: { name: 'World' },
        functions: {},
        filters: {}
      };

      const result = await engine.processTemplate(template, context);

      expect(result.content).toBe('Hello World!');
      expect(result.variables_used).toContain('name');
      expect(result.metadata.template_engine).toBe('handlebars');
    });

    it('should process InstructionTemplate object', async () => {
      const template: InstructionTemplate = {
        id: 'test-template',
        name: 'Test Template',
        template: 'Welcome {{user}} to {{platform}}!',
        required_variables: ['user', 'platform'],
        engine: 'handlebars'
      };

      const context: TemplateContext = {
        variables: { user: 'John', platform: 'Dandolo' },
        functions: {},
        filters: {}
      };

      const result = await engine.processTemplate(template, context);

      expect(result.content).toBe('Welcome John to Dandolo!');
      expect(result.variables_used).toEqual(expect.arrayContaining(['user', 'platform']));
    });

    it('should throw error for missing required variables', async () => {
      const template: InstructionTemplate = {
        id: 'test-template',
        name: 'Test Template',
        template: 'Hello {{name}}!',
        required_variables: ['name'],
        engine: 'handlebars'
      };

      const context: TemplateContext = {
        variables: {}, // Missing 'name'
        functions: {},
        filters: {}
      };

      await expect(engine.processTemplate(template, context))
        .rejects.toThrow('Missing required template variables');
    });

    it('should use built-in functions', async () => {
      const template = 'Uppercase: {{upper name}}';
      const context: TemplateContext = {
        variables: { name: 'hello' },
        functions: {},
        filters: {}
      };

      const result = await engine.processTemplate(template, context);

      expect(result.content).toBe('Uppercase: HELLO');
      expect(result.metadata.functions_executed).toContain('upper');
    });

    it('should use custom functions', async () => {
      const template = 'Custom: {{custom_func value}}';
      const context: TemplateContext = {
        variables: { value: 'test' },
        functions: {
          custom_func: (val: string) => val.repeat(2)
        },
        filters: {}
      };

      const result = await engine.processTemplate(template, context);

      expect(result.content).toBe('Custom: testtest');
    });

    it('should handle conversation context variables', async () => {
      const template = 'Messages: {{message_count}}, Tokens: {{total_tokens}}';
      
      const conversationContext: ConversationContext = {
        id: 'test-context',
        messages: [
          { role: 'user', content: 'Hello', id: '1', created_at: new Date() },
          { role: 'assistant', content: 'Hi', id: '2', created_at: new Date() }
        ],
        metadata: {
          created_at: new Date(),
          updated_at: new Date(),
          message_count: 2,
          total_tokens: 50
        }
      };

      const context: TemplateContext = {
        variables: {},
        functions: {},
        filters: {},
        conversation: conversationContext
      };

      const result = await engine.processTemplate(template, context);

      expect(result.content).toBe('Messages: 2, Tokens: 50');
    });

    it('should emit processing events', async () => {
      const template = 'Test {{value}}';
      const context: TemplateContext = {
        variables: { value: 'event' },
        functions: {},
        filters: {}
      };

      const eventPromise = new Promise((resolve) => {
        engine.once('template_processed', resolve);
      });

      await engine.processTemplate(template, context);
      const event = await eventPromise;

      expect(event).toBeDefined();
    });
  });

  describe('validateTemplate', () => {
    it('should validate handlebars template syntax', async () => {
      const template: InstructionTemplate = {
        id: 'test',
        name: 'Test',
        template: '{{name}} has {{#if items}}{{items.length}}{{/if}} items',
        required_variables: [],
        engine: 'handlebars'
      };

      const result = await engine.validateTemplate(template);

      expect(result.valid).toBe(true);
      expect(result.required_variables).toContain('name');
      expect(result.required_variables).toContain('items');
      expect(result.complexity_score).toBeGreaterThan(0);
    });

    it('should detect mismatched braces', async () => {
      const template: InstructionTemplate = {
        id: 'test',
        name: 'Test',
        template: '{{name} missing closing brace',
        required_variables: [],
        engine: 'handlebars'
      };

      const result = await engine.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mismatched handlebars braces');
    });

    it('should validate mustache templates', async () => {
      const template: InstructionTemplate = {
        id: 'test',
        name: 'Test',
        template: '{{name}} {{#items}}{{.}}{{/items}}',
        required_variables: [],
        engine: 'mustache'
      };

      const result = await engine.validateTemplate(template);

      expect(result.valid).toBe(true);
      expect(result.required_variables).toContain('name');
      expect(result.required_variables).toContain('items');
    });

    it('should validate jinja2 templates', async () => {
      const template: InstructionTemplate = {
        id: 'test',
        name: 'Test',
        template: '{{ name }} {% if items %}{{ items|length }}{% endif %}',
        required_variables: [],
        engine: 'jinja2'
      };

      const result = await engine.validateTemplate(template);

      expect(result.valid).toBe(true);
      expect(result.required_variables).toContain('name');
      expect(result.required_variables).toContain('items');
    });

    it('should validate liquid templates', async () => {
      const template: InstructionTemplate = {
        id: 'test',
        name: 'Test',
        template: '{{ name }} {% if items %}{{ items | size }}{% endif %}',
        required_variables: [],
        engine: 'liquid'
      };

      const result = await engine.validateTemplate(template);

      expect(result.valid).toBe(true);
      expect(result.required_variables).toContain('name');
      expect(result.functions_used).toContain('size');
    });

    it('should detect security threats in templates', async () => {
      const template: InstructionTemplate = {
        id: 'test',
        name: 'Test',
        template: '<script>alert("xss")</script>{{name}}',
        required_variables: [],
        engine: 'handlebars'
      };

      const result = await engine.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('dangerous content'))).toBe(true);
    });

    it('should warn about high complexity templates', async () => {
      const complexTemplate = 'a'.repeat(10001); // Very long template
      const template: InstructionTemplate = {
        id: 'test',
        name: 'Test',
        template: complexTemplate,
        required_variables: [],
        engine: 'handlebars'
      };

      const result = await engine.validateTemplate(template);

      expect(result.warnings.some(w => w.includes('complexity'))).toBe(true);
    });

    it('should handle unsupported template engines', async () => {
      const template: InstructionTemplate = {
        id: 'test',
        name: 'Test',
        template: '{{name}}',
        required_variables: [],
        engine: 'unsupported' as any
      };

      const result = await engine.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unsupported template engine'))).toBe(true);
    });
  });

  describe('built-in functions', () => {
    const context: TemplateContext = {
      variables: {},
      functions: {},
      filters: {}
    };

    it('should provide string functions', async () => {
      const templates = [
        { template: '{{upper "hello"}}', expected: 'HELLO' },
        { template: '{{lower "HELLO"}}', expected: 'hello' },
        { template: '{{capitalize "hello world"}}', expected: 'Hello world' },
        { template: '{{trim " hello "}}', expected: 'hello' }
      ];

      for (const { template, expected } of templates) {
        const result = await engine.processTemplate(template, context);
        expect(result.content).toBe(expected);
      }
    });

    it('should provide number functions', async () => {
      const templates = [
        { template: '{{format_number 3.14159 2}}', expected: '3.14' },
        { template: '{{round 3.7}}', expected: '4' },
        { template: '{{ceil 3.1}}', expected: '4' },
        { template: '{{floor 3.9}}', expected: '3' }
      ];

      for (const { template, expected } of templates) {
        const result = await engine.processTemplate(template, {
          ...context,
          variables: {}
        });
        expect(result.content).toBe(expected);
      }
    });

    it('should provide date functions', async () => {
      const testDate = new Date('2023-12-25');
      const context_with_date: TemplateContext = {
        variables: { test_date: testDate },
        functions: {},
        filters: {}
      };

      const result = await engine.processTemplate('{{format_date test_date}}', context_with_date);
      expect(result.content).toBe('2023-12-25');
    });

    it('should provide array functions', async () => {
      const context_with_array: TemplateContext = {
        variables: { items: ['a', 'b', 'c'] },
        functions: {},
        filters: {}
      };

      const templates = [
        { template: '{{join items ","}}', expected: 'a,b,c' },
        { template: '{{length items}}', expected: '3' },
        { template: '{{first items}}', expected: 'a' },
        { template: '{{last items}}', expected: 'c' }
      ];

      for (const { template, expected } of templates) {
        const result = await engine.processTemplate(template, context_with_array);
        expect(result.content).toBe(expected);
      }
    });

    it('should provide utility functions', async () => {
      const context_with_values: TemplateContext = {
        variables: { value: null, fallback: 'default' },
        functions: {},
        filters: {}
      };

      const result = await engine.processTemplate('{{default value fallback}}', context_with_values);
      expect(result.content).toBe('default');
    });

    it('should provide random functions', async () => {
      const result = await engine.processTemplate('{{uuid}}', context);
      expect(result.content).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe('built-in filters', () => {
    it('should provide string filters', async () => {
      const context_with_string: TemplateContext = {
        variables: { text: 'hello world' },
        functions: {},
        filters: {}
      };

      const templates = [
        { template: '{{text | upper}}', expected: 'HELLO WORLD' },
        { template: '{{text | title}}', expected: 'Hello World' },
        { template: '{{text | reverse}}', expected: 'dlrow olleh' }
      ];

      for (const { template, expected } of templates) {
        const result = await engine.processTemplate(template, context_with_string);
        expect(result.content).toBe(expected);
      }
    });

    it('should provide number filters', async () => {
      const context_with_number: TemplateContext = {
        variables: { price: 19.99, ratio: 0.75 },
        functions: {},
        filters: {}
      };

      const templates = [
        { template: '{{price | currency}}', expected: '$19.99' },
        { template: '{{ratio | percentage}}', expected: '75.00%' }
      ];

      for (const { template, expected } of templates) {
        const result = await engine.processTemplate(template, context_with_number);
        expect(result.content).toBe(expected);
      }
    });

    it('should provide utility filters', async () => {
      const context_with_data: TemplateContext = {
        variables: { 
          data: { key: 'value' },
          long_text: 'This is a very long text that should be truncated'
        },
        functions: {},
        filters: {}
      };

      const templates = [
        { template: '{{data | json}}', expected: JSON.stringify({ key: 'value' }, null, 2) },
        { template: '{{long_text | truncate 20}}', expected: 'This is a very long...' }
      ];

      for (const { template, expected } of templates) {
        const result = await engine.processTemplate(template, context_with_data);
        expect(result.content).toBe(expected);
      }
    });
  });

  describe('template rendering engines', () => {
    const context: TemplateContext = {
      variables: { name: 'World', items: ['a', 'b', 'c'] },
      functions: {},
      filters: {}
    };

    it('should render handlebars templates', async () => {
      const template: InstructionTemplate = {
        id: 'handlebars-test',
        name: 'Handlebars Test',
        template: 'Hello {{name}}! {{#if items}}Items: {{items.length}}{{/if}}',
        required_variables: ['name'],
        engine: 'handlebars'
      };

      const result = await engine.processTemplate(template, context);

      expect(result.content).toContain('Hello World!');
      expect(result.metadata.conditionals_evaluated).toBeGreaterThan(0);
    });

    it('should render mustache templates', async () => {
      const template: InstructionTemplate = {
        id: 'mustache-test',
        name: 'Mustache Test',
        template: 'Hello {{name}}!',
        required_variables: ['name'],
        engine: 'mustache'
      };

      const result = await engine.processTemplate(template, context);

      expect(result.content).toBe('Hello World!');
      expect(result.variables_used).toContain('name');
    });

    it('should render jinja2 templates', async () => {
      const template: InstructionTemplate = {
        id: 'jinja2-test',
        name: 'Jinja2 Test',
        template: 'Hello {{name}}!',
        required_variables: ['name'],
        engine: 'jinja2'
      };

      const result = await engine.processTemplate(template, context);

      expect(result.content).toBe('Hello World!');
    });

    it('should render liquid templates', async () => {
      const template: InstructionTemplate = {
        id: 'liquid-test',
        name: 'Liquid Test',
        template: 'Hello {{name}}!',
        required_variables: ['name'],
        engine: 'liquid'
      };

      const result = await engine.processTemplate(template, context);

      expect(result.content).toBe('Hello World!');
    });
  });

  describe('custom functions and filters', () => {
    it('should register custom functions', () => {
      const customFunction = (value: string) => value.toUpperCase();
      engine.registerFunction('my_upper', customFunction);

      const functions = engine.getAvailableFunctions();
      expect(functions).toContain('my_upper');
    });

    it('should register custom filters', () => {
      const customFilter = (value: string) => value.split('').reverse().join('');
      engine.registerFilter('my_reverse', customFilter);

      const filters = engine.getAvailableFilters();
      expect(filters).toContain('my_reverse');
    });

    it('should emit registration events', () => {
      const functionPromise = new Promise((resolve) => {
        engine.once('function_registered', resolve);
      });

      const filterPromise = new Promise((resolve) => {
        engine.once('filter_registered', resolve);
      });

      engine.registerFunction('test_func', () => 'test');
      engine.registerFilter('test_filter', (val) => val);

      return Promise.all([
        expect(functionPromise).resolves.toBeDefined(),
        expect(filterPromise).resolves.toBeDefined()
      ]);
    });
  });

  describe('error handling', () => {
    it('should handle template processing errors', async () => {
      const template: InstructionTemplate = {
        id: 'error-test',
        name: 'Error Test',
        template: '{{invalid syntax}',
        required_variables: [],
        engine: 'handlebars'
      };

      const context: TemplateContext = {
        variables: {},
        functions: {},
        filters: {}
      };

      await expect(engine.processTemplate(template, context))
        .rejects.toThrow('Template validation failed');
    });

    it('should emit error events', async () => {
      const template: InstructionTemplate = {
        id: 'error-test',
        name: 'Error Test',
        template: '{{invalid',
        required_variables: [],
        engine: 'handlebars'
      };

      const context: TemplateContext = {
        variables: {},
        functions: {},
        filters: {}
      };

      const errorPromise = new Promise((resolve) => {
        engine.once('template_error', resolve);
      });

      try {
        await engine.processTemplate(template, context);
      } catch (error) {
        // Expected to fail
      }

      const errorEvent = await errorPromise;
      expect(errorEvent).toBeDefined();
    });
  });

  describe('statistics and monitoring', () => {
    it('should track processing statistics', async () => {
      const template = 'Hello {{name}}!';
      const context: TemplateContext = {
        variables: { name: 'World' },
        functions: {},
        filters: {}
      };

      const statsBefore = engine.getProcessingStats();
      await engine.processTemplate(template, context);
      const statsAfter = engine.getProcessingStats();

      expect(statsAfter.total_processed).toBe(statsBefore.total_processed + 1);
      expect(statsAfter.average_processing_time).toBeGreaterThan(0);
    });

    it('should clear cache when requested', () => {
      const eventPromise = new Promise((resolve) => {
        engine.once('cache_cleared', resolve);
      });

      engine.clearCache();

      return expect(eventPromise).resolves.toBeUndefined();
    });
  });

  describe('performance', () => {
    it('should process templates efficiently', async () => {
      const template = 'Hello {{name}} from {{platform}}!';
      const context: TemplateContext = {
        variables: { name: 'User', platform: 'Dandolo' },
        functions: {},
        filters: {}
      };

      const startTime = Date.now();
      await engine.processTemplate(template, context);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should handle large templates', async () => {
      const largeTemplate = 'Data: ' + '{{item}} '.repeat(1000);
      const context: TemplateContext = {
        variables: { item: 'test' },
        functions: {},
        filters: {}
      };

      const result = await engine.processTemplate(largeTemplate, context);
      expect(result.content).toContain('Data: test');
    });
  });
});