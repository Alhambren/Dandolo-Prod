# Task Definition Template

## Task Specification Format

```yaml
task:
  id: unique-task-identifier
  title: "Clear, concise task title"
  description: |
    Detailed description of what needs to be accomplished.
    Include context, requirements, and expected outcomes.
  
  type: [feature|bugfix|refactor|optimization|security|testing|documentation]
  priority: [critical|high|medium|low]
  complexity: [1-10] # 1=trivial, 10=highly complex
  
  requirements:
    functional:
      - "Functional requirement 1"
      - "Functional requirement 2"
    non_functional:
      - "Performance requirement"
      - "Security requirement"
      - "Usability requirement"
  
  constraints:
    technical:
      - "Must use existing technology stack"
      - "Must maintain backward compatibility"
    business:
      - "Must complete within 2 hours"
      - "Cannot modify core authentication"
  
  acceptance_criteria:
    - "Criterion 1: Specific, measurable outcome"
    - "Criterion 2: Testable behavior"
    - "Criterion 3: User-facing improvement"
  
  dependencies:
    - task_id: "prerequisite-task-1"
      relationship: "blocks" # blocks|enables|enhances
    - task_id: "parallel-task-1"
      relationship: "parallel"
  
  resources:
    agents: ["backend-engineer", "frontend-specialist"]
    tools: ["database", "testing-framework"]
    external: ["third-party-api", "design-assets"]
  
  estimates:
    effort_hours: 4
    token_budget: 50000
    calendar_time: "2-3 hours"
  
  success_metrics:
    - metric: "Response time"
      target: "< 200ms"
      measurement: "API endpoint performance"
    - metric: "Test coverage"
      target: "> 90%"
      measurement: "Automated test suite"
  
  deliverables:
    - type: "code"
      description: "Implemented feature with tests"
      location: "src/features/new-feature/"
    - type: "documentation"
      description: "API documentation update"
      location: "docs/api.md"
```

## Usage Guidelines

1. **Always define clear acceptance criteria** - These become the quality gates
2. **Be specific about constraints** - Technical and business limitations
3. **Include realistic estimates** - Help with resource planning
4. **Define measurable success metrics** - Enable objective completion assessment
5. **Identify all dependencies** - Prevent blocking issues
6. **Specify required agents** - Ensure proper skill allocation