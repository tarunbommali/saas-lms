# Current System Architecture

This document describes the current monolithic architecture of the JNTU GV LMS.

## Architecture Overview

The system follows a traditional **monolithic architecture** with clear separation of concerns through a layered approach.

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│              Vite Dev Server (Development)               │
│                   Port: 5173                             │
│              Proxy: /api → localhost:3000                │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────────┐
│              Express Backend Server                      │
│                   Port: 3000                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  API Routes (/api/*)                             │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Middleware (Auth, Validation, Error Handling)   │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Controllers (Request/Response Handling)         │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Services (Business Logic)                       │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Repositories (Data Access)                      │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ SQL
┌────────────────────────▼────────────────────────────────┐
│              MySQL Database (Port 3306)                  │
│  - users, courses, enrollments, quizzes                  │
│  - payments, certificates, progress                      │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: TailwindCSS 4
- **Routing**: React Router v7
- **State Management**: Context API
- **HTTP Client**: Fetch API
- **Animations**: Framer Motion

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express 5
- **ORM**: Drizzle ORM
- **Authentication**: JWT
- **Validation**: Zod
- **Email**: Nodemailer

### Database
- **RDBMS**: MySQL 8
- **Schema**: Normalized relational model
- **Migrations**: Custom scripts

### DevOps
- **Version Control**: Git
- **Package Manager**: npm
- **Linting**: ESLint
- **Environment**: dotenv

## System Layers

### 1. Presentation Layer (Frontend)

**Location**: `src/`

**Responsibilities**:
- User interface rendering
- User input handling
- Client-side routing
- State management
- API communication

**Key Components**:
- **Pages**: Route-level components (`src/pages/`)
- **Components**: Reusable UI components (`src/components/`)
- **Contexts**: Global state management (`src/contexts/`)
- **Hooks**: Custom React hooks (`src/hooks/`)
- **API Client**: HTTP communication (`src/api/`)

### 2. API Layer (Routes)

**Location**: `backend/routes/`

**Responsibilities**:
- HTTP request routing
- Request validation
- Response formatting
- Error handling

**Key Routes**:
- `/api/auth` - Authentication endpoints
- `/api/courses` - Course management
- `/api/enrollments` - Enrollment operations
- `/api/quizzes` - Quiz management
- `/api/payments` - Payment processing
- `/api/certificates` - Certificate generation

### 3. Business Logic Layer (Services)

**Location**: `backend/services/`

**Responsibilities**:
- Core business logic
- Transaction management
- External API integration
- Email notifications
- File processing

**Key Services**:
- **AuthService**: User authentication and authorization
- **CourseService**: Course CRUD operations
- **EnrollmentService**: Enrollment management
- **PaymentService**: Payment processing
- **QuizService**: Quiz and grading logic
- **CertificateService**: Certificate generation
- **EmailService**: Email notifications
- **ProgressService**: Learning progress tracking

### 4. Data Access Layer (Repositories)

**Location**: `backend/repositories/`

**Responsibilities**:
- Database queries
- Data mapping
- Transaction handling
- Query optimization

**Key Repositories**:
- **UserRepository**: User data access
- **CourseRepository**: Course data access
- **EnrollmentRepository**: Enrollment data access
- **QuizRepository**: Quiz data access
- **PaymentRepository**: Payment data access

### 5. Data Layer (Database)

**Location**: MySQL Database

**Responsibilities**:
- Data persistence
- Data integrity
- Relational constraints
- Indexing

See [database-design.md](database-design.md) for detailed schema.

## Request Flow

### Example: User Enrolls in Course

```
1. User clicks "Enroll" button
   ↓
2. Frontend sends POST /api/enrollments
   ↓
3. Express receives request
   ↓
4. Auth middleware validates JWT
   ↓
5. Validation middleware checks request body
   ↓
6. EnrollmentController.create() called
   ↓
7. EnrollmentService.createEnrollment() executes
   ├─ Check course availability
   ├─ Verify payment (if required)
   ├─ Create enrollment record
   └─ Send confirmation email
   ↓
8. EnrollmentRepository.create() saves to DB
   ↓
9. MySQL stores enrollment
   ↓
10. Success response returned to client
   ↓
11. Frontend updates UI
```

## Development vs Production

### Development Mode

**Frontend**:
- Runs on Vite dev server (port 5173)
- Hot Module Replacement (HMR)
- Source maps enabled
- API calls proxied to backend

**Backend**:
- Runs on Express (port 3000)
- Auto-restart on file changes (`--watch`)
- Detailed error messages
- CORS enabled for localhost

**Configuration**:
```javascript
// vite.config.js
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
```

### Production Mode

**Frontend**:
- Built as static files (`dist/`)
- Minified and optimized
- Served by Express

**Backend**:
- Serves static files + API
- Production error handling
- CORS configured for domain
- Compression enabled

**Configuration**:
```javascript
// backend/app.js
if (config.env === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}
```

## Security Architecture

### Authentication Flow

```
1. User submits credentials
   ↓
2. Backend validates credentials
   ↓
3. Password verified with bcrypt
   ↓
4. JWT token generated
   ↓
5. Token sent to client
   ↓
6. Client stores token (localStorage)
   ↓
7. Subsequent requests include token
   ↓
8. Middleware validates token
   ↓
9. Request processed or rejected
```

### Security Measures

1. **Authentication**
   - JWT with secure secret
   - Token expiration (7 days)
   - Password hashing (bcrypt, 10 rounds)

2. **Authorization**
   - Role-based access control (RBAC)
   - Middleware checks permissions
   - Admin-only routes protected

3. **Data Protection**
   - SQL injection prevention (Drizzle ORM)
   - XSS protection (input sanitization)
   - CORS configuration
   - Helmet security headers

4. **API Security**
   - Rate limiting (planned)
   - Request validation (Zod)
   - Error message sanitization

## Performance Considerations

### Current Limitations

- **Single Server**: No horizontal scaling
- **No Caching**: All requests hit database
- **No CDN**: Static assets served from origin
- **Synchronous Processing**: No background jobs
- **Limited Concurrency**: ~100 concurrent users

### Optimization Strategies

1. **Database**
   - Indexed columns for common queries
   - Connection pooling
   - Query optimization

2. **Frontend**
   - Code splitting
   - Lazy loading
   - Image optimization
   - Bundle size optimization

3. **Backend**
   - Compression middleware
   - Response caching (planned)
   - Async operations where possible

## Deployment Architecture

### Current Deployment

```
Single Server
├── Node.js Process
│   ├── Express Server (port 3000)
│   └── Serves static files (production)
└── MySQL Database (port 3306)
```

### Limitations

- Single point of failure
- No load balancing
- Manual scaling
- Limited to vertical scaling
- No redundancy

### Future Improvements

See [microservices.md](microservices.md) for planned architecture improvements.

## Monitoring & Logging

### Current Approach

- Console logging
- Error stack traces
- Manual monitoring

### Planned Improvements

- Structured logging (Winston)
- Error tracking (Sentry)
- Performance monitoring (Prometheus)
- Uptime monitoring
- Log aggregation (ELK)

## Integration Points

### External Services

1. **Email Service**
   - Provider: SMTP (Nodemailer)
   - Use: Transactional emails
   - Configuration: Environment variables

2. **Payment Gateway**
   - Provider: Razorpay
   - Use: Course payments
   - Integration: REST API

3. **File Storage**
   - Current: Local filesystem
   - Planned: AWS S3 / MinIO

## Scalability Path

### Phase 1: Current (Monolith)
- Single server
- ~100 concurrent users
- Manual deployment

### Phase 2: Optimized Monolith
- Redis caching
- CDN for static assets
- Database optimization
- ~1,000 concurrent users

### Phase 3: Microservices
- Service decomposition
- Container orchestration
- Horizontal scaling
- ~10,000+ concurrent users

See [microservices.md](microservices.md) for detailed migration plan.

## Advantages of Current Architecture

✅ **Simple to Understand**: Single codebase, clear structure  
✅ **Easy to Deploy**: Single deployment unit  
✅ **Fast Development**: No service coordination needed  
✅ **Easy Debugging**: All code in one place  
✅ **Low Complexity**: Fewer moving parts  

## Disadvantages

❌ **Limited Scalability**: Vertical scaling only  
❌ **Single Point of Failure**: No redundancy  
❌ **Tight Coupling**: Changes affect entire system  
❌ **Technology Lock-in**: Same stack for all features  
❌ **Deployment Risk**: All-or-nothing deployments  

---

**Last Updated**: 2026-01-12  
**Next**: [Microservices Architecture](microservices.md)
