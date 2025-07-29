# Completion Criteria Template

## Definition of Done Checklist

### Code Quality
- [ ] Code follows established style guidelines
- [ ] No critical or high-severity linting errors
- [ ] All functions have appropriate error handling
- [ ] Code is properly commented where necessary
- [ ] No hardcoded secrets or sensitive data
- [ ] Performance considerations addressed

### Testing Requirements
- [ ] Unit tests written with ≥80% coverage
- [ ] Integration tests cover main user flows
- [ ] Edge cases and error scenarios tested
- [ ] All tests passing in CI/CD pipeline
- [ ] Manual testing completed where appropriate
- [ ] Accessibility testing performed (if UI changes)

### Security Validation
- [ ] Input validation implemented
- [ ] Authentication/authorization working correctly
- [ ] No security vulnerabilities detected
- [ ] Sensitive data properly encrypted
- [ ] Security headers configured
- [ ] Dependencies scanned for vulnerabilities

### Performance Criteria
- [ ] API response times < 200ms (95th percentile)
- [ ] Page load times < 3 seconds
- [ ] Bundle size within established limits
- [ ] Database queries optimized
- [ ] Caching strategy implemented where appropriate
- [ ] Memory usage within acceptable bounds

### Documentation
- [ ] Code documentation updated
- [ ] API documentation reflects changes
- [ ] README updated if necessary
- [ ] Migration guides provided (if breaking changes)
- [ ] Architecture decisions documented
- [ ] User-facing documentation updated

### Deployment Readiness
- [ ] Feature flags configured (if applicable)
- [ ] Database migrations tested
- [ ] Environment variables documented
- [ ] Rollback plan available
- [ ] Monitoring and alerting configured
- [ ] Staging environment validation passed

## Task-Specific Criteria Template

```yaml
completion_criteria:
  task_id: "unique-task-identifier"
  
  functional_requirements:
    - requirement: "User can log in with email/password"
      verification: "Manual test + automated test"
      status: [pending|in_progress|completed]
    
    - requirement: "Invalid credentials show error message"
      verification: "Unit test + E2E test"
      status: [pending|in_progress|completed]
  
  non_functional_requirements:
    - requirement: "Login response time < 500ms"
      verification: "Performance test"
      target_value: "< 500ms"
      actual_value: "345ms"
      status: [pending|in_progress|completed]
  
  quality_gates:
    - gate: "Code Review"
      criteria:
        - "No critical issues found"
        - "Architecture follows established patterns"
        - "Error handling implemented"
      reviewer: "senior-developer"
      status: [pending|in_progress|approved|rejected]
    
    - gate: "Security Review"
      criteria:
        - "No high-risk vulnerabilities"
        - "Input validation complete"
        - "Authentication working correctly"
      reviewer: "security-auditor"
      status: [pending|in_progress|approved|rejected]
  
  acceptance_tests:
    - test: "User login happy path"
      type: "e2e"
      location: "cypress/e2e/auth/login.cy.js"
      status: [pending|in_progress|passing|failing]
    
    - test: "Password reset flow"
      type: "integration"
      location: "tests/integration/auth.test.js"
      status: [pending|in_progress|passing|failing]
  
  deployment_criteria:
    - criterion: "Staging deployment successful"
      verification: "Automated deployment pipeline"
      status: [pending|in_progress|completed]
    
    - criterion: "Production rollback plan tested"
      verification: "Manual verification"
      status: [pending|in_progress|completed]
  
  sign_off:
    - role: "Product Owner"
      person: "product-team"
      status: [pending|approved|rejected]
      comments: "Functionality meets requirements"
    
    - role: "Technical Lead"
      person: "tech-lead"
      status: [pending|approved|rejected]
      comments: "Architecture and implementation approved"
```

## Completion Verification Process

1. **Self-Assessment**: Agent reviews all criteria
2. **Peer Review**: Another agent validates completion
3. **Quality Gate Check**: Automated validation where possible
4. **Stakeholder Sign-off**: Required approvals obtained
5. **Final Verification**: Master orchestrator confirms completion

## Failure Handling

If completion criteria are not met:
1. Document specific failures
2. Estimate effort to remediate
3. Re-assign to appropriate agent if needed
4. Update task timeline and dependencies
5. Notify stakeholders of delay
6. Implement corrective actions
7. Re-verify completion criteria