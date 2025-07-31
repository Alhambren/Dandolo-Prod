/**
 * LlamaIndex Compatibility Adapter for Dandolo SDK
 * 
 * Provides seamless integration with LlamaIndex framework
 * while leveraging Dandolo's superior RAG and document processing capabilities.
 */

import { EventEmitter } from 'eventemitter3';
import {
  ChatMessage,
  AgentInstruction,
  ConversationContext,
  EnhancedChatMessage
} from '../types';
import { DandoloClient } from '../client';
import { createDandoloError } from '../errors';

// LlamaIndex-compatible interfaces
export interface LlamaIndexDocument {
  id_: string;
  text: string;
  metadata: Record<string, any>;
  embedding?: number[];
  score?: number;
}

export interface LlamaIndexNode {
  id_: string;
  text: string;
  metadata: Record<string, any>;
  relationships: Record<string, any>;
  embedding?: number[];
}

export interface LlamaIndexQueryEngine {
  query(queryStr: string): Promise<LlamaIndexResponse>;
  aquery(queryStr: string): Promise<LlamaIndexResponse>;
}

export interface LlamaIndexChatEngine {
  chat(message: string): Promise<LlamaIndexResponse>;
  achat(message: string): Promise<LlamaIndexResponse>;
  stream_chat(message: string): AsyncGenerator<string, LlamaIndexResponse>;
  reset(): void;
}

export interface LlamaIndexResponse {
  response: string;
  source_nodes?: LlamaIndexNode[];
  metadata?: Record<string, any>;
}

export interface LlamaIndexServiceContext {
  llm: LlamaIndexLLM;
  embed_model?: LlamaIndexEmbedding;
  node_parser?: LlamaIndexNodeParser;
  prompt_helper?: LlamaIndexPromptHelper;
}

export interface LlamaIndexLLM {
  complete(prompt: string): Promise<string>;
  chat(messages: ChatMessage[]): Promise<string>;
  stream_complete(prompt: string): AsyncGenerator<string>;
  stream_chat(messages: ChatMessage[]): AsyncGenerator<string>;
}

export interface LlamaIndexEmbedding {
  get_text_embedding(text: string): Promise<number[]>;
  get_text_embeddings(texts: string[]): Promise<number[][]>;
}

export interface LlamaIndexNodeParser {
  get_nodes_from_documents(documents: LlamaIndexDocument[]): LlamaIndexNode[];
}

export interface LlamaIndexPromptHelper {
  get_text_splitter_given_prompt(
    prompt_template: string,
    num_chunks: number
  ): (text: string) => string[];
}

/**
 * LlamaIndex-compatible adapter with enhanced RAG capabilities
 */
export class DandoloLlamaIndexAdapter extends EventEmitter {
  private documents: Map<string, LlamaIndexDocument> = new Map();
  private vectorStore: Map<string, number[]> = new Map();
  private conversationContexts: Map<string, ConversationContext> = new Map();

  constructor(private client: DandoloClient) {
    super();
  }

  /**
   * Create a LlamaIndex-compatible LLM wrapper
   */
  createLLM(options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): DandoloLlamaIndexLLM {
    return new DandoloLlamaIndexLLM(this.client, options);
  }

  /**
   * Create a simple vector store index
   */
  createVectorStoreIndex(documents: LlamaIndexDocument[]): DandoloVectorStoreIndex {
    // Store documents
    documents.forEach(doc => {
      this.documents.set(doc.id_, doc);
    });

    return new DandoloVectorStoreIndex(documents, this.client, this);
  }

  /**
   * Create a list index (simple concatenation-based)
   */
  createListIndex(documents: LlamaIndexDocument[]): DandoloListIndex {
    return new DandoloListIndex(documents, this.client);
  }

  /**
   * Create a tree index (hierarchical summarization)
   */
  createTreeIndex(documents: LlamaIndexDocument[]): DandoloTreeIndex {
    return new DandoloTreeIndex(documents, this.client);
  }

  /**
   * Create a keyword table index
   */
  createKeywordTableIndex(documents: LlamaIndexDocument[]): DandoloKeywordTableIndex {
    return new DandoloKeywordTableIndex(documents, this.client);
  }

  /**
   * Create a service context with Dandolo components
   */
  createServiceContext(options?: {
    llm?: LlamaIndexLLM;
    embed_model?: LlamaIndexEmbedding;
    chunk_size?: number;
    chunk_overlap?: number;
  }): LlamaIndexServiceContext {
    return {
      llm: options?.llm || this.createLLM(),
      embed_model: options?.embed_model || new DandoloEmbeddingModel(),
      node_parser: new DandoloNodeParser(options?.chunk_size, options?.chunk_overlap),
      prompt_helper: new DandoloPromptHelper()
    };
  }

