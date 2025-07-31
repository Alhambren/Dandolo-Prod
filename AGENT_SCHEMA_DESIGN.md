# Enhanced Convex Schema for Agent-Specific Functionality

## Overview

This document outlines the enhanced Convex schema design that adds comprehensive agent-specific functionality to Dandolo.ai while maintaining full backward compatibility with the existing infrastructure.

## New Tables Added

### 1. `agentProfiles` - Agent Registration and Capabilities

**Purpose**: Core agent registration with capabilities, preferences, and security configuration.

**Key Features**:
- Unique agent identifiers (ag_xxxxx format)
- Capability-based permissions system
- Model preferences by task type
- Security levels (standard, restricted, privileged)
- Performance tracking and version management

**Critical Fields**:
- `agentId`: Unique identifier for agent instances
- `capabilities`: Array of permitted agent functions
- `preferredModels`: Default model selection by task type
- `securityLevel`: Access control classification
- `systemPrompt`: Default agent instructions

### 2. `workflowStates` - Multi-Step Workflow Execution

**Purpose**: Comprehensive workflow orchestration with step-by-step execution tracking.

**Key Features**:
- Multi-step workflow definition and execution
- Real-time status tracking per step
- Support for complex workflow patterns (conditions, loops)
- Resource tracking (tokens, cost, time)
- Automatic cleanup with expiration timestamps

**Critical Fields**:
- `workflowId`: Unique workflow execution identifier
- `steps`: Array of workflow step definitions with individual status tracking
- `variables`: Workflow state persistence
- `metadata`: Priority, tags, and relationship tracking

### 3. `agentSessions` - Enhanced Session Management

**Purpose**: Rich session management with agent context, conversation history, and performance metrics.

**Key Features**:
- Multiple session types (interactive, workflow, API, batch)
- Conversation history storage (when enabled)
- Session-specific settings and preferences
- Real-time performance metrics
- Automatic expiration and cleanup

**Critical Fields**:
- `sessionType`: Categorizes interaction patterns
- `context`: Conversation history and active tool tracking
- `metrics`: Performance tracking per session
- `settings`: User preferences for the session

### 4. `instructionTemplates` - Reusable Agent Instructions

**Purpose**: Template system for agent prompts, instructions, and workflow components.

**Key Features**:
- Variable interpolation system
- Public/private template sharing
- Category-based organization
- Usage analytics and ratings
- System-level and user-defined templates

**Critical Fields**:
- `content`: Template content with variable placeholders
- `variables`: Typed variable definitions
- `category`: Template classification system
- `isPublic`: Community sharing capability

### 5. `agentMetrics` - Performance Analytics

**Purpose**: Comprehensive performance tracking and analytics for agents across multiple time periods.

**Key Features**:
- Multi-period metrics (hourly, daily, weekly, monthly)
- Detailed performance breakdown
- Model usage analytics
- Success/failure rate tracking
- Workflow execution statistics

**Critical Fields**:
- `metrics`: Comprehensive performance data object
- `period`: Time aggregation level
- `popularModels`: Usage pattern analysis
- `topIntents`: Intent classification analytics

### 6. `agentTools` - External Tool Integration

**Purpose**: Registry of external tools and APIs available to agents.

**Key Features**:
- Flexible tool configuration system
- Authentication handling (API keys, OAuth, Basic Auth)
- Input/output schema validation
- Performance and reliability tracking
- Public tool sharing marketplace

**Critical Fields**:
- `config`: Tool connection and authentication configuration
- `schema`: Input/output validation definitions
- `authentication`: Security credential management
- `successRate`: Reliability metrics

### 7. `agentExecutions` - Detailed Execution Logging

**Purpose**: Comprehensive audit trail of all agent task executions.

**Key Features**:
- Detailed input/output logging
- Execution timing and performance metrics
- Error tracking and debugging information
- Resource usage tracking (tokens, cost)
- Automatic cleanup with retention policies

**Critical Fields**:
- `input`/`output`: Complete execution context
- `executionTime`: Performance timing
- `tokensUsed`/`cost`: Resource consumption
- `error`: Detailed error information for debugging

## Integration with Existing Schema

### Backward Compatibility
- All existing tables remain unchanged
- New tables extend functionality without breaking existing features
- Existing API endpoints continue to work without modification
- Points system integrates seamlessly with agent operations

