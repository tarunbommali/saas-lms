# 🏗️ LMS System Architecture

## Overview

The JNTU GV LMS is designed as a modular, scalable learning management platform with clear separation of concerns and industry-standard architectural patterns.

---

## Current Architecture (Monolithic)

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer / CDN                   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Vite Dev Server (Development)               │
│                   Port: 5173                             │
│              Proxy: /api → localhost:3000                │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Express Backend Server                      │
│                   Port: 3000                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Routes Layer                                    │   │
│  │  - /api/auth                                     │   │
│  │  - /api/courses                                  │   │
│  │  - /api/enrollments                              │   │
│  │  - /api/payments                                 │   │
│  │  - /api/quizzes                                  │   │
│  │  - /api/certificates                             │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Service Layer                                   │   │
│  │  - AuthService                                   │   │
│  │  - CourseService                                 │   │
│  │  - PaymentService                                │   │
│  │  - EmailService                                  │   │
│  │  - ProgressService                               │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Repository Layer                                │   │
│  │  - Database access via Drizzle ORM              │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              MySQL Database (Port 3306)                  │
│  - users, courses, enrollments                           │
│  - quizzes, payments, certificates                       │
│  - progress tracking tables                              │
└─────────────────────────────────────────────────────────┘
```

---

## System Components

### 1. Frontend Layer (React + Vite)

**Technology**: React 19, Vite, TailwindCSS 4

**Responsibilities**:
- User interface rendering
- Client-side routing
- State management (Context API)
- API communication
- Form validation
- Real-time updates

**Key Features**:
- Hot Module Replacement (HMR)
- Code splitting
- Lazy loading
- Responsive design
- Accessibility (WCAG 2.1)

---

### 2. Backend Layer (Express.js)

**Technology**: Node.js 20, Express 5

**Architecture Pattern**: Layered Architecture

#### 2.1 Routes Layer
- HTTP request handling
- Request validation
- Response formatting
- Error handling

#### 2.2 Controller Layer
- Business logic orchestration
- Service coordination
- Data transformation

#### 2.3 Service Layer
- Core business logic
- Transaction management
- External API integration
- Email notifications

#### 2.4 Repository Layer
- Database queries
- Data access abstraction
- ORM operations (Drizzle)

---

### 3. Database Layer (MySQL 8)

**Schema Design**: Normalized relational database

**Key Tables**:
- `users` - User accounts and profiles
- `courses` - Course catalog
- `course_modules` - Course structure
- `module_lessons` - Lesson content
- `enrollments` - Student enrollments
- `quizzes` - Quiz definitions
- `quiz_attempts` - Student attempts
- `payments` - Transaction records
- `certificates` - Generated certificates
- `user_progress` - Learning progress

See [database.md](database.md) for detailed schema.

---

## Request Flow

### Example: Student Enrolls in Course

```
┌─────────┐
│ Student │
└────┬────┘
     │ 1. Click "Enroll"
     ▼
┌─────────────────┐
│  React Frontend │
└────┬────────────┘
     │ 2. POST /api/enrollments
     ▼
┌─────────────────┐
│  API Gateway    │ 3. Validate JWT
│  (Middleware)   │ 4. Check permissions
└────┬────────────┘
     │ 5. Forward to controller
     ▼
┌─────────────────┐
│  Enrollment     │ 6. Validate request
│  Controller     │ 7. Call service
└────┬────────────┘
     │ 8. Business logic
     ▼
┌─────────────────┐
│  Enrollment     │ 9. Check course availability
│  Service        │ 10. Verify payment (if needed)
│                 │ 11. Create enrollment
└────┬────────────┘
     │ 12. Database operations
     ▼
┌─────────────────┐
│  Repository     │ 13. INSERT enrollment
│  Layer          │ 14. UPDATE course stats
└────┬────────────┘
     │ 15. Commit transaction
     ▼
┌─────────────────┐
│  MySQL Database │
└────┬────────────┘
     │ 16. Return success
     ▼
┌─────────────────┐
│  Email Service  │ 17. Send welcome email
└─────────────────┘
```

---

## Security Architecture

### Authentication Flow

```
1. User Login
   ↓
2. Validate Credentials (bcrypt)
   ↓
3. Generate JWT Token
   ↓
