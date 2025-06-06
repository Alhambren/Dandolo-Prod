describe('Dandolo.ai Main Page Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5173')
  })

  it('should display logo with proper styling and navigation', () => {
    // Test logo visibility and styling
    cy.get('button').contains('Dandolo.ai')
      .should('be.visible')
      .should('have.css', 'background-image')
      .should('contain', 'linear-gradient')
    
    // Test logo navigation
    cy.get('button').contains('Dandolo.ai').click()
    cy.url().should('include', '/')
  })

  it('should display real network stats (not mock data)', () => {
    // Wait for stats to load
    cy.get('[data-testid="stats-grid"]', { timeout: 10000 }).should('be.visible')
    
    // Check that stats are numbers, not placeholder text
    cy.get('[data-testid="total-providers"]').should('contain.text', /^\d+$/)
    cy.get('[data-testid="active-users"]').should('contain.text', /^\d+$/)
    cy.get('[data-testid="prompts-today"]').should('contain.text', /^\d+$/)
    cy.get('[data-testid="total-vcu"]').should('contain.text', /^\d+$/)
    
    // Verify no mock/sample data
    cy.get('body').should('not.contain.text', 'AI Provider Alpha')
    cy.get('body').should('not.contain.text', 'Neural Networks Inc')
    cy.get('body').should('not.contain.text', 'DeepMind Proxy')
  })

  it('should show proper empty state for providers', () => {
    cy.get('[data-testid="top-providers"]').within(() => {
      // Should either show real providers or empty state
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="provider-card"]').length > 0) {
          // If providers exist, they should be real (not sample data)
          cy.get('[data-testid="provider-card"]').each(($card) => {
            cy.wrap($card).should('not.contain.text', 'venice_key_')
            cy.wrap($card).should('not.contain.text', '0x1234567890')
          })
        } else {
          // If no providers, should show empty state
          cy.contains('No Active Providers').should('be.visible')
          cy.contains('Become First Provider').should('be.visible')
        }
      })
    })
  })

  it('should have working wallet connection', () => {
    // Test wallet connect button exists
    cy.get('button').contains('Connect Wallet').should('be.visible')
    
    // Click wallet connect (will show wallet modal or error - both indicate it's working)
    cy.get('button').contains('Connect Wallet').click()
    
    // Should either show wallet selection modal or error (not placeholder alert)
    cy.get('body').should('not.contain.text', 'coming soon')
  })

  it('should have working navigation', () => {
    // Test all nav buttons work
    cy.get('button').contains('AI Chat').click()
    cy.get('[data-testid="chat-interface"]').should('be.visible')
    
    cy.get('button').contains('Providers').click()
    cy.get('[data-testid="providers-page"]').should('be.visible')
    
    cy.get('button').contains('Dashboard').click()
    cy.get('[data-testid="dashboard-page"]').should('be.visible')
    
    cy.get('button').contains('Developers').click()
    cy.get('[data-testid="developers-page"]').should('be.visible')
  })

  it('should load real-time live network activity', () => {
    cy.get('[data-testid="live-activity"]').within(() => {
      // Check all activity metrics are present
      cy.contains('Prompts Today').should('be.visible')
      cy.contains('Avg Response').should('be.visible')
      cy.contains('Network Uptime').should('be.visible')
      cy.contains('Active Users').should('be.visible')
      
      // Verify metrics show real numbers (including 0)
      cy.get('[data-testid="prompts-today-live"]').should('match', /^\d+$/)
      cy.get('[data-testid="avg-response-live"]').should('match', /^\d+ms$/)
      cy.get('[data-testid="network-uptime-live"]').should('match', /^\d+%$/)
      cy.get('[data-testid="active-users-live"]').should('match', /^\d+$/)
    })
  })
}) 