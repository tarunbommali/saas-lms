# Coding Standards

## Overview

This document defines coding standards and best practices for the JNTU GV LMS project to ensure code quality, maintainability, and consistency.

## General Principles

### 1. Code Quality
- Write clean, readable code
- Follow SOLID principles
- Keep functions small and focused
- Use meaningful names
- Comment complex logic

### 2. DRY (Don't Repeat Yourself)
- Extract reusable code into functions/components
- Create utility functions for common operations
- Use composition over duplication

### 3. KISS (Keep It Simple, Stupid)
- Prefer simple solutions over complex ones
- Avoid premature optimization
- Write code that's easy to understand

### 4. YAGNI (You Aren't Gonna Need It)
- Don't add functionality until needed
- Avoid speculative features
- Focus on current requirements

## JavaScript/Node.js Standards

### Naming Conventions

```javascript
// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// Variables and functions: camelCase
const userName = 'John Doe';
function calculateTotal(items) { }

// Classes and Components: PascalCase
class UserService { }
function CourseCard() { }

// Private methods: prefix with underscore
class Service {
  _privateMethod() { }
}

// Boolean variables: prefix with is/has/should
const isActive = true;
const hasPermission = false;
const shouldUpdate = true;
```

### File Naming

```
// Components: PascalCase
CourseCard.jsx
UserProfile.jsx

// Utilities: camelCase
dateUtils.js
apiClient.js

// Services: camelCase with .service suffix
auth.service.js
course.service.js

// Tests: same name with .test suffix
CourseCard.test.jsx
auth.service.test.js
```

### Code Structure

```javascript
// 1. Imports (grouped and sorted)
// External dependencies
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Internal dependencies
import { formatDate } from '../utils/dateUtils';
import CourseCard from '../components/CourseCard';

// Styles
import './styles.css';

// 2. Constants
const MAX_ITEMS = 10;
const API_ENDPOINT = '/api/courses';

// 3. Component/Function definition
function CourseListing() {
  // 3a. State declarations
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 3b. Effects
  useEffect(() => {
    fetchCourses();
  }, []);
  
  // 3c. Event handlers
  const handleEnroll = (courseId) => {
    // Implementation
  };
  
  // 3d. Helper functions
  const fetchCourses = async () => {
    // Implementation
  };
  
  // 3e. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

// 4. Exports
export default CourseListing;
```

### Function Guidelines

```javascript
// Good: Single responsibility, clear purpose
function calculateDiscountedPrice(price, discountPercent) {
  return price * (1 - discountPercent / 100);
}

// Bad: Multiple responsibilities
function processOrder(order) {
  // Validates order
  // Calculates price
  // Sends email
  // Updates database
  // Too many responsibilities!
}

// Good: Small, focused functions
function validateOrder(order) {
  // Validation logic
}

function calculateOrderTotal(order) {
  // Calculation logic
}

function sendOrderConfirmation(order) {
  // Email logic
}

// Good: Descriptive parameters
function createUser({ email, password, name, role }) {
  // Implementation
}

// Bad: Too many positional parameters
function createUser(email, password, name, role, phone, address) {
  // Hard to remember order
}
```

### Error Handling

```javascript
// Good: Specific error handling
async function fetchCourse(id) {
  try {
    const response = await api.get(`/courses/${id}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`Course ${id} not found`);
    }
    if (error.response?.status === 403) {
      throw new Error('Access denied');
    }
    throw new Error('Failed to fetch course');
  }
}

// Good: Custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// Usage
if (!email) {
  throw new ValidationError('Email is required', 'email');
}
```

### Async/Await

```javascript
// Good: Use async/await
async function enrollInCourse(courseId) {
  try {
    const course = await fetchCourse(courseId);
    const payment = await processPayment(course.price);
    const enrollment = await createEnrollment(courseId, payment.id);
    return enrollment;
  } catch (error) {
    logger.error('Enrollment failed:', error);
    throw error;
  }
}

