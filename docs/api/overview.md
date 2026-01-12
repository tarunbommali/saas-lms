# API Documentation

## Overview

The JNTU GV LMS provides a comprehensive RESTful API for managing courses, users, enrollments, and learning activities. This document covers API conventions, authentication, and endpoint specifications.

## Base URL

```
Development: http://localhost:3000/api
Production:  https://api.jntugv-lms.com/api
```

## API Versioning

**Current Version**: v1 (implicit)  
**Future**: `/api/v1`, `/api/v2`

Versioning strategy:
- Major version in URL path
- Minor version in headers
- Backward compatibility maintained for 6 months

## Authentication

### JWT Bearer Token

All protected endpoints require a JWT token in the Authorization header.

**Request Header**:
```http
Authorization: Bearer <jwt_token>
```

**Token Structure**:
```json
{
  "userId": "123",
  "email": "user@example.com",
  "role": "student",
  "iat": 1705056000,
  "exp": 1705660800
}
```

**Token Expiration**: 7 days (configurable)

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request**:
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "role": "student"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123",
      "email": "student@example.com",
      "name": "John Doe",
      "role": "student"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

#### POST /auth/login
Authenticate and receive JWT token.

**Request**:
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123",
      "email": "student@example.com",
      "name": "John Doe",
      "role": "student"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

#### GET /auth/me
Get current authenticated user.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "123",
    "email": "student@example.com",
    "name": "John Doe",
    "role": "student",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

## Course Endpoints

### GET /courses
List all published courses.

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `category` (string): Filter by category
- `difficulty` (string): Filter by difficulty (beginner, intermediate, advanced)
- `search` (string): Search in title and description

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "course-1",
        "title": "Introduction to React",
        "description": "Learn React from scratch",
        "category": "Web Development",
        "difficulty": "beginner",
        "price": 999,
        "thumbnail": "https://cdn.example.com/react-thumb.jpg",
        "instructor": {
          "id": "inst-1",
          "name": "Jane Smith"
        },
        "stats": {
          "enrollments": 1250,
          "rating": 4.8,
          "reviews": 340
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "pages": 5
    }
  }
}
```

### GET /courses/:id
Get detailed course information.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "course-1",
    "title": "Introduction to React",
    "description": "Comprehensive React course...",
    "category": "Web Development",
    "difficulty": "beginner",
    "price": 999,
    "modules": [
      {
        "id": "mod-1",
        "title": "Getting Started",
        "order": 1,
        "lessons": [
          {
            "id": "lesson-1",
            "title": "What is React?",
            "type": "video",
            "duration": 600,
            "isFree": true
          }
        ]
      }
    ]
  }
}
```

### POST /courses (Admin Only)
Create a new course.

**Headers**: `Authorization: Bearer <admin_token>`

**Request**:
```json
{
  "title": "Advanced Node.js",
  "description": "Master Node.js development",
  "category": "Backend Development",
  "difficulty": "advanced",
  "price": 1999,
  "thumbnail": "base64_image_data"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "course-2",
    "title": "Advanced Node.js",
    "status": "draft"
  },
  "message": "Course created successfully"
}
```

## Enrollment Endpoints

### POST /enrollments
Enroll in a course.

**Headers**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "courseId": "course-1",
  "paymentMethod": "razorpay",
  "couponCode": "SAVE20"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "enrollmentId": "enroll-1",
    "courseId": "course-1",
    "userId": "123",
    "status": "active",
    "paymentStatus": "completed",
    "amountPaid": 799,
    "enrolledAt": "2026-01-12T10:00:00.000Z"
  },
  "message": "Enrollment successful"
}
```

### GET /enrollments
Get user's enrollments.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "enrollmentId": "enroll-1",
      "course": {
        "id": "course-1",
        "title": "Introduction to React",
        "thumbnail": "https://cdn.example.com/react-thumb.jpg"
      },
      "progress": {
        "completedLessons": 5,
        "totalLessons": 20,
        "percentage": 25
      },
      "enrolledAt": "2026-01-12T10:00:00.000Z"
    }
  ]
}
```

## Progress Endpoints

### POST /progress/lessons/:lessonId/complete
Mark a lesson as complete.

**Headers**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "timeSpent": 600,
  "notes": "Great lesson on hooks!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "lessonId": "lesson-1",
    "completed": true,
    "progress": {
      "moduleProgress": 33,
      "courseProgress": 10
    }
  },
  "message": "Lesson marked as complete"
}
```

### GET /progress/courses/:courseId
Get course progress.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "courseId": "course-1",
    "overallProgress": 25,
    "completedLessons": 5,
    "totalLessons": 20,
    "timeSpent": 3600,
    "modules": [
      {
        "moduleId": "mod-1",
        "progress": 100,
        "completedLessons": 3,
        "totalLessons": 3
      }
    ]
  }
}
```

## Quiz Endpoints

### POST /quizzes/:quizId/attempts
Start a quiz attempt.

