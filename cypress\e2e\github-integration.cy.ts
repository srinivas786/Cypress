describe('GitHub Integration', () => {
  beforeEach(() => {
    cy.log('Starting GitHub integration test...');
    
    // Verify GitHub token is configured
    cy.wrap(Cypress.env('GITHUB_TOKEN')).should('exist')
      .then((token) => {
        expect(token).to.be.a('string').and.not.be.empty;
      });

    cy.visit('/github-integration');
    cy.log('Waiting for page to load...');
    cy.get('h1', { log: true, timeout: 10000 })
      .contains('GitHub Integration')
      .should('be.visible')
      .then(() => cy.log('GitHub Integration page loaded successfully'));
  })

  it('should connect to GitHub and list repositories', () => {
    cy.connectToGithub()
  })

  it('should sync tests with GitHub repository', () => {
    cy.connectToGithub()
    cy.get('select option').eq(1).then(($option) => {
      const repoName = $option.val() as string
      cy.syncWithGithub(repoName, 'test/cypress-automation')
    })
  })
})
