describe('AI Test Generator', () => {  beforeEach(() => {
    cy.log('Starting test...');
    cy.intercept('GET', '/api/**').as('apiCheck');
    
    cy.on('fail', (error, runnable) => {
      cy.log(`Test failed: ${error.message}`);
      throw error;
    });

    // Visit page and verify server is running
    cy.visit('/create-test', {
      timeout: 30000,
      onBeforeLoad: (win) => {
        cy.stub(win.console, 'error').as('consoleError');
      },
      failOnStatusCode: true
    }).then(() => {
      cy.wait('@apiCheck', { timeout: 10000 })
        .its('response.statusCode')
        .should('be.oneOf', [200, 304]);
    });

    cy.log('Waiting for page to load...');
    cy.get('h1', { 
      log: true, 
      timeout: 10000,
    })
      .contains('Create Cypress Test')
      .should('be.visible')
      .then(() => {
        cy.get('@consoleError').should('not.be.called', 'Unexpected console errors');
        cy.log('Page loaded successfully without errors');
      });
  })

  it('should generate a UI component test', () => {
    // Intercept and verify API endpoints
    cy.intercept('POST', '/api/generate-test').as('generateTest')
    cy.log('API endpoints intercepted')
    cy.generateTest(
      'UI Component Test',
      'Test the login form with username and password fields'
    )

    cy.log('Verifying initial test content...')
    cy.verifyGeneratedTest([
      'describe',
      'it',
      'username',
      'password',
      'should("be.visible")'
    ])

    cy.log('Submitting test generation form...')
    cy.get('button')
      .contains('Generate Test')
      .should('be.enabled')
      .click()    // Wait for API response with detailed error handling
    cy.wait('@generateTest', { timeout: 15000 })
      .then((interception) => {
        const response = interception.response;
        
        // Verify response exists
        expect(response, 'API response is missing').to.exist;
        
        // Check status code
        expect(response?.statusCode, 'Unexpected API status code')
          .to.be.oneOf([200, 201]);
        
        // Verify response body
        expect(response?.body, 'API response body is missing').to.exist;
        expect(response?.body.error, 'API returned an error').to.not.exist;
      })
      .catch((error) => {
        cy.log(`API Error: ${error.message}`);
        throw new Error(`Failed to generate test: ${error.message}`);
      });

    cy.log('Verifying generated test content...')
    cy.get('[data-testid="code-editor"]', { 
      timeout: 15000,
      withinSubject: ($editor) => {
        if (!$editor.is(':visible')) {
          throw new Error('Code editor is not visible');
        }
        if ($editor.text().trim() === '') {
          throw new Error('Code editor is empty');
        }
        return $editor;
      }
    })
    .should('be.visible')
    .and('not.be.empty')
    .then(($editor) => {
      const content = $editor.text();
      const requiredElements = ['describe', 'it', 'username', 'password'];
      const missingElements = requiredElements.filter(el => !content.includes(el));
      
      if (missingElements.length > 0) {
        throw new Error(`Generated test is missing required elements: ${missingElements.join(', ')}`);
      }
    })

    cy.log('Verifying action buttons...')
    cy.contains('button', 'Save to File')
      .should('be.visible')
      .and('be.enabled')
    cy.contains('button', 'Copy to Clipboard')
      .should('be.visible')
      .and('be.enabled')
  })
  it('should generate an API integration test', () => {
    cy.intercept('POST', '/api/generate-test').as('apiTest')
    
    // Select template with verification
    cy.get('select#template')
      .should('exist', 'Template dropdown is missing')
      .and('be.enabled', 'Template dropdown is disabled')
      .select('API Integration Test')
      .should('have.value', 'API Integration Test', 'Failed to select API template');
    
    // Enter test description with verification
    cy.get('textarea[placeholder*="Example: Test the login form"]')
      .should('be.visible', 'Test description input is not visible')
      .and('be.enabled', 'Test description input is disabled')
      .clear()
      .type('Test the user creation API endpoint', { delay: 0 })
      .should('have.value', 'Test the user creation API endpoint', 'Failed to enter test description');

    // Click generate with verification
    cy.get('button')
      .contains('Generate Test')
      .should('be.enabled', 'Generate button is disabled')
      .click();

    // Verify API response
    cy.wait('@apiTest', { timeout: 15000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 201], 'API request failed');

    // Verify generated content
    cy.get('[data-testid="code-editor"]', { timeout: 15000 })
      .should('be.visible', 'Code editor is not visible')
      .and('not.be.empty', 'Generated code is empty')
      .then($editor => {
        const content = $editor.text();
        ['cy.request', 'expect(response.status)'].forEach(text => {
          if (!content.includes(text)) {
            throw new Error(`Generated API test is missing required content: ${text}`);
          }
        });
      })
  })
  it('should generate an authentication flow test', () => {
    cy.intercept('POST', '/api/generate-test').as('authTest')
    
    // Select authentication template with verification
    cy.get('select#template')
      .should('exist', 'Authentication template selector not found')
      .and('be.enabled', 'Authentication template selector is disabled')
      .select('Authentication Flow')
      .should('have.value', 'Authentication Flow', 'Failed to select Authentication Flow template');
    
    // Enter test description with validation
    cy.get('textarea[placeholder*="Example: Test the login form"]')
      .should('be.visible', 'Test description textarea not visible')
      .and('be.enabled', 'Test description textarea is disabled')
      .clear()
      .type('Test user login with remember me functionality', { delay: 0 })
      .should('have.value', 'Test user login with remember me functionality', 'Failed to enter authentication test description');

    // Click generate with verification
    cy.get('button')
      .contains('Generate Test')
      .should('be.enabled', 'Generate button is disabled')
      .click()
      .then(() => cy.log('Generating authentication test...'));

    // Verify API response
    cy.wait('@authTest', { timeout: 15000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 201], 'Authentication test generation API request failed');

    // Verify generated content with detailed checks
    cy.get('[data-testid="code-editor"]', { timeout: 15000 })
      .should('be.visible', 'Authentication test code editor not visible')
      .and('not.be.empty', 'Authentication test code editor is empty')
      .then($editor => {
        const content = $editor.text();
        const requiredAuthElements = ['login', 'cy.url()', 'remember me'];
        const missingElements = requiredAuthElements.filter(el => !content.includes(el));
        
        if (missingElements.length > 0) {
          throw new Error(`Generated authentication test is missing required elements: ${missingElements.join(', ')}`);
        }
      });
  })

  it('should generate an accessibility test', () => {
    cy.intercept('POST', '/api/generate-test').as('a11yTest')
    
    // Select accessibility template with verification
    cy.get('select#template')
      .should('exist', 'Accessibility template selector not found')
      .and('be.enabled', 'Accessibility template selector is disabled')
      .select('Accessibility Test')
      .should('have.value', 'Accessibility Test', 'Failed to select Accessibility Test template');
    
    // Enter test description with validation
    cy.get('textarea[placeholder*="Example: Test the login form"]')
      .should('be.visible', 'Test description textarea not visible')
      .and('be.enabled', 'Test description textarea is disabled')
      .clear()
      .type('Test the main navigation for accessibility compliance', { delay: 0 })
      .should('have.value', 'Test the main navigation for accessibility compliance', 'Failed to enter accessibility test description');

    // Click generate with verification
    cy.get('button')
      .contains('Generate Test')
      .should('be.enabled', 'Generate button is disabled')
      .click()
      .then(() => cy.log('Generating accessibility test...'));

    // Verify API response
    cy.wait('@a11yTest', { timeout: 15000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 201], 'Accessibility test generation API request failed');

    // Verify generated content with detailed accessibility checks
    cy.get('[data-testid="code-editor"]', { timeout: 15000 })
      .should('be.visible', 'Accessibility test code editor not visible')
      .and('not.be.empty', 'Accessibility test code editor is empty')
      .then($editor => {
        const content = $editor.text();
        const requiredA11yElements = [
          'cy.injectAxe',
          'cy.checkA11y',
          'navigation',
          'WCAG'
        ];
        const missingElements = requiredA11yElements.filter(el => !content.includes(el));
        
        if (missingElements.length > 0) {
          throw new Error(`Generated accessibility test is missing required elements: ${missingElements.join(', ')}`);
        }
      });
  })
})