**Headers**: `Authorization: Bearer <token>`

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "attemptId": "attempt-1",
    "quizId": "quiz-1",
    "questions": [
      {
        "id": "q1",
        "question": "What is React?",
        "type": "multiple_choice",
        "options": [
          "A library",
          "A framework",
          "A language"
        ],
        "points": 5
      }
    ],
    "timeLimit": 1800,
    "startedAt": "2026-01-12T10:00:00.000Z"
  }
}
```

### POST /quizzes/:quizId/attempts/:attemptId/submit
Submit quiz answers.

**Headers**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "answers": [
    {
      "questionId": "q1",
      "answer": "A library"
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "attemptId": "attempt-1",
    "score": 45,
    "totalPoints": 50,
    "percentage": 90,
    "passed": true,
    "passingScore": 70,
    "feedback": [
      {
        "questionId": "q1",
        "correct": true,
        "points": 5
      }
    ]
  },
  "message": "Quiz submitted successfully"
}
```

## Payment Endpoints

### POST /payments/create-order
Create a payment order.

**Headers**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "courseId": "course-1",
  "couponCode": "SAVE20"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "orderId": "order_123",
    "amount": 799,
    "currency": "INR",
    "razorpayOrderId": "order_razorpay_123",
    "key": "rzp_test_key"
  }
}
```

### POST /payments/verify
Verify payment completion.

**Headers**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "orderId": "order_123",
  "paymentId": "pay_razorpay_123",
  "signature": "signature_hash"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "paymentId": "pay-1",
    "status": "completed",
    "enrollmentId": "enroll-1"
  },
  "message": "Payment verified successfully"
}
```

## Certificate Endpoints

### GET /certificates
Get user's certificates.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "cert-1",
      "courseId": "course-1",
      "courseTitle": "Introduction to React",
      "issuedAt": "2026-01-12T10:00:00.000Z",
      "certificateUrl": "https://cdn.example.com/certificates/cert-1.pdf",
      "verificationCode": "CERT-2026-001"
    }
  ]
}
```

### GET /certificates/:id/download
Download certificate PDF.

**Headers**: `Authorization: Bearer <token>`

**Response**: PDF file download

### GET /certificates/verify/:code
Verify certificate authenticity.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "valid": true,
    "studentName": "John Doe",
    "courseTitle": "Introduction to React",
    "issuedAt": "2026-01-12T10:00:00.000Z",
    "certificateId": "cert-1"
  }
}
```

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  },
  "timestamp": "2026-01-12T10:00:00.000Z"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `PAYMENT_FAILED` | 402 | Payment processing failed |
| `INTERNAL_ERROR` | 500 | Server error |

### Example Error Responses

**401 Unauthorized**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication token is required"
  },
  "timestamp": "2026-01-12T10:00:00.000Z"
}
```

**400 Validation Error**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  },
  "timestamp": "2026-01-12T10:00:00.000Z"
}
```

## Rate Limiting

**Limits**:
- Anonymous: 100 requests/15 minutes
- Authenticated: 1000 requests/15 minutes
- Admin: 5000 requests/15 minutes

**Headers**:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705056900
```

**429 Response**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 900
  }
}
```

## Pagination

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response Format**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtering & Sorting

**Query Parameters**:
- `filter[field]`: Filter by field value
- `sort`: Sort field (prefix with `-` for descending)

**Example**:
```
GET /courses?filter[category]=Web Development&sort=-createdAt
```

## Webhooks

### Payment Webhook

**Endpoint**: `POST /webhooks/payment`

**Payload**:
```json
{
  "event": "payment.success",
  "data": {
    "orderId": "order_123",
    "paymentId": "pay_123",
    "amount": 799,
    "status": "captured"
  },
  "timestamp": "2026-01-12T10:00:00.000Z"
}
```

## API Client Examples

### JavaScript (Fetch)

```javascript
// Login
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'student@example.com',
    password: 'password123'
  })
});

const { data } = await response.json();
const token = data.token;

// Get courses
const coursesResponse = await fetch('http://localhost:3000/api/courses', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const courses = await coursesResponse.json();
```

### cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"password123"}'

# Get courses (with token)
curl -X GET http://localhost:3000/api/courses \
  -H "Authorization: Bearer <token>"
```

## OpenAPI Specification

Full OpenAPI 3.0 specification available at:
- Development: `http://localhost:3000/api-docs`
- Production: `https://api.jntugv-lms.com/api-docs`

## Microservices API (Future)

In the microservices architecture, APIs will be organized by service:

- **Auth Service**: `/auth/*`
- **Course Service**: `/courses/*`
- **Enrollment Service**: `/enrollments/*`
- **Payment Service**: `/payments/*`
- **Quiz Service**: `/quizzes/*`
- **Certificate Service**: `/certificates/*`
- **Progress Service**: `/progress/*`

See [microservices.md](../architecture/microservices.md) for details.

---

**Last Updated**: 2026-01-12  
**API Version**: 1.0  
**Contact**: api-support@jntugv.edu.in