### Shared Infrastructure
- **`providers`**: Agents use existing Venice.ai provider network
- **`apiKeys`**: Enhanced with `keyType` field for agent keys (ak_)
- **`inferences`**: Logs all agent requests alongside user requests
- **`providerPoints`**: Includes new `agentApiPoints` field for agent-specific rewards
- **`pointsTransactions`**: New `agent_api` transaction type
- **`rateLimits`**: Extended to support agent key rate limiting

## Index Strategy for Performance

### Primary Access Patterns
1. **Agent Lookup**: Fast agent profile retrieval by ID and owner
2. **Session Management**: Active session queries by agent and user
3. **Workflow Execution**: Real-time workflow status tracking
4. **Metrics Aggregation**: Time-series performance analytics
5. **Template Discovery**: Search and categorization of instruction templates

### Critical Indexes Added
```typescript
// Agent-focused indexes
.index("by_agent_id", ["agentId"])          // Fast agent lookups
.index("by_active", ["isActive"])           // Active agent queries
.index("by_last_used", ["lastUsed"])        // Usage-based sorting

// Session management indexes  
.index("by_session_id", ["sessionId"])      // Session retrieval
.index("by_last_activity", ["lastActivity"]) // Active session queries
.index("by_expires", ["expiresAt"])         // Cleanup operations

// Workflow execution indexes
.index("by_workflow_id", ["workflowId"])    // Workflow tracking
.index("by_status", ["status"])             // Status-based queries
.index("by_created", ["createdAt"])         // Time-based sorting

// Performance and analytics indexes
.index("by_period", ["period", "periodStart"]) // Time-series queries
.index("by_computed", ["computedAt"])       // Analytics freshness
```

## Migration Considerations

### Phase 1: Schema Deployment
- Deploy new tables alongside existing schema
- Verify all indexes are created successfully
- Test basic CRUD operations on new tables

### Phase 2: Function Integration
- Update existing functions to support agent operations
- Add agent-specific query and mutation functions
- Implement workflow orchestration functions

### Phase 3: API Enhancement
- Extend existing API endpoints to support agent functionality
- Add new agent management endpoints
- Implement streaming workflow status updates

### Data Cleanup Strategy
- Automatic cleanup of expired sessions and workflows
- Retention policies for execution logs and metrics
- Archive strategy for long-term analytics data

## Security Considerations

### Access Control
- **Security Levels**: Three-tier system (standard, restricted, privileged)
- **Wallet-Based Ownership**: All agent resources tied to wallet addresses
- **API Key Integration**: Agent keys (ak_) with enhanced rate limiting
- **Audit Trail**: Complete execution logging for security monitoring

### Data Protection
- **Encrypted Credentials**: Tool API keys encrypted using existing AES-256-GCM system
- **Session Isolation**: Agent sessions isolated by owner and security level
- **Automatic Expiration**: All temporary data has cleanup timestamps
- **Zero-Trust Model**: All operations validated against ownership and permissions

## Performance Optimizations

### Real-Time Queries
- Optimized indexes for live session and workflow status updates
- Efficient pagination for large result sets
- Minimal overhead for existing chat functionality

### Resource Management
- Automatic cleanup of expired data reduces storage overhead
- Efficient aggregation for metrics calculation
- Optimized queries for high-frequency operations

### Scalability
- Table structure designed for horizontal scaling
- Index strategy optimized for Convex's distributed architecture
- Minimal cross-table joins for better performance

## Monitoring and Analytics

### Built-in Metrics
- **Agent Performance**: Response times, success rates, token usage
- **Workflow Execution**: Step completion rates, error patterns
- **Resource Utilization**: Token consumption, cost tracking
- **User Engagement**: Session patterns, feature adoption

### Real-Time Monitoring
- **Active Sessions**: Live session count and status tracking
- **Workflow Status**: Real-time workflow execution monitoring
- **System Health**: Provider availability and performance metrics
- **Error Tracking**: Detailed error logging and pattern detection

## Next Steps

1. **Validate Schema**: Deploy to development environment and run schema validation
2. **Implement Core Functions**: Start with agent profile management and basic session handling
3. **Build API Layer**: Create agent management endpoints and workflow orchestration APIs
4. **Add Streaming Support**: Implement real-time workflow status updates
5. **Performance Testing**: Validate query performance and optimize indexes as needed

This enhanced schema provides a comprehensive foundation for agent-specific functionality while maintaining the robustness and performance characteristics of the existing Dandolo.ai infrastructure.