  /**
   * Load documents from various sources
   */
  async loadDocuments(sources: Array<{
    type: 'text' | 'url' | 'file';
    content: string;
    metadata?: Record<string, any>;
  }>): Promise<LlamaIndexDocument[]> {
    const documents: LlamaIndexDocument[] = [];

    for (const source of sources) {
      let text = '';
      
      switch (source.type) {
        case 'text':
          text = source.content;
          break;
        case 'url':
          // In a real implementation, this would fetch the URL
          text = `Content from URL: ${source.content}`;
          break;
        case 'file':
          // In a real implementation, this would read the file
          text = `Content from file: ${source.content}`;
          break;
      }

      const doc: LlamaIndexDocument = {
        id_: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text,
        metadata: {
          source_type: source.type,
          source: source.content,
          ...source.metadata
        }
      };

      documents.push(doc);
    }

    return documents;
  }

  /**
   * Create a conversational retrieval chain
   */
  createConversationalRetrievalChain(
    index: DandoloVectorStoreIndex,
    options?: {
      context_id?: string;
      memory_enabled?: boolean;
      top_k?: number;
    }
  ): DandoloConversationalRetrievalChain {
    return new DandoloConversationalRetrievalChain(index, this.client, options);
  }

  /**
   * Simple text similarity search (placeholder for actual embedding similarity)
   */
  async searchSimilarDocuments(
    query: string,
    topK = 5
  ): Promise<LlamaIndexDocument[]> {
    const documents = Array.from(this.documents.values());
    
    // Simple keyword-based similarity (in production, use embeddings)
    const queryWords = query.toLowerCase().split(/\s+/);
    
    const scored = documents.map(doc => {
      const docWords = doc.text.toLowerCase().split(/\s+/);
      const overlap = queryWords.filter(word => docWords.includes(word)).length;
      return { doc, score: overlap / queryWords.length };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(item => ({ ...item.doc, score: item.score }));
  }
}

/**
 * LlamaIndex-compatible LLM wrapper
 */
export class DandoloLlamaIndexLLM implements LlamaIndexLLM {
  constructor(
    private client: DandoloClient,
    private options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    }
  ) {}

  async complete(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: this.options?.model,
      temperature: this.options?.temperature,
      max_tokens: this.options?.max_tokens
    });

    return response.choices[0]?.message.content || '';
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      messages,
      model: this.options?.model,
      temperature: this.options?.temperature,
      max_tokens: this.options?.max_tokens
    });

    return response.choices[0]?.message.content || '';
  }

  async* stream_complete(prompt: string): AsyncGenerator<string> {
    let buffer = '';
    
    await this.client.chat.completions.stream({
      messages: [{ role: 'user', content: prompt }],
      model: this.options?.model,
      temperature: this.options?.temperature,
      max_tokens: this.options?.max_tokens
    }, {
      onChunk: (chunk) => {
        if (chunk.content) {
          buffer += chunk.content;
        }
      }
    });

    // Yield buffered content (in a real implementation, this would yield in real-time)
    for (const char of buffer) {
      yield char;
    }
  }

  async* stream_chat(messages: ChatMessage[]): AsyncGenerator<string> {
    let buffer = '';
    
    await this.client.chat.completions.stream({
      messages,
      model: this.options?.model,
      temperature: this.options?.temperature,
      max_tokens: this.options?.max_tokens
    }, {
      onChunk: (chunk) => {
        if (chunk.content) {
          buffer += chunk.content;
        }
      }
    });

    for (const char of buffer) {
      yield char;
    }
  }
}

/**
 * Vector Store Index implementation
 */
export class DandoloVectorStoreIndex {
  constructor(
    private documents: LlamaIndexDocument[],
    private client: DandoloClient,
    private adapter: DandoloLlamaIndexAdapter
  ) {}

  /**
   * Create a query engine for this index
   */
  as_query_engine(options?: {
    similarity_top_k?: number;
    response_mode?: 'compact' | 'tree_summarize' | 'simple_summarize';
  }): LlamaIndexQueryEngine {
    return new DandoloQueryEngine(this, this.client, options);
  }

  /**
   * Create a chat engine for this index
   */
  as_chat_engine(options?: {
    chat_mode?: 'context' | 'condense_question' | 'react';
    similarity_top_k?: number;
  }): LlamaIndexChatEngine {
    return new DandoloChatEngine(this, this.client, options);
  }

  /**
   * Retrieve relevant documents for a query
   */
  async retrieve(query: string, topK = 5): Promise<LlamaIndexNode[]> {
    const similarDocs = await this.adapter.searchSimilarDocuments(query, topK);
    
    return similarDocs.map(doc => ({
      id_: doc.id_,
      text: doc.text,
      metadata: doc.metadata,
      relationships: {},
      embedding: doc.embedding
    }));
  }

