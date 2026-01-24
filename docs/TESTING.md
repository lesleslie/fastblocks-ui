# FastBulma Testing Guide

**Version**: 1.0.0
**Last Updated**: 2025-01-24

---

## Overview

FastBulma uses a comprehensive multi-layer testing strategy to ensure code quality, accessibility, and visual consistency. This document covers all testing frameworks and how to use them.

---

## Testing Stack

| Framework | Purpose | Coverage Target | Status |
|-----------|---------|-----------------|--------|
| **Vitest** | JavaScript unit tests | >80% | ✅ Configured |
| **Playwright** | E2E testing | Core user flows | ✅ Configured |
| **axe-core** | Accessibility testing | WCAG 2.1 AA | ✅ Configured |
| **Chromatic** | Visual regression | All components | ✅ Configured |
| **pytest** | Python unit tests | >90% | ✅ Existing |

---

## Quick Start

### Installation

```bash
# Install JavaScript testing dependencies
npm install

# Install Python testing dependencies (already done)
pip install -e ".[dev]"
```

### Run All Tests

```bash
# JavaScript tests
npm test

# E2E tests
npm run test:e2e

# Accessibility tests
npm run test:a11y

# Python tests
pytest
```

---

## Vitest (JavaScript Unit Testing)

### Purpose

Test JavaScript logic in isolation:
- FastBulma class methods
- CSS variable management
- Theme switching logic
- Error boundary handling
- Component registration

### Configuration

**File**: `vitest.config.js`

Key settings:
- **Environment**: jsdom (DOM simulation)
- **Coverage**: v8 provider with >80% thresholds
- **UI**: Vitest UI for debugging
- **Timeout**: 10 seconds

### Test Files

```
tests/js/
├── setup.js                          # Test environment setup
├── fastbulma.test.js                 # FastBulma class tests
└── css-variables.test.js             # CSS variable mapping tests
```

### Running Tests

```bash
# Run all tests in watch mode
npm test

# Run once
npm run test:run

# Run with UI (interactive)
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest tests/js/fastbulma.test.js
```

### Writing Tests

```javascript
import { describe, it, expect } from 'vitest';

describe('FastBulma', () => {
  it('should set CSS variable', () => {
    setCSSVariable('--test-color', '#ff0000');
    const value = getCSSVariable('--test-color');
    expect(value).toBe('#ff0000');
  });
});
```

### Coverage Targets

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

View coverage report:
```bash
npm run test:coverage
open coverage/index.html
```

---

## Playwright (E2E Testing)

### Purpose

Test complete user flows in real browsers:
- Component registration
- Theme switching
- Form interactions
- CSS variable application
- Keyboard navigation

### Configuration

**File**: `playwright.config.js`

**Test Matrix**:
- Desktop: Chrome, Firefox, Safari
- Mobile: Chrome (Pixel 5), Safari (iPhone 12)
- Accessibility: Chrome with axe-core

### Test Files

```
tests/e2e/
├── component-registration.spec.js    # Component loading tests
├── theme-switching.spec.js           # Theme switching tests
└── accessibility/
    └── accessibility.spec.js         # WCAG compliance tests
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run specific test file
npx playwright test component-registration.spec.js

# Run in debug mode
npm run test:e2e:debug

# Run specific project (chromium only)
npx playwright test --project=chromium

# Run mobile tests
npx playwright test --project="Mobile Chrome"
```

### Debugging

```bash
# Debug mode with inspector
npm run test:e2e:debug

# Run with headed browser
npx playwright test --headed

# Run specific test with trace
npx playwright test --trace on
```

### Test Reports

```bash
# View HTML report
npx playwright show-report

# View JSON results
cat playwright-results.json
```

---

## Accessibility Testing (axe-core)

### Purpose

Automated WCAG 2.1 AA compliance checking:
- ARIA attributes
- Keyboard navigation
- Color contrast
- Screen reader compatibility
- Focus management

### Configuration

Uses `@axe-core/playwright` with Playwright integration.

### Running Tests

```bash
# Run accessibility tests only
npm run test:a11y

# Or via Playwright
npx playwright test --project=accessibility
```

### Test Categories

1. **WCAG Compliance**: Full WCAG 2.1 AA scan
2. **Component Accessibility**: Individual component checks
3. **Keyboard Navigation**: Tab order and interactions
4. **Color Contrast**: AA compliance (4.5:1 minimum)
5. **ARIA Attributes**: Proper labeling and roles
6. **Screen Reader**: Accessible names and descriptions
7. **Focus Management**: Focus trapping and restoration
8. **Mobile**: Touch targets (44x44 minimum)

### Common Issues

**Issue**: "Elements must have sufficient color contrast"
**Solution**: Ensure text-to-background ratio is ≥4.5:1

**Issue**: "Buttons must have accessible name"
**Solution**: Add text content, `aria-label`, or `title` attribute

**Issue**: "Form inputs must have labels"
**Solution**: Associate `<label>` or use `aria-label`/`aria-labelledby`

---

## Visual Regression Testing (Chromatic)

