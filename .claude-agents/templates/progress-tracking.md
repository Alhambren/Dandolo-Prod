# Progress Tracking Template

## Status Update Format

```yaml
progress_update:
  task_id: "unique-task-identifier"
  timestamp: "2024-01-15T10:30:00Z"
  agent: "agent-name"
  status: [not_started|in_progress|blocked|completed|failed]
  
  completion_percentage: 75 # 0-100
  
  work_completed:
    - "Implemented user authentication"
    - "Created API endpoints for user management"
    - "Added input validation"
  
  current_activity: "Writing unit tests for authentication flow"
  
  next_steps:
    - "Complete unit test suite"
    - "Perform security review"
    - "Update documentation"
  
  blockers:
    - issue: "Waiting for design assets"
      severity: "medium"
      eta_resolution: "2024-01-16T09:00:00Z"
      blocking_agent: "design-team"
    
  risks:
    - risk: "Third-party API rate limits may cause delays"
      probability: "medium"
      impact: "high"
      mitigation: "Implement caching strategy"
  
  metrics:
    tokens_used: 12500
    time_elapsed: "2h 30m"
    quality_score: 8.5 # 1-10
    
  artifacts_produced:
    - type: "code"
      location: "src/auth/"
      description: "Authentication module"
    - type: "tests"
      location: "tests/auth/"
      description: "Unit tests for auth"
  
  quality_gates_status:
    requirements_clear: true
    architecture_approved: true
    code_review_passed: false # pending
    tests_passing: true
    security_reviewed: false # pending
    performance_validated: false # pending
    documentation_complete: false # pending
```

## Milestone Tracking

```yaml
milestone_status:
  milestone_id: "auth-implementation"
  title: "User Authentication System"
  target_date: "2024-01-20T17:00:00Z"
  status: [on_track|at_risk|delayed|completed]
  
  progress:
    tasks_total: 8
    tasks_completed: 5
    tasks_in_progress: 2
    tasks_blocked: 1
    
  health_indicators:
    schedule: "green" # green|yellow|red
    quality: "green"
    scope: "yellow"
    resources: "green"
  
  key_deliverables:
    - deliverable: "Login/logout functionality"
      status: "completed"
      completion_date: "2024-01-14T15:30:00Z"
    - deliverable: "Password reset flow"
      status: "in_progress"
      estimated_completion: "2024-01-16T12:00:00Z"
```

## Daily Standup Format

```yaml
standup_update:
  date: "2024-01-15"
  agent: "backend-engineer"
  
  yesterday:
    - "Completed user registration API"
    - "Fixed validation bug in login endpoint"
    - "Started writing unit tests"
  
  today:
    - "Finish unit test suite"
    - "Implement password reset functionality"
    - "Begin security review preparations"
  
  blockers:
    - "Need clarification on password complexity requirements"
    - "Waiting for QA environment setup"
  
  help_needed:
    - agent: "security-auditor"
      request: "Review authentication implementation"
    - agent: "frontend-specialist"
      request: "Coordinate API integration points"
```

## Progress Visualization

### Burndown Chart Data
```yaml
burndown_data:
  sprint_start: "2024-01-10"
  sprint_end: "2024-01-20"
  total_story_points: 50
  
  daily_progress:
    "2024-01-10": 50 # remaining points
    "2024-01-11": 47
    "2024-01-12": 42
    "2024-01-13": 38
    "2024-01-14": 32
    "2024-01-15": 25 # current
```