  /**
   * Get all documents in the index
   */
  getDocuments(): LlamaIndexDocument[] {
    return [...this.documents];
  }
}

/**
 * List Index implementation (simple concatenation)
 */
export class DandoloListIndex {
  constructor(
    private documents: LlamaIndexDocument[],
    private client: DandoloClient
  ) {}

  as_query_engine(): LlamaIndexQueryEngine {
    return new DandoloQueryEngine(this, this.client);
  }

  as_chat_engine(): LlamaIndexChatEngine {
    return new DandoloChatEngine(this, this.client);
  }

  async retrieve(query: string): Promise<LlamaIndexNode[]> {
    // Return all documents as context
    return this.documents.map(doc => ({
      id_: doc.id_,
      text: doc.text,
      metadata: doc.metadata,
      relationships: {}
    }));
  }
}

/**
 * Tree Index implementation (hierarchical)
 */
export class DandoloTreeIndex {
  constructor(
    private documents: LlamaIndexDocument[],
    private client: DandoloClient
  ) {}

  as_query_engine(): LlamaIndexQueryEngine {
    return new DandoloQueryEngine(this, this.client);
  }

  as_chat_engine(): LlamaIndexChatEngine {
    return new DandoloChatEngine(this, this.client);
  }

  async retrieve(query: string): Promise<LlamaIndexNode[]> {
    // Simplified: return documents as hierarchical nodes
    return this.documents.map((doc, index) => ({
      id_: doc.id_,
      text: doc.text,
      metadata: { ...doc.metadata, level: index },
      relationships: { parent: index > 0 ? this.documents[index - 1]?.id_ : null }
    }));
  }
}

/**
 * Keyword Table Index implementation
 */
export class DandoloKeywordTableIndex {
  private keywordMap: Map<string, string[]> = new Map();

  constructor(
    private documents: LlamaIndexDocument[],
    private client: DandoloClient
  ) {
    this.buildKeywordMap();
  }

  as_query_engine(): LlamaIndexQueryEngine {
    return new DandoloQueryEngine(this, this.client);
  }

  as_chat_engine(): LlamaIndexChatEngine {
    return new DandoloChatEngine(this, this.client);
  }

  async retrieve(query: string): Promise<LlamaIndexNode[]> {
    const queryKeywords = this.extractKeywords(query);
    const relevantDocIds = new Set<string>();

    for (const keyword of queryKeywords) {
      const docIds = this.keywordMap.get(keyword) || [];
      docIds.forEach(id => relevantDocIds.add(id));
    }

    const relevantDocs = this.documents.filter(doc => 
      relevantDocIds.has(doc.id_)
    );

    return relevantDocs.map(doc => ({
      id_: doc.id_,
      text: doc.text,
      metadata: doc.metadata,
      relationships: {}
    }));
  }

  private buildKeywordMap(): void {
    for (const doc of this.documents) {
      const keywords = this.extractKeywords(doc.text);
      for (const keyword of keywords) {
        if (!this.keywordMap.has(keyword)) {
          this.keywordMap.set(keyword, []);
        }
        this.keywordMap.get(keyword)!.push(doc.id_);
      }
    }
  }

  private extractKeywords(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 20); // Limit keywords
  }
}

/**
 * Query Engine implementation
 */
export class DandoloQueryEngine implements LlamaIndexQueryEngine {
  constructor(
    private index: any, // Can be any index type
    private client: DandoloClient,
    private options?: {
      similarity_top_k?: number;
      response_mode?: string;
    }
  ) {}

  async query(queryStr: string): Promise<LlamaIndexResponse> {
    return this.aquery(queryStr);
  }

