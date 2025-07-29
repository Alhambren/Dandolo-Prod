# Error Handling Protocol

## Error Classification
1. **Critical**: System failure, data corruption, security breach
2. **High**: Feature broken, performance severely degraded
3. **Medium**: Minor functionality issues, non-critical bugs
4. **Low**: Cosmetic issues, nice-to-have improvements

## Error Response Strategy

### Critical Errors
- Immediate escalation to master-orchestrator
- Halt current operations
- Implement rollback if necessary
- Notify all dependent agents
- Document incident for post-mortem

### High Errors
- Attempt automated recovery (max 3 times)
- Escalate if recovery fails
- Continue with degraded functionality if possible
- Log detailed error context

### Medium/Low Errors
- Log error with context
- Continue operations
- Report in final summary
- Include in technical debt backlog

## Recovery Mechanisms
1. Automatic retry with exponential backoff
2. Fallback to alternative approach
3. Graceful degradation
4. Manual intervention request
5. Task reassignment to different agent

## Error Logging Format
```json
{
  "timestamp": "ISO-8601",
  "severity": "critical|high|medium|low",
  "agent": "agent-name",
  "task": "task-identifier",
  "error": {
    "type": "error-classification",
    "message": "human-readable description",
    "stack": "technical stack trace",
    "context": {"relevant": "context data"}
  },
  "recovery": {
    "attempted": ["list of recovery attempts"],
    "successful": "boolean",
    "fallback": "alternative approach taken"
  }
}
```