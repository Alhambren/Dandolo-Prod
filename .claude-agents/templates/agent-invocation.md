# Agent Invocation Template

When invoking any agent, use this format:

```
[AGENT_NAME]([TASK_DESCRIPTION])
```

Example:
```
clarifier(Analyze user request for building real-time chat)
└─ Done (12 tool uses · 45.2k tokens · 2m 15s)

planner(Create implementation plan for real-time chat with WebSocket)
└─ Done (8 tool uses · 38.5k tokens · 1m 45s)
```

## Invocation Best Practices
1. Always start with master-orchestrator for new requests
2. Provide clear, specific task descriptions
3. Include relevant context from previous agents
4. Specify expected deliverables
5. Set realistic time/token estimates

## Standard Invocation Chain
1. **master-orchestrator** - Initial task analysis and planning
2. **clarifier** - Requirement clarification (if needed)
3. **planner** - Detailed implementation planning
4. **architect** - System design and architecture
5. **[specialist-agents]** - Implementation (backend, frontend, database)
6. **qa-engineer** - Test strategy and planning
7. **tester** - Test implementation
8. **security-auditor** - Security review
9. **performance-optimizer** - Performance optimization
10. **applier** - Change application
11. **reviewer** - Final code review
12. **documentation-specialist** - Documentation (if needed)

## Parallel Invocation
When tasks can be done simultaneously:
```
backend-engineer(Implement API endpoints) || frontend-specialist(Create UI components)
```