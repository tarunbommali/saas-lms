# Contributing Guide

## Welcome!

Thank you for considering contributing to the JNTU GV LMS project! This guide will help you get started.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Pull Request Process](#pull-request-process)
5. [Coding Standards](#coding-standards)
6. [Testing Requirements](#testing-requirements)
7. [Documentation](#documentation)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Harassment, trolling, or derogatory comments
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### 1. Fork the Repository

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/saas-lms.git
cd saas-lms
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run init:db

# Start development servers
npm run dev
```

### 3. Create a Branch

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or a bug fix branch
git checkout -b fix/bug-description
```

## Development Workflow

### 1. Make Your Changes

- Follow the [coding standards](coding-standards.md)
- Write clean, readable code
- Add comments for complex logic
- Keep commits small and focused

### 2. Write Tests

```bash
# Run tests
npm test

# Run specific test
npm test -- CourseService.test.js

# Check coverage
npm run test:coverage
```

**Test Requirements:**
- Unit tests for new functions/methods
- Integration tests for API endpoints
- E2E tests for critical user flows
- Maintain >80% code coverage

### 3. Update Documentation

- Update README if adding new features
- Add JSDoc comments to functions
- Update API documentation if changing endpoints
- Add examples for new functionality

### 4. Run Linter

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

## Pull Request Process

### 1. Before Submitting

**Checklist:**
- [ ] Code follows project standards
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No console.logs or debug code
- [ ] Commits are clean and descriptive
- [ ] Branch is up to date with main

```bash
# Update your branch
git checkout main
git pull upstream main
git checkout your-branch
git rebase main
```

### 2. Create Pull Request

**PR Title Format:**
```
[Type] Brief description

Examples:
[Feature] Add course enrollment functionality
[Fix] Resolve payment gateway timeout
[Docs] Update API documentation
[Refactor] Extract validation logic
```

**PR Description Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots here

## Related Issues
Closes #123
Related to #456

## Checklist
- [ ] Code follows project standards
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### 3. Code Review

**Review Process:**
1. Automated checks run (tests, linting)
2. At least one team member reviews
3. Address review comments
4. Get approval
5. Merge to main

**Responding to Reviews:**
- Be open to feedback
- Ask questions if unclear
- Make requested changes
- Update PR with changes
- Request re-review

### 4. After Merge

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Delete your feature branch
git branch -d feature/your-feature-name
```

## Coding Standards

### JavaScript/Node.js

```javascript
// Use const/let, not var
const API_URL = 'https://api.example.com';
let count = 0;

// Use arrow functions
const add = (a, b) => a + b;

// Use async/await
async function fetchData() {
  try {
    const response = await fetch(API_URL);
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Use destructuring
const { name, email } = user;
const [first, second] = array;

// Use template literals
const message = `Hello, ${name}!`;
```

### React

```javascript
// Functional components with hooks
function CourseCard({ course }) {
  const [enrolled, setEnrolled] = useState(false);
  
  useEffect(() => {
    checkEnrollment();
  }, [course.id]);
  
  return (
    <div className="course-card">
      <h3>{course.title}</h3>
    </div>
  );
}

// PropTypes for type checking
CourseCard.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired
  }).isRequired
};
```

See [coding-standards.md](coding-standards.md) for complete guidelines.

## Testing Requirements

### Unit Tests

```javascript
describe('CourseService', () => {
  it('should create course with valid data', async () => {
    const data = { title: 'Test', price: 999 };
    const result = await courseService.create(data);
    expect(result.title).toBe('Test');
  });
});
```

### Integration Tests

```javascript
describe('POST /api/courses', () => {
  it('should create course', async () => {
    const response = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test', price: 999 })
      .expect(201);
    
    expect(response.body.data.title).toBe('Test');
  });
});
```

### E2E Tests

```javascript
test('user can enroll in course', async ({ page }) => {
  await page.goto('/courses');
  await page.click('text=Introduction to React');
  await page.click('button:has-text("Enroll")');
  await expect(page).toHaveURL(/\/learn\//);
});
```

## Documentation

### Code Comments

```javascript
/**
 * Calculates the discounted price
 * @param {number} price - Original price
 * @param {number} discount - Discount percentage (0-100)
 * @returns {number} Discounted price
 */
function calculateDiscount(price, discount) {
  return price * (1 - discount / 100);
}
```

### README Updates

When adding new features:
1. Update main README.md
2. Add to relevant documentation
3. Include usage examples
4. Update API documentation if applicable

## Common Issues

### Tests Failing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Reset database
npm run init:db

# Run tests again
npm test
```

### Linting Errors

```bash
# Auto-fix most issues
npm run lint:fix

# Check remaining issues
npm run lint
```

### Merge Conflicts

```bash
# Update your branch
git checkout main
git pull upstream main
git checkout your-branch
git rebase main

# Resolve conflicts in your editor
# Then continue rebase
git add .
git rebase --continue
```

## Getting Help

### Resources

- [Documentation](../README.md)
- [Architecture Guide](../architecture/overview.md)
- [API Documentation](../api/overview.md)
- [Testing Guide](testing-guide.md)

### Communication

- **Issues**: Create GitHub issue for bugs/features
- **Discussions**: Use GitHub Discussions for questions
- **Email**: dev-team@jntugv.edu.in

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

**Thank you for contributing to JNTU GV LMS!** 🎉

**Last Updated**: 2026-01-12  
**Maintained By**: Development Team