4. Return Token to Client
   ↓
5. Client Stores Token (localStorage)
   ↓
6. Subsequent Requests Include Token
   ↓
7. Server Validates Token
   ↓
8. Grant/Deny Access
```

### Security Layers

1. **Network Layer**
   - HTTPS/TLS encryption
   - CORS configuration
   - Rate limiting

2. **Application Layer**
   - JWT authentication
   - Role-based access control (RBAC)
   - Input validation (Zod)
   - SQL injection prevention

3. **Data Layer**
   - Password hashing (bcrypt)
   - Sensitive data encryption
   - Database access control

---

## Scalability Considerations

### Current Limitations
- Single server deployment
- Vertical scaling only
- No caching layer
- No load balancing
- Limited to ~100 concurrent users

### Future Enhancements
See [ENHANCED_SYSTEM_DESIGN.md](ENHANCED_SYSTEM_DESIGN.md) for:
- Microservices architecture
- Horizontal scaling
- Redis caching
- Load balancing
- CDN integration
- Database sharding

---

## Integration Points

### External Services

1. **Email Service**
   - Provider: SMTP (Nodemailer)
   - Use Cases: Welcome emails, OTP, certificates
   - Configuration: Environment variables

2. **Payment Gateway**
   - Provider: Razorpay
   - Use Cases: Course purchases, refunds
   - Webhooks: Payment confirmation

3. **File Storage**
   - Current: Local filesystem
   - Future: AWS S3 / MinIO
   - Use Cases: Videos, PDFs, images

4. **Authentication**
   - Current: JWT
   - Future: OAuth 2.0 (Google, Microsoft)

---

## API Architecture

### RESTful API Design

**Base URL**: `http://localhost:3000/api`

**Versioning**: Not implemented (future: `/api/v1`)

**Authentication**: Bearer token in Authorization header

**Response Format**:
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "timestamp": "2026-01-12T08:00:00.000Z"
}
```

**Error Format**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  },
  "timestamp": "2026-01-12T08:00:00.000Z"
}
```

---

## Deployment Architecture

### Development
```
Developer Machine
  ├── Vite Dev Server (5173)
  ├── Express Server (3000)
  └── MySQL (3306)
```

### Production (Current)
```
Single Server
  ├── Express (serves static + API)
  └── MySQL
```

### Production (Future - Kubernetes)
See [DOCKER_KUBERNETES_GUIDE.md](DOCKER_KUBERNETES_GUIDE.md)

---

## Monitoring & Observability

### Current
- Console logging
- Error tracking in logs
- Manual monitoring

### Planned
- Prometheus metrics
- Grafana dashboards
- ELK stack for logging
- Jaeger for tracing
- Uptime monitoring

---

## Technology Decisions

### Why React?
- Component-based architecture
- Large ecosystem
- Strong community support
- Performance optimizations

### Why Express?
- Minimalist and flexible
- Large middleware ecosystem
- Easy to scale
- Well-documented

### Why MySQL?
- ACID compliance
- Relational data model fits LMS
- Strong consistency
- Mature and stable

### Why Drizzle ORM?
- Type-safe queries
- Lightweight
- SQL-like syntax
- Better performance than Prisma

---

## Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Page Load Time | < 2s | < 1s |
| API Response Time | < 500ms | < 100ms |
| Database Query Time | < 200ms | < 50ms |
| Concurrent Users | 100 | 10,000 |
| Uptime | 95% | 99.9% |

---

## Future Architecture (Microservices)

For detailed microservices architecture, see:
- [ENHANCED_SYSTEM_DESIGN.md](ENHANCED_SYSTEM_DESIGN.md)
- [MICROSERVICES_MIGRATION.md](MICROSERVICES_MIGRATION.md)

**Key Services**:
1. Auth Service
2. Course Service
3. Enrollment Service
4. Payment Service
5. Quiz Service
6. Certificate Service
7. Email Service
8. Analytics Service
9. Notification Service
10. Search Service
11. Media Service
12. Progress Service

---

## References

- [Database Schema](database.md)
- [API Documentation](api.md)
- [Deployment Guide](deployment.md)
- [Security Guidelines](security.md)

---

**Last Updated**: 2026-01-12  
**Version**: 1.0  
**Status**: Production