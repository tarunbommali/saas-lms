# JNTU-GV Certification Platform - Architecture Documentation

## 🏗️ System Architecture Overview

This document describes the complete architecture of the JNTU-GV Certification Platform, designed for scalability, maintainability, and future extensibility.

---

## 📋 Table of Contents

1. [Architecture Principles](#architecture-principles)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Database Schema](#database-schema)
5. [API Design](#api-design)
6. [Security Architecture](#security-architecture)
7. [Future Extensibility](#future-extensibility)

---

## 🎯 Architecture Principles

### Clean Architecture
- **Separation of Concerns**: Each layer has a single responsibility
- **Dependency Rule**: Dependencies point inward (Controllers → Services → Repositories)
- **Independence**: Business logic independent of frameworks and UI
- **Testability**: Each layer can be tested independently

### Design Patterns Used
1. **MVC Pattern**: Model-View-Controller for backend
2. **Repository Pattern**: Data access abstraction
3. **Service Layer Pattern**: Business logic encapsulation
4. **DTO Pattern**: Data transfer between layers
5. **Factory Pattern**: Object creation
6. **Singleton Pattern**: Configuration and connections
7. **Observer Pattern**: Event handling (ready for future use)

---

## 🔧 Backend Architecture

### Layer Structure

```
backend/
├── controllers/          # HTTP request handlers
│   ├── auth.controller.js
│   ├── course.controller.js
│   ├── enrollment.controller.js
│   ├── payment.controller.js
│   └── certificate.controller.js
│
├── services/            # Business logic layer
│   ├── auth.service.js
│   ├── course.service.js
│   ├── enrollment.service.js
│   ├── payment.service.js
│   ├── certificate.service.js
│   ├── email.service.js
│   └── otp.service.js
│
├── repositories/        # Data access layer
│   ├── user.repository.js
│   ├── course.repository.js
│   ├── enrollment.repository.js
│   ├── payment.repository.js
│   └── certificate.repository.js
│
├── dto/                # Data Transfer Objects
│   ├── auth.dto.js
│   ├── course.dto.js
│   ├── enrollment.dto.js
│   └── payment.dto.js
│
├── validators/         # Input validation
│   ├── auth.validator.js
│   ├── course.validator.js
│   └── common.validator.js
│
├── middleware/         # Express middleware
│   ├── auth.middleware.js
│   ├── validation.middleware.js
│   ├── error.middleware.js
│   └── logging.middleware.js
│
├── config/            # Configuration
│   ├── database.config.js
│   ├── email.config.js
│   └── app.config.js
│
├── constants/         # Constants
│   ├── status.constants.js
│   ├── error.constants.js
│   └── role.constants.js
│
├── types/            # Type definitions
│   └── index.js
│
├── db/               # Database
│   ├── schema.js
│   ├── migrations/
│   └── seeds/
│
└── server.js         # Application entry point
```

### Request Flow

```
HTTP Request
    ↓
Middleware (Auth, Validation, Logging)
    ↓
Controller (HTTP handling, response formatting)
    ↓
Service (Business logic, orchestration)
    ↓
Repository (Database operations)
    ↓
Database (MySQL with Drizzle ORM)
    ↓
Repository (Transform to domain objects)
    ↓
Service (Apply business rules)
    ↓
Controller (Format response)
    ↓
Middleware (Error handling, logging)
    ↓
HTTP Response
```

### Layer Responsibilities

#### 1. Controllers
- **Purpose**: Handle HTTP requests and responses
- **Responsibilities**:
  - Parse request data
  - Call appropriate service methods
  - Format responses
  - Handle HTTP status codes
- **Should NOT**:
  - Contain business logic
  - Access database directly
  - Perform calculations

#### 2. Services
- **Purpose**: Implement business logic
- **Responsibilities**:
  - Orchestrate operations
  - Apply business rules
  - Coordinate multiple repositories
  - Handle transactions
- **Should NOT**:
  - Handle HTTP requests/responses
  - Know about Express
  - Access database directly

#### 3. Repositories
- **Purpose**: Data access abstraction
- **Responsibilities**:
  - CRUD operations
  - Query building
  - Data transformation
  - Database interaction
- **Should NOT**:
  - Contain business logic
  - Know about HTTP
  - Handle transactions (service layer handles)

---

## 💻 Frontend Architecture

### Feature-Based Structure

```
frontend/src/
├── features/              # Feature modules
│   ├── auth/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── courses/
│   ├── enrollments/
│   ├── certificates/
│   └── admin/
│
├── shared/               # Shared resources
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # Basic UI elements
│   │   ├── forms/       # Form components
│   │   ├── layouts/     # Layout components
│   │   └── feedback/    # Toasts, modals, etc.
│   ├── hooks/           # Shared React hooks
│   ├── services/        # API services
│   ├── utils/           # Utility functions
│   ├── constants/       # Constants
│   ├── types/           # TypeScript types
│   └── styles/          # Global styles
│
├── core/                # Core application logic
│   ├── api/            # API client configuration
│   ├── auth/           # Authentication logic
│   ├── router/         # Routing configuration
│   └── store/          # State management
│
├── assets/             # Static assets
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── App.jsx            # Root component
└── main.jsx           # Entry point
```

### Component Architecture

```
Feature Component Structure:
features/courses/
├── components/          # Feature-specific components
│   ├── CourseCard/
│   │   ├── CourseCard.jsx
│   │   ├── CourseCard.test.jsx
│   │   └── CourseCard.styles.js
│   └── CourseList/
│
├── pages/              # Feature pages
│   ├── CoursesPage.jsx
│   ├── CourseDetailPage.jsx
│   └── CourseCreatePage.jsx
│
├── hooks/              # Feature-specific hooks
│   ├── useCourses.js
│   └── useCourseDetail.js
│
├── services/           # Feature API services
│   └── course.service.js
│
└── types/             # Feature types
    └── course.types.js
```

---

## 🗄️ Database Schema (LMS-Grade)

### Core Tables

#### 1. Users Table
```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR(191) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  auth_provider ENUM('local', 'google', 'microsoft'),
  
  -- Profile
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  display_name VARCHAR(200),
  avatar_url TEXT,
  bio TEXT,
  
  -- Contact
  phone VARCHAR(20),
  alternate_email VARCHAR(191),
  
  -- Academic
  college VARCHAR(255),
  student_id VARCHAR(100),
  graduation_year INT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  
  -- Security
  password_reset_token VARCHAR(255),
  password_reset_expires DATETIME,
  email_verification_token VARCHAR(255),
  last_login_at DATETIME,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  
  INDEX idx_email (email),
  INDEX idx_auth_provider (auth_provider),
  INDEX idx_is_active (is_active)
)
```

#### 2. Courses Table
```sql
courses (
  id UUID PRIMARY KEY,
  
  -- Basic Info
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  short_description TEXT,
  description TEXT,
  
  -- Instructor
  instructor_id UUID,
  instructor_name VARCHAR(200),
  instructor_bio TEXT,
  
  -- Media
  thumbnail_url TEXT,
  banner_url TEXT,
  preview_video_url TEXT,
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  original_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'INR',
  
  -- Course Details
  duration_hours DECIMAL(5,2),
  difficulty_level ENUM('beginner', 'intermediate', 'advanced'),
  language VARCHAR(50) DEFAULT 'English',
  category_id UUID,
  
  -- Content
  learning_objectives JSON,
  prerequisites JSON,
  target_audience JSON,
  course_outline JSON,
  
  -- Status
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT false,
  is_bestseller BOOLEAN DEFAULT false,
  
  -- Stats
  enrollment_count INT DEFAULT 0,
  completion_count INT DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  
  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords JSON,
  
  -- Timestamps
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  
  FOREIGN KEY (instructor_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_status (status),
  INDEX idx_category (category_id),
  INDEX idx_featured (is_featured),
  FULLTEXT idx_search (title, short_description)
)
```

#### 3. Enrollments Table
```sql
enrollments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  
  -- Enrollment Details
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  
  -- Progress
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  last_accessed_at DATETIME,
  time_spent_minutes INT DEFAULT 0,
  
  -- Status
  status ENUM('active', 'completed', 'dropped', 'expired') DEFAULT 'active',
  completion_status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
  
  -- Access
  access_expires_at DATETIME,
  enrollment_source ENUM('purchase', 'free', 'admin_grant', 'coupon'),
  
  -- Payment
  payment_id UUID,
  amount_paid DECIMAL(10,2),
  
  -- Certificate
  certificate_id UUID,
  certificate_issued_at DATETIME,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_enrollment (user_id, course_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (certificate_id) REFERENCES certificates(id),
  INDEX idx_user (user_id),
  INDEX idx_course (course_id),
  INDEX idx_status (status)
)
```

#### 4. Course Modules Table
```sql
course_modules (
  id UUID PRIMARY KEY,
  course_id UUID NOT NULL,
  
  -- Module Info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INT NOT NULL,
  
  -- Content
  content_type ENUM('video', 'text', 'quiz', 'assignment', 'resource'),
  content_url TEXT,
  content_data JSON,
  duration_minutes INT,
  
  -- Access
  is_free_preview BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  unlock_conditions JSON,
  
  -- Status
  is_published BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_course_order (course_id, order_index)
)
```

#### 5. User Progress Table
```sql
user_progress (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  module_id UUID NOT NULL,
  
  -- Progress
  status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Tracking
  started_at DATETIME,
  completed_at DATETIME,
  last_position INT DEFAULT 0,
  time_spent_minutes INT DEFAULT 0,
  
  -- Attempts (for quizzes/assignments)
  attempts_count INT DEFAULT 0,
  best_score DECIMAL(5,2),
  latest_score DECIMAL(5,2),
  
  -- Data
  progress_data JSON,
  notes TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_progress (user_id, module_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
  INDEX idx_user_course (user_id, course_id)
)
```

#### 6. Certificates Table
```sql
certificates (
  id UUID PRIMARY KEY,
  certificate_number VARCHAR(100) UNIQUE NOT NULL,
  
  -- Ownership
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  enrollment_id UUID,
  
  -- Certificate Details
  issue_date DATETIME NOT NULL,
  expiry_date DATETIME,
  
  -- Validation
  verification_code VARCHAR(100) UNIQUE,
  is_valid BOOLEAN DEFAULT true,
  revoked_at DATETIME,
  revoked_by UUID,
  revoke_reason TEXT,
  
  -- Content
  template_id VARCHAR(50),
  certificate_data JSON,
  
  -- File
  certificate_url TEXT,
  file_hash VARCHAR(255),
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
  INDEX idx_user (user_id),
  INDEX idx_verification (verification_code),
  INDEX idx_valid (is_valid)
)
```

#### 7. Payments Table
```sql
payments (
  id UUID PRIMARY KEY,
  
  -- Transaction
  transaction_id VARCHAR(255) UNIQUE,
  order_id VARCHAR(255) UNIQUE,
  
  -- Ownership
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  
  -- Amount
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL,
  
  -- Payment Details
  payment_method ENUM('card', 'upi', 'netbanking', 'wallet'),
  payment_gateway ENUM('razorpay', 'stripe', 'paypal'),
  gateway_response JSON,
  
  -- Status
  status ENUM('pending', 'processing', 'completed', 'failed', 'refunded'),
  payment_status_code VARCHAR(50),
  
  -- Coupon
  coupon_id UUID,
  coupon_code VARCHAR(50),
  
  -- Receipt
  receipt_number VARCHAR(100),
  receipt_url TEXT,
  
  -- Refund
  refund_amount DECIMAL(10,2),
  refund_status ENUM('none', 'partial', 'full'),
  refunded_at DATETIME,
  
  -- Timestamps
  payment_initiated_at DATETIME,
  payment_completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_transaction (transaction_id)
)
```

---

## 🔌 API Design

### RESTful API Standards

#### Endpoint Naming
```
GET    /api/v1/courses           # List courses
GET    /api/v1/courses/:id       # Get single course
POST   /api/v1/courses           # Create course
PUT    /api/v1/courses/:id       # Update course (full)
PATCH  /api/v1/courses/:id       # Update course (partial)
DELETE /api/v1/courses/:id       # Delete course
```

#### Response Format
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

#### Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

---

## 🔒 Security Architecture

### Authentication Flow
1. User provides credentials
2. Server validates and generates JWT
3. JWT stored in httpOnly cookie + localStorage
4. JWT included in all API requests
5. Server validates JWT on each request

### Authorization Levels
- **Public**: No authentication required
- **Authenticated**: Valid JWT required
- **Admin**: JWT + admin role required
- **Owner**: JWT + resource ownership required

### Security Measures
- Password hashing with bcrypt (10 rounds)
- JWT with expiry (7 days)
- Rate limiting (per IP and per user)
- Input validation and sanitization
- SQL injection prevention (Drizzle ORM)
- XSS prevention
- CSRF protection
- CORS configuration
- Helmet.js security headers

---

## 🚀 Future Extensibility

### AI/LLM Integration Points (Future)

#### 1. Course Recommendation System
```javascript
// Future: AI-powered recommendations
GET /api/v1/recommendations/courses
Response: AI-suggested courses based on user profile and behavior
```

#### 2. Intelligent Tutoring System
```javascript
// Future: AI chatbot for course assistance
POST /api/v1/ai/tutor
Body: { courseId, question, context }
Response: AI-generated answers and explanations
```

#### 3. Content Generation
```javascript
// Future: AI-generated course content
POST /api/v1/ai/generate-content
Body: { topic, difficulty, format }
Response: AI-generated course outline and materials
```

#### 4. Assessment & Grading
```javascript
// Future: AI-powered assignment grading
POST /api/v1/ai/grade-assignment
Body: { assignmentId, submission }
Response: AI-generated grade and feedback
```

### Extensibility Design Patterns

#### Plugin Architecture (Ready)
```javascript
// plugins/
// ├── ai-recommendations/
// ├── ai-tutor/
// └── ai-content-generator/
```

#### Event-Driven Architecture (Ready)
```javascript
// events/
// ├── course.events.js
// ├── enrollment.events.js
// └── certificate.events.js

// Future: AI services subscribe to events
EventEmitter.on('enrollment.completed', (data) => {
  AIRecommendationService.updateUserProfile(data);
});
```

#### Microservices Ready
```
Current: Monolithic
Future: Services can be extracted
  - Auth Service
  - Course Service
  - AI Service
  - Payment Service
```

---

## 📊 Performance Optimization

### Database Optimization
- Proper indexing on frequently queried columns
- Query optimization with EXPLAIN
- Connection pooling
- Caching layer ready (Redis integration point)

### API Optimization
- Response pagination
- Field filtering (?fields=id,name)
- Request deduplication
- API response caching

### Frontend Optimization
- Code splitting
- Lazy loading
- Image optimization
- Bundle size optimization

---

## 📖 Documentation Standards

### Code Documentation
- JSDoc comments for all public methods
- README files in each major directory
- Architecture decision records (ADRs)

### API Documentation
- OpenAPI/Swagger specification
- Postman collection
- API examples and use cases

---

**Version:** 3.0.0  
**Last Updated:** January 1, 2026  
**Status:** Production Architecture