### Purpose

Catch visual bugs before they reach production:
- Component rendering consistency
- Cross-browser visual testing
- Theme appearance verification
- Responsive design validation

### Configuration

**File**: `.chromaticrc.json`

### Setup

```bash
# Install Chromatic CLI
npm install -g chromatic

# Build Storybook (if using)
npm run build:chromatic
```

### Running Tests

```bash
# Run Chromatic (requires Chromatic project setup)
npm run test:visual

# Or with Chromatic CLI
chromatic --project-token=YOUR_TOKEN
```

### Best Practices

1. **Review all changes**: Don't auto-accept changes
2. **Group by component**: Review changes per component
3. **Check all browsers**: Verify Chrome, Firefox, Safari
4. **Test themes**: Review both light and dark mode
5. **Responsive**: Check mobile, tablet, desktop viewports

---

## pytest (Python Testing)

### Purpose

Test Python integration and build tools:
- Package metadata
- CLI commands
- Static asset serving
- Documentation generation

### Running Tests

```bash
# Run all Python tests
pytest

# Run with coverage
pytest --cov=fastbulma --cov-report=html

# Run specific test
pytest tests/test_fastbulma.py::test_version

# Run with markers
pytest -m unit
pytest -m "not slow"
```

---

## CI/CD Integration

### Pre-commit Hooks

Crackerjack automatically runs tests on commit:

```bash
# Python tests (pytest)
pytest -x

# JavaScript tests (Vitest)
npm run test:run
```

### GitHub Actions (Future)

Create `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:run
      - run: npm run test:e2e
      - run: pytest
```

---

## Testing Best Practices

### 1. Test Isolation

Each test should be independent:
- Clean up DOM in `afterEach`
- Reset CSS variables
- Clear timers and mocks

### 2. Descriptive Names

```javascript
// Good
it('should switch to dark mode when data-theme="dark" is set', () => {
  // ...
});

// Bad
it('works', () => {
  // ...
});
```

### 3. Arrange-Act-Assert

```javascript
it('should update button color when theme changes', () => {
  // Arrange
  const button = createButton();
  document.body.appendChild(button);

  // Act
  switchTheme('dark');

  // Assert
  const color = getComputedStyle(button).backgroundColor;
  expect(color).toBe(darkColor);
});
```

### 4. Test User Behavior, Not Implementation

```javascript
// Good - tests what user sees
it('should show error message when form is invalid', () => {
  fillForm(invalidData);
  submitForm();
  expect(errorMessage).toBeVisible();
});

// Bad - tests implementation details
it('should call setError(true) when validation fails', () => {
  validateForm();
  expect(setError).toHaveBeenCalledWith(true);
});
```

### 5. Use Page Objects for E2E

```javascript
// tests/e2e/helpers/page-objects.js
class FastBulmaPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/demo.html');
  }

  async getPrimaryButton() {
    return this.page.locator('fast-button.is-primary').first();
  }
}
```

### 6. Mock External Dependencies

```javascript
// Mock FAST CDN imports
vi.mock('@microsoft/fast-components', () => ({
  fastButton: class MockButton {},
  fastCard: class MockCard {},
}));
```

---

## Troubleshooting

### Tests Fail Locally but Pass in CI

**Cause**: Environment differences
**Solution**: Use exact Node version in CI

```bash
# Use .nvmrc
echo "18" > .nvmrc
nvm use
```

### Playwright Tests Timeout

**Cause**: Page load too slow
**Solution**: Increase timeout

```javascript
test('slow test', async ({ page }) => {
  test.setTimeout(30000); // 30 seconds
  // ...
});
```

### Coverage Not Generated

**Cause**: Source files not in include path
**Solution**: Update `vitest.config.js`

```javascript
coverage: {
  include: ['src/fastbulma/static/js/**/*.js'],
}
```

### axe-core Reports Too Many Violations

**Cause**: Demo page has intentional issues
**Solution**: Exclude specific elements

```javascript
const scanResults = await new AxeBuilder({ page })
  .exclude('.unrelated-component')
  .analyze();
```

---

## Test Metrics Dashboard

Track testing metrics over time:

| Metric | Target | Current |
|--------|--------|---------|
| JS Unit Test Coverage | >80% | TBD |
| E2E Test Pass Rate | 100% | TBD |
| Accessibility Violations | 0 | TBD |
| Visual Regression Baselines | 100% | TBD |
| Python Test Coverage | >90% | ✅ 100% |

---

## Next Steps

1. **Install Dependencies**: `npm install`
2. **Run Initial Tests**: `npm test && npm run test:e2e`
3. **Fix Failing Tests**: Address any issues
4. **Set Up CI**: Create GitHub Actions workflow
5. **Configure Chromatic**: Set up visual regression testing
6. **Monitor Coverage**: Keep >80% coverage for new code

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [axe-core Documentation](https://www.deque.com/axe/)
- [Chromatic Documentation](https://www.chromatic.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Last Updated**: 2025-01-24
**Maintained By**: FastBulma Team