// Bad: Callback hell
function enrollInCourse(courseId, callback) {
  fetchCourse(courseId, (err, course) => {
    if (err) return callback(err);
    processPayment(course.price, (err, payment) => {
      if (err) return callback(err);
      createEnrollment(courseId, payment.id, callback);
    });
  });
}
```

## React Standards

### Component Structure

```javascript
// Good: Functional component with hooks
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

function CourseCard({ course, onEnroll }) {
  const [isEnrolled, setIsEnrolled] = useState(false);
  
  useEffect(() => {
    checkEnrollmentStatus();
  }, [course.id]);
  
  const checkEnrollmentStatus = async () => {
    // Implementation
  };
  
  const handleEnroll = () => {
    onEnroll(course.id);
    setIsEnrolled(true);
  };
  
  return (
    <div className="course-card">
      <h3>{course.title}</h3>
      <p>{course.description}</p>
      <button onClick={handleEnroll} disabled={isEnrolled}>
        {isEnrolled ? 'Enrolled' : 'Enroll Now'}
      </button>
    </div>
  );
}

CourseCard.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    price: PropTypes.number
  }).isRequired,
  onEnroll: PropTypes.func.isRequired
};

export default CourseCard;
```

### Hooks Best Practices

```javascript
// Good: Custom hooks for reusable logic
function useCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchCourses();
  }, []);
  
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await api.get('/courses');
      setCourses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return { courses, loading, error, refetch: fetchCourses };
}

// Usage
function CourseList() {
  const { courses, loading, error } = useCourses();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {courses.map(course => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}
```

### State Management

```javascript
// Good: Use Context for global state
import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  
  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    setUser(response.data.user);
    setToken(response.data.token);
    localStorage.setItem('token', response.data.token);
  };
  
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };
  
  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## Backend Standards

### Service Layer

```javascript
// Good: Service with clear responsibilities
class CourseService {
  constructor(courseRepository, emailService) {
    this.courseRepository = courseRepository;
    this.emailService = emailService;
  }
  
  async createCourse(data) {
    // Validate
    this._validateCourseData(data);
    
    // Create course
    const course = await this.courseRepository.create(data);
    
    // Send notification
    await this.emailService.sendCourseCreatedNotification(course);
    
    return course;
  }
  
  async getCourseById(id) {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundError(`Course ${id} not found`);
    }
    return course;
  }
  
  _validateCourseData(data) {
    if (!data.title) {
      throw new ValidationError('Title is required');
    }
    if (data.price < 0) {
      throw new ValidationError('Price must be positive');
    }
  }
}

module.exports = CourseService;
```

### Repository Layer

```javascript
// Good: Repository for data access
class CourseRepository {
  constructor(db) {
    this.db = db;
  }
  
  async create(data) {
    const [course] = await this.db
      .insert(courses)
      .values(data)
      .returning();
    return course;
  }
  
  async findById(id) {
    const [course] = await this.db
      .select()
      .from(courses)
      .where(eq(courses.id, id));
    return course;
  }
  
  async findAll({ page = 1, limit = 10, category }) {
    let query = this.db.select().from(courses);
    
    if (category) {
      query = query.where(eq(courses.category, category));
    }
    
    const offset = (page - 1) * limit;
    const results = await query.limit(limit).offset(offset);
    
    return results;
  }
  
  async update(id, data) {
    const [updated] = await this.db
      .update(courses)
      .set(data)
      .where(eq(courses.id, id))
      .returning();
    return updated;
  }
  
  async delete(id) {
    await this.db
      .delete(courses)
      .where(eq(courses.id, id));
  }
}

module.exports = CourseRepository;
```

### API Routes

```javascript
// Good: Clean route definitions
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const CourseController = require('../controllers/course.controller');

const courseController = new CourseController();

// Public routes
router.get('/', courseController.list);
router.get('/:id', courseController.getById);

// Protected routes
router.post('/', 
  authenticate, 
  authorize('admin', 'instructor'),
  courseController.create
);

router.put('/:id',
  authenticate,
  authorize('admin', 'instructor'),
  courseController.update
);

router.delete('/:id',
  authenticate,
  authorize('admin'),
  courseController.delete
);

module.exports = router;
```