  async aquery(queryStr: string): Promise<LlamaIndexResponse> {
    // Retrieve relevant nodes
    const nodes = await this.index.retrieve(
      queryStr, 
      this.options?.similarity_top_k || 5
    );

    // Create context from retrieved nodes
    const context = nodes.map(node => node.text).join('\n\n');

    // Generate response using retrieved context
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant. Use the provided context to answer the user\'s question. If the context doesn\'t contain relevant information, say so.'
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${queryStr}`
      }
    ];

    const response = await this.client.chat.completions.create({
      messages,
      temperature: 0.1 // Lower temperature for factual responses
    });

    return {
      response: response.choices[0]?.message.content || '',
      source_nodes: nodes,
      metadata: {
        query: queryStr,
        context_length: context.length,
        nodes_used: nodes.length
      }
    };
  }
}

/**
 * Chat Engine implementation
 */
export class DandoloChatEngine implements LlamaIndexChatEngine {
  private conversationHistory: ChatMessage[] = [];

  constructor(
    private index: any,
    private client: DandoloClient,
    private options?: {
      chat_mode?: string;
      similarity_top_k?: number;
    }
  ) {}

  async chat(message: string): Promise<LlamaIndexResponse> {
    return this.achat(message);
  }

  async achat(message: string): Promise<LlamaIndexResponse> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message
    });

    // Retrieve relevant context
    const nodes = await this.index.retrieve(
      message,
      this.options?.similarity_top_k || 5
    );

    const context = nodes.map(node => node.text).join('\n\n');

    // Create messages with context and history
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a helpful assistant. Use the provided context to answer questions. Here's the relevant context:\n\n${context}`
      },
      ...this.conversationHistory
    ];

    const response = await this.client.chat.completions.create({
      messages,
      temperature: 0.3
    });

    const assistantResponse = response.choices[0]?.message.content || '';

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: assistantResponse
    });

    return {
      response: assistantResponse,
      source_nodes: nodes,
      metadata: {
        conversation_length: this.conversationHistory.length,
        context_nodes: nodes.length
      }
    };
  }

  async* stream_chat(message: string): AsyncGenerator<string, LlamaIndexResponse> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message
    });

    // Retrieve context
    const nodes = await this.index.retrieve(message);
    const context = nodes.map(node => node.text).join('\n\n');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a helpful assistant. Use the provided context:\n\n${context}`
      },
      ...this.conversationHistory
    ];

    let fullResponse = '';

    await this.client.chat.completions.stream({
      messages,
      temperature: 0.3
    }, {
      onChunk: (chunk) => {
        if (chunk.content) {
          fullResponse += chunk.content;
        }
      }
    });

    // In a real implementation, this would yield chunks in real-time
    for (const char of fullResponse) {
      yield char;
    }

    // Add response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: fullResponse
    });

    return {
      response: fullResponse,
      source_nodes: nodes,
      metadata: {
        streaming: true,
        conversation_length: this.conversationHistory.length
      }
    };
  }

  reset(): void {
    this.conversationHistory = [];
  }
}

/**
 * Conversational Retrieval Chain
 */
export class DandoloConversationalRetrievalChain {
  private contextId?: string;

  constructor(
    private index: DandoloVectorStoreIndex,
    private client: DandoloClient,
    private options?: {
      context_id?: string;
      memory_enabled?: boolean;
      top_k?: number;
    }
  ) {
    this.contextId = options?.context_id;
  }

  async run(query: string): Promise<{
    answer: string;
    source_documents: LlamaIndexDocument[];
  }> {
    const queryEngine = this.index.as_query_engine({
      similarity_top_k: this.options?.top_k
    });

    const response = await queryEngine.query(query);

    return {
      answer: response.response,
      source_documents: response.source_nodes?.map(node => ({
        id_: node.id_,
        text: node.text,
        metadata: node.metadata
      })) || []
    };
  }
}

/**
 * Supporting classes
 */
export class DandoloEmbeddingModel implements LlamaIndexEmbedding {
  async get_text_embedding(text: string): Promise<number[]> {
    // Placeholder - would use actual embedding model
    return new Array(768).fill(0).map(() => Math.random());
  }

  async get_text_embeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.get_text_embedding(text)));
  }
}

export class DandoloNodeParser implements LlamaIndexNodeParser {
  constructor(
    private chunkSize = 1000,
    private chunkOverlap = 200
  ) {}

  get_nodes_from_documents(documents: LlamaIndexDocument[]): LlamaIndexNode[] {
    const nodes: LlamaIndexNode[] = [];

    for (const doc of documents) {
      const chunks = this.splitText(doc.text);
      
      chunks.forEach((chunk, index) => {
        nodes.push({
          id_: `${doc.id_}_chunk_${index}`,
          text: chunk,
          metadata: {
            ...doc.metadata,
            chunk_index: index,
            parent_doc_id: doc.id_
          },
          relationships: {
            source: doc.id_
          }
        });
      });
    }

    return nodes;
  }

  private splitText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      chunks.push(text.substring(start, end));
      start = end - this.chunkOverlap;
    }

    return chunks;
  }
}

export class DandoloPromptHelper implements LlamaIndexPromptHelper {
  get_text_splitter_given_prompt(
    prompt_template: string,
    num_chunks: number
  ): (text: string) => string[] {
    return (text: string) => {
      const chunkSize = Math.ceil(text.length / num_chunks);
      const chunks: string[] = [];
      
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
      }
      
      return chunks;
    };
  }
}

export default DandoloLlamaIndexAdapter;