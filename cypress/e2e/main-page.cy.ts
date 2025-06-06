describe('Main Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the main page with all sections', () => {
    // Check for main page container
    cy.get('[data-testid="main-page"]').should('exist');

    // Check for stats grid
    cy.get('[data-testid="stats-grid"]').should('exist');
    cy.get('[data-testid="stat-card"]').should('have.length', 4);

    // Check for top providers section
    cy.get('[data-testid="top-providers"]').should('exist');
    cy.get('[data-testid="provider-card"]').should('have.length', 3);

    // Check for network health section
    cy.get('[data-testid="live-activity"]').should('exist');
    cy.get('[data-testid="network-health"]').should('exist');
  });

  it('should navigate to chat page', () => {
    cy.get('[data-testid="chat-button"]').click();
    cy.url().should('include', '/chat');
    cy.get('[data-testid="chat-page"]').should('exist');
  });

  it('should navigate to dashboard page', () => {
    cy.get('[data-testid="dashboard-button"]').click();
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="dashboard-page"]').should('exist');
  });

  it('should navigate to providers page', () => {
    cy.get('[data-testid="providers-button"]').click();
    cy.url().should('include', '/providers');
    cy.get('[data-testid="providers-page"]').should('exist');
  });
}); 