## Database Standards

### Schema Naming

```javascript
// Good: Clear, descriptive names
const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('student'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Indexes
const userEmailIndex = index('user_email_idx').on(users.email);
const userRoleIndex = index('user_role_idx').on(users.role);
```

### Migrations

```javascript
// Good: Reversible migrations
exports.up = async function(db) {
  await db.schema.createTable('courses', (table) => {
    table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
    table.string('title', 255).notNullable();
    table.text('description');
    table.decimal('price', 10, 2).notNullable();
    table.string('category', 100);
    table.timestamps(true, true);
  });
  
  await db.schema.raw(`
    CREATE INDEX courses_category_idx ON courses(category);
    CREATE INDEX courses_created_at_idx ON courses(created_at);
  `);
};

exports.down = async function(db) {
  await db.schema.dropTable('courses');
};
```

## Testing Standards

### Test Structure

```javascript
// Good: Descriptive test structure
describe('CourseService', () => {
  let courseService;
  let mockRepository;
  
  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn()
    };
    courseService = new CourseService(mockRepository);
  });
  
  describe('createCourse', () => {
    it('should create course with valid data', async () => {
      // Arrange
      const courseData = {
        title: 'Test Course',
        price: 999
      };
      const expectedCourse = { id: '1', ...courseData };
      mockRepository.create.mockResolvedValue(expectedCourse);
      
      // Act
      const result = await courseService.createCourse(courseData);
      
      // Assert
      expect(result).toEqual(expectedCourse);
      expect(mockRepository.create).toHaveBeenCalledWith(courseData);
    });
    
    it('should throw error for invalid data', async () => {
      // Arrange
      const invalidData = { title: '' };
      
      // Act & Assert
      await expect(courseService.createCourse(invalidData))
        .rejects
        .toThrow('Title is required');
    });
  });
});
```

## Documentation Standards

### JSDoc Comments

```javascript
/**
 * Creates a new course in the system
 * @param {Object} courseData - The course data
 * @param {string} courseData.title - Course title
 * @param {string} courseData.description - Course description
 * @param {number} courseData.price - Course price in INR
 * @param {string} courseData.category - Course category
 * @returns {Promise<Object>} The created course object
 * @throws {ValidationError} If course data is invalid
 * @throws {DatabaseError} If database operation fails
 */
async function createCourse(courseData) {
  // Implementation
}
```

### README Documentation

```markdown
# Component Name

## Description
Brief description of what this component does.

## Usage
\`\`\`javascript
import ComponentName from './ComponentName';

function App() {
  return <ComponentName prop1="value" prop2={123} />;
}
\`\`\`

## Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| prop1 | string | Yes | - | Description of prop1 |
| prop2 | number | No | 0 | Description of prop2 |

## Examples
See examples in `examples/` directory.
```

## Git Standards

### Commit Messages

```bash
# Good: Clear, descriptive commits
feat: add course enrollment functionality
fix: resolve payment gateway timeout issue
docs: update API documentation
refactor: extract user validation logic
test: add unit tests for CourseService
chore: update dependencies

# Bad: Vague commits
update stuff
fix bug
changes
wip
```

### Branch Naming

```bash
# Feature branches
feature/course-enrollment
feature/payment-integration

# Bug fix branches
fix/login-error
fix/payment-timeout

# Hotfix branches
hotfix/security-patch
hotfix/critical-bug
```

## Code Review Checklist

- [ ] Code follows project standards
- [ ] Functions are small and focused
- [ ] Names are clear and descriptive
- [ ] Error handling is proper
- [ ] Tests are included
- [ ] Documentation is updated
- [ ] No console.logs in production code
- [ ] No commented-out code
- [ ] Security best practices followed
- [ ] Performance considered

---

**Last Updated**: 2026-01-12  
**Version**: 1.0  
**Maintained By**: Development Team
