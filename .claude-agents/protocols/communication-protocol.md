# Inter-Agent Communication Protocol

## Message Format
```json
{
  "from": "agent-name",
  "to": "agent-name",
  "type": "request|response|handoff",
  "taskId": "unique-identifier",
  "payload": {
    "task": "description",
    "context": {},
    "artifacts": [],
    "constraints": []
  },
  "metadata": {
    "timestamp": "ISO-8601",
    "priority": "critical|high|normal|low",
    "deadline": "ISO-8601"
  }
}
```

## Handoff Rules
1. Always include complete context
2. Specify expected output format
3. Include success criteria
4. Document any decisions made
5. Pass along relevant artifacts

## Error Handling
- Retry policy: 3 attempts with exponential backoff
- Fallback: Escalate to master-orchestrator
- Logging: All errors must be logged with context