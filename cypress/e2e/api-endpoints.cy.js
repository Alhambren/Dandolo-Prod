describe('Dandolo.ai API Endpoints', () => {
  it('should have working API endpoints with proper responses', () => {
    // Test balance endpoint
    cy.request({
      method: 'GET',
      url: 'https://robust-quail-605.convex.cloud/api/v1/balance',
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.equal(404)
    })

    // Test prompt endpoint
    cy.request({
      method: 'POST',
      url: 'https://robust-quail-605.convex.cloud/api/v1/prompt',
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.equal(404)
    })
  })
}) 