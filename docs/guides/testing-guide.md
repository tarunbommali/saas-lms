# Testing Guide

## Overview

This guide covers testing strategies, tools, and best practices for the JNTU GV LMS project.

## Testing Strategy

### Testing Pyramid

```
        /\
       /E2E\          ← Few, slow, expensive
      /──────\
     /Integration\    ← Some, moderate speed
    /────────────\
   /  Unit Tests  \   ← Many, fast, cheap
  /────────────────\
```

### Test Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Main user flows covered

## Testing Stack

### Frontend Testing
- **Framework**: Vitest
- **Component Testing**: React Testing Library
- **E2E Testing**: Playwright
- **Mocking**: MSW (Mock Service Worker)

### Backend Testing
- **Framework**: Jest
- **API Testing**: Supertest
- **Database**: In-memory SQLite for tests
- **Mocking**: Jest mocks

## Unit Testing

### Frontend Unit Tests

#### Component Test Example

```javascript
// src/components/CourseCard.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CourseCard from './CourseCard';

describe('CourseCard', () => {
  const mockCourse = {
    id: '1',
    title: 'React Basics',
    price: 999,
    thumbnail: 'https://example.com/thumb.jpg'
  };

  it('renders course title', () => {
    render(<CourseCard course={mockCourse} />);
    expect(screen.getByText('React Basics')).toBeInTheDocument();
  });

  it('displays formatted price', () => {
    render(<CourseCard course={mockCourse} />);
    expect(screen.getByText('₹999')).toBeInTheDocument();
  });

  it('shows course thumbnail', () => {
    render(<CourseCard course={mockCourse} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', mockCourse.thumbnail);
  });
});
```

#### Custom Hook Test

```javascript
// src/hooks/useCourses.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import useCourses from './useCourses';

describe('useCourses', () => {
  it('fetches courses successfully', async () => {
    const mockCourses = [{ id: '1', title: 'React' }];
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ data: mockCourses })
      })
    );

    const { result } = renderHook(() => useCourses());

    await waitFor(() => {
      expect(result.current.courses).toEqual(mockCourses);
      expect(result.current.loading).toBe(false);
    });
  });
});
```

### Backend Unit Tests

#### Service Test Example

```javascript
// backend/services/course.service.test.js
const CourseService = require('./course.service');
const CourseRepository = require('../repositories/course.repository');

jest.mock('../repositories/course.repository');

describe('CourseService', () => {
  let courseService;

  beforeEach(() => {
    courseService = new CourseService();
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    it('creates course successfully', async () => {
      const courseData = {
        title: 'New Course',
        description: 'Description',
        price: 999
      };

      const mockCourse = { id: '1', ...courseData };
      CourseRepository.create.mockResolvedValue(mockCourse);

      const result = await courseService.createCourse(courseData);

      expect(result).toEqual(mockCourse);
      expect(CourseRepository.create).toHaveBeenCalledWith(courseData);
    });

    it('throws error for invalid data', async () => {
      const invalidData = { title: '' };

      await expect(
        courseService.createCourse(invalidData)
      ).rejects.toThrow('Invalid course data');
    });
  });
});
```

#### Repository Test Example

```javascript
// backend/repositories/course.repository.test.js
const CourseRepository = require('./course.repository');
const db = require('../db');

describe('CourseRepository', () => {
  beforeEach(async () => {
    await db.migrate.latest();
  });

  afterEach(async () => {
    await db.migrate.rollback();
  });

  it('creates a course', async () => {
    const courseData = {
      title: 'Test Course',
      description: 'Test Description',
      price: 999
    };

    const course = await CourseRepository.create(courseData);

    expect(course).toHaveProperty('id');
    expect(course.title).toBe(courseData.title);
  });

  it('finds course by id', async () => {
    const created = await CourseRepository.create({
      title: 'Test',
      price: 999
    });

    const found = await CourseRepository.findById(created.id);

    expect(found.id).toBe(created.id);
  });
});
```

## Integration Testing

### API Integration Tests

```javascript
// backend/routes/courses.test.js
const request = require('supertest');
const app = require('../app');
const db = require('../db');

describe('Course API', () => {
  let authToken;

  beforeAll(async () => {
    await db.migrate.latest();
    
    // Create test user and get token
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });
    
    authToken = response.body.data.token;
  });

  afterAll(async () => {
    await db.migrate.rollback();
    await db.destroy();
  });

  describe('GET /api/courses', () => {
    it('returns list of courses', async () => {
      const response = await request(app)
        .get('/api/courses')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.courses)).toBe(true);
    });

    it('filters courses by category', async () => {
      const response = await request(app)
        .get('/api/courses?category=Web Development')
        .expect(200);

      const courses = response.body.data.courses;
      courses.forEach(course => {
        expect(course.category).toBe('Web Development');
      });
    });
  });

  describe('POST /api/courses', () => {
    it('creates course with admin token', async () => {
      const courseData = {
        title: 'New Course',
        description: 'Description',
        category: 'Programming',
        price: 999
      };

      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(courseData)
        .expect(201);

      expect(response.body.data.title).toBe(courseData.title);
    });

    it('returns 401 without auth token', async () => {
      await request(app)
        .post('/api/courses')
        .send({ title: 'Test' })
        .expect(401);
    });
  });
});
```

### Database Integration Tests

```javascript
// backend/db/integration.test.js
const db = require('./index');
const { users, courses, enrollments } = require('./schema');

describe('Database Integration', () => {
  beforeEach(async () => {
    await db.delete(enrollments);
    await db.delete(courses);
    await db.delete(users);
  });

  it('creates user and enrollment with foreign key', async () => {
    // Create user
    const [user] = await db.insert(users).values({
      email: 'test@example.com',
      password: 'hashed',
      name: 'Test User'
    }).returning();

    // Create course
    const [course] = await db.insert(courses).values({
      title: 'Test Course',
      price: 999
    }).returning();

    // Create enrollment
    const [enrollment] = await db.insert(enrollments).values({
      userId: user.id,
      courseId: course.id,
      status: 'active'
    }).returning();

    expect(enrollment.userId).toBe(user.id);
    expect(enrollment.courseId).toBe(course.id);
  });
});
```

## E2E Testing

### Playwright Setup

```javascript
// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Examples

```javascript
// e2e/auth.spec.js
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can register', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="name"]', 'New User');
    
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome, New User')).toBeVisible();
  });

  test('user can login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpass');
    
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
```

```javascript
// e2e/course-enrollment.spec.js
import { test, expect } from '@playwright/test';

test.describe('Course Enrollment', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'student@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('user can enroll in free course', async ({ page }) => {
    await page.goto('/courses');
    
    // Find and click on a free course
    await page.click('text=Introduction to Programming');
    
    // Click enroll button
    await page.click('button:has-text("Enroll Now")');

    // Verify enrollment success
    await expect(page.locator('text=Enrollment successful')).toBeVisible();
    await expect(page).toHaveURL(/\/learn\//);
  });

  test('user can purchase paid course', async ({ page }) => {
    await page.goto('/courses');
    
    await page.click('text=Advanced React');
    await page.click('button:has-text("Buy Now")');

    // Fill payment details (mock)
    await page.fill('input[name="cardNumber"]', '4111111111111111');
    await page.fill('input[name="expiry"]', '12/25');
    await page.fill('input[name="cvv"]', '123');
    
    await page.click('button:has-text("Pay")');

    await expect(page.locator('text=Payment successful')).toBeVisible();
  });
});
```

## Performance Testing

### Load Testing with k6

```javascript
// tests/load/courses-api.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failure rate
  },
};

export default function () {
  // Test GET /api/courses
  const coursesRes = http.get('http://localhost:3000/api/courses');
  check(coursesRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test GET /api/courses/:id
  const courseRes = http.get('http://localhost:3000/api/courses/1');
  check(courseRes, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
```

Run load test:
```bash
k6 run tests/load/courses-api.js
```

## Test Coverage

### Generate Coverage Report

```bash
# Frontend
npm run test:coverage

# Backend
npm run test:coverage:backend
```

### Coverage Configuration

```javascript
// vitest.config.js
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
};
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test
          MYSQL_DATABASE: test_db
        ports:
          - 3306:3306

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linter
        run: npm run lint
        
      - name: Run unit tests
        run: npm test
        
      - name: Run integration tests
        run: npm run test:integration
        env:
          DB_HOST: 127.0.0.1
          DB_USER: root
          DB_PASSWORD: test
          DB_NAME: test_db
        
      - name: Run E2E tests
        run: npx playwright test
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Best Practices

### 1. Test Naming

```javascript
// Good
describe('CourseService', () => {
  describe('createCourse', () => {
    it('creates course with valid data', () => {});
    it('throws error for duplicate title', () => {});
    it('validates required fields', () => {});
  });
});

// Bad
describe('tests', () => {
  it('test1', () => {});
  it('test2', () => {});
});
```

### 2. AAA Pattern

```javascript
it('creates course successfully', async () => {
  // Arrange
  const courseData = { title: 'Test', price: 999 };
  
  // Act
  const result = await courseService.create(courseData);
  
  // Assert
  expect(result.title).toBe('Test');
});
```

### 3. Test Isolation

```javascript
// Each test should be independent
beforeEach(() => {
  // Reset state before each test
  jest.clearAllMocks();
  db.reset();
});
```

### 4. Mock External Dependencies

```javascript
// Mock external API
jest.mock('../services/payment.service', () => ({
  processPayment: jest.fn().mockResolvedValue({ success: true })
}));
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- courses.test.js

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run load tests
npm run test:load
```

---

**Last Updated**: 2026-01-12  
**Next**: [Contributing Guide](contributing.md)
