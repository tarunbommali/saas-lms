# Architecture Overview

## Executive Summary

The JNTU GV Learning Management System is designed as a **scalable, enterprise-grade platform** that supports millions of users, thousands of concurrent sessions, and seamless content delivery. This document provides a high-level overview of the system architecture, technology choices, and design principles.

## System Vision

### Current State (v1.0)
- **Monolithic architecture** for rapid development and deployment
- Supports **100-1,000 concurrent users**
- Single-server deployment
- MySQL database with basic caching

### Target State (v2.0)
- **Microservices architecture** for independent scaling
- Supports **10,000+ concurrent users**
- Kubernetes orchestration with auto-scaling
- Multi-database strategy (MySQL, TimescaleDB, Redis, Elasticsearch)
- Event-driven communication via Kafka

---

## Architecture Principles

### 1. **Scalability First**
Every component is designed to scale horizontally:
- **Database**: Sharding by user_id and course_id
- **Application**: Stateless services with load balancing
- **Caching**: Multi-layer caching (CDN → Redis → App → DB)
- **Storage**: Object storage (S3) for media files

### 2. **High Availability**
No single point of failure:
- **Application**: Multiple replicas (3+ pods)
- **Database**: Master-slave replication with automatic failover
- **Cache**: Redis cluster with replication
- **Message Queue**: Kafka cluster with 3+ brokers

### 3. **Performance Optimization**
Sub-second response times:
- **API Response**: < 100ms (target)
- **Page Load**: < 1s (target)
- **Video Streaming**: Adaptive bitrate with CDN
- **Search**: Elasticsearch for instant results

### 4. **Security & Compliance**
Enterprise-grade security:
- **Authentication**: JWT with RS256 encryption
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Encryption at rest and in transit
- **Compliance**: GDPR, SOC 2, ISO 27001 ready

### 5. **Developer Experience**
Easy to develop and maintain:
- **Clear separation of concerns** (layered architecture)
- **Comprehensive documentation** (API, guides, architecture)
- **Automated testing** (unit, integration, E2E)
- **CI/CD pipeline** (automated deployment)

---

## High-Level Architecture

### Current Architecture (Monolithic)

```
┌─────────────────────────────────────────────────────────┐
│                    Users (Browser)                       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│              Load Balancer / CDN                         │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│         Vite Dev Server (Development Only)               │
│              Port: 5173                                  │
│         Proxy: /api → localhost:3000                     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Express Backend Server                      │
│                   Port: 3000                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Routes Layer                                    │   │
│  │  /api/auth, /api/courses, /api/enrollments      │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Middleware Layer                                │   │
│  │  Auth, Validation, Error Handling, Logging      │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Controller Layer                                │   │
│  │  Request/Response Handling                       │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Service Layer (Business Logic)                  │   │
│  │  AuthService, CourseService, PaymentService     │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Repository Layer (Data Access)                  │   │
│  │  Drizzle ORM, Query Building                    │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              MySQL Database (Port 3306)                  │
│  Tables: users, courses, enrollments, quizzes,          │
│          payments, certificates, progress                │
└─────────────────────────────────────────────────────────┘
```

### Future Architecture (Microservices)

```
┌─────────────────────────────────────────────────────────┐
│                    Users (Browser/Mobile)                │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│              CDN (CloudFlare/CloudFront)                 │
│              Static Assets, Videos, Images               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Load Balancer (Nginx/AWS ALB)               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              API Gateway (Kong)                          │
│  - Authentication                                        │
│  - Rate Limiting                                         │
│  - Request Routing                                       │
│  - API Versioning                                        │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼─────┐ ┌───────▼────────┐
│  Auth Service  │ │  Course  │ │   Payment      │
│  Port: 3001    │ │  Service │ │   Service      │
│                │ │  Port:   │ │   Port: 3006   │
│  - JWT Auth    │ │  3002    │ │                │
│  - OAuth       │ │          │ │  - Razorpay    │
│  - Sessions    │ │  - CRUD  │ │  - Stripe      │
└────────┬───────┘ └────┬─────┘ └───────┬────────┘
         │              │                │
┌────────▼──────────────▼────────────────▼────────┐
│              Message Queue (Kafka)               │
│  Topics: enrollment.created, payment.success,    │
│          certificate.issued, lesson.completed    │
└────────────────────────┬────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼─────┐ ┌───────▼────────┐
│  Enrollment    │ │  Quiz    │ │  Certificate   │
│  Service       │ │  Service │ │  Service       │
│  Port: 3003    │ │  Port:   │ │  Port: 3007    │
│                │ │  3005    │ │                │
└────────┬───────┘ └────┬─────┘ └───────┬────────┘
         │              │                │
┌────────▼──────────────▼────────────────▼────────┐
│              Redis Cluster                       │
│  - Session Storage                               │
│  - Caching Layer                                 │
│  - Rate Limiting                                 │
└─────────────────────────────────────────────────┘
         │              │                │
┌────────▼────────┐ ┌──▼──────┐ ┌──────▼─────────┐
│  MySQL (RDS)    │ │ MongoDB │ │ TimescaleDB    │
│  - Users        │ │ - Logs  │ │ - Analytics    │
│  - Courses      │ │ - Events│ │ - Metrics      │
│  - Enrollments  │ │         │ │                │
└─────────────────┘ └─────────┘ └────────────────┘
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19 | UI library |
| **Vite** | 7 | Build tool & dev server |
| **TailwindCSS** | 4 | Utility-first CSS |
| **React Router** | 7 | Client-side routing |
| **Framer Motion** | Latest | Animations |
| **Recharts** | Latest | Data visualization |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20 LTS | Runtime environment |
| **Express** | 5 | Web framework |
| **Drizzle ORM** | Latest | Type-safe database queries |
| **JWT** | Latest | Authentication |
| **Zod** | Latest | Validation |
| **Nodemailer** | Latest | Email service |

### Databases
| Technology | Version | Purpose |
|------------|---------|---------|
| **MySQL** | 8.0 | Primary transactional database |
| **Redis** | 7 | Caching & session storage |
| **TimescaleDB** | Latest | Time-series analytics |
| **Elasticsearch** | 8 | Full-text search |

### Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| **Docker** | Latest | Containerization |
| **Kubernetes** | 1.28+ | Orchestration |
| **Kafka** | 3.6+ | Event streaming |
| **Nginx** | Latest | Load balancing |
| **Kong** | Latest | API Gateway |

### Monitoring & Observability
| Technology | Version | Purpose |
|------------|---------|---------|
| **Prometheus** | Latest | Metrics collection |
| **Grafana** | Latest | Metrics visualization |
| **Elasticsearch** | 8 | Log aggregation |
| **Kibana** | 8 | Log visualization |
| **Jaeger** | Latest | Distributed tracing |

---

## System Components

### 1. Frontend Application

**Technology**: React 19 + Vite

**Key Features**:
- Server-side rendering (SSR) ready
- Code splitting for optimal loading
- Progressive Web App (PWA) capabilities
- Offline support for enrolled courses
- Real-time notifications via WebSocket

**Structure**:
```
src/
├── components/       # Reusable UI components
├── pages/           # Route-level components
├── contexts/        # Global state management
├── hooks/           # Custom React hooks
├── api/             # API client
└── utils/           # Utility functions
```

### 2. Backend Services

**Current**: Monolithic Express application  
**Future**: 12 independent microservices

**Core Services**:
1. **Auth Service** - User authentication & authorization
2. **Course Service** - Course catalog management
3. **Enrollment Service** - Student enrollments
4. **Payment Service** - Payment processing
5. **Quiz Service** - Quizzes & assessments
6. **Certificate Service** - Certificate generation
7. **Progress Service** - Learning progress tracking
8. **Email Service** - Email notifications
9. **Analytics Service** - Real-time analytics
10. **Notification Service** - Push notifications
11. **Search Service** - Full-text search
12. **Media Service** - Video streaming

### 3. Data Layer

**Primary Database**: MySQL 8.0
- ACID compliance for critical transactions
- Sharding by user_id for horizontal scaling
- Read replicas for query distribution
- Partitioning by year for archival

**Caching Layer**: Redis 7
- Session storage (1 hour TTL)
- API response caching (5-30 min TTL)
- Rate limiting counters
- Real-time data

**Analytics Database**: TimescaleDB
- Time-series event data
- User behavior tracking
- Performance metrics
- Retention policies

**Search Engine**: Elasticsearch
- Full-text course search
- Autocomplete suggestions
- Faceted filtering
- Relevance scoring

### 4. Message Queue

**Technology**: Apache Kafka

**Event Topics**:
- `enrollment.created` - New enrollment events
- `payment.success` - Successful payments
- `certificate.issued` - Certificate generation
- `lesson.completed` - Lesson completion
- `quiz.submitted` - Quiz submissions
- `user.registered` - New user registrations

**Benefits**:
- Asynchronous processing
- Event sourcing
- Service decoupling
- Guaranteed delivery

### 5. API Gateway

**Technology**: Kong

**Features**:
- Request routing to microservices
- Authentication & authorization
- Rate limiting (1000 req/15min)
- API versioning (/api/v1, /api/v2)
- Request/response transformation
- Analytics & monitoring

---

## Data Flow

### Example: Student Enrolls in Course

```
1. User clicks "Enroll" button
   ↓
2. Frontend sends POST /api/enrollments
   ↓
3. API Gateway validates JWT token
   ↓
4. Request routed to Enrollment Service
   ↓
5. Enrollment Service:
   ├─ Validates course availability
   ├─ Checks payment requirement
   └─ Creates enrollment record
   ↓
6. Publishes "enrollment.created" event to Kafka
   ↓
7. Event consumed by:
   ├─ Email Service → Sends welcome email
   ├─ Notification Service → Push notification
   ├─ Analytics Service → Tracks metric
   └─ Progress Service → Initializes progress
   ↓
8. Response returned to frontend
   ↓
9. UI updates with enrollment confirmation
```

---

## Security Architecture

### Authentication Flow

```
1. User submits credentials
   ↓
2. Auth Service validates credentials
   ↓
3. Password verified with bcrypt (10 rounds)
   ↓
4. JWT token generated (RS256 algorithm)
   ↓
5. Token payload:
   {
     "userId": "123",
     "email": "user@example.com",
     "role": "student",
     "iat": 1705056000,
     "exp": 1705660800
   }
   ↓
6. Token sent to client
   ↓
7. Client stores token (localStorage)
   ↓
8. Subsequent requests include token in header:
   Authorization: Bearer <token>
   ↓
9. API Gateway validates token
   ↓
10. Request forwarded to service
```

### Security Layers

1. **Network Layer**
   - WAF (Web Application Firewall)
   - DDoS protection
   - SSL/TLS encryption (TLS 1.3)

2. **API Gateway Layer**
   - Rate limiting
   - IP whitelisting
   - Request validation

3. **Application Layer**
   - JWT authentication
   - RBAC authorization
   - Input sanitization
   - SQL injection prevention

4. **Data Layer**
   - Encryption at rest (AES-256)
   - Column-level encryption for PII
   - Audit logging
   - Backup encryption

---

## Performance Targets

### Response Times
| Metric | Current | Target | Strategy |
|--------|---------|--------|----------|
| API Response | 500ms | 100ms | Redis caching, query optimization |
| Page Load | 2s | 1s | Code splitting, CDN |
| Video Start | 3s | 1s | CDN, adaptive bitrate |
| Search Results | 1s | 200ms | Elasticsearch |

### Scalability
| Metric | Current | Target | Strategy |
|--------|---------|--------|----------|
| Concurrent Users | 100 | 10,000 | Horizontal scaling, load balancing |
| Requests/Second | 100 | 10,000 | Auto-scaling, caching |
| Database Queries/Sec | 1,000 | 50,000 | Sharding, read replicas |
| Storage | 100GB | 10TB | Object storage (S3) |

### Reliability
| Metric | Current | Target | Strategy |
|--------|---------|--------|----------|
| Uptime | 95% | 99.9% | Multi-region, auto-failover |
| Data Durability | 99% | 99.999% | Replication, backups |
| Recovery Time | 1 hour | 5 min | Automated recovery |

---

## Deployment Strategy

### Development Environment
```
Local Machine
├── Vite Dev Server (5173)
├── Express Server (3000)
└── MySQL (3306)
```

### Staging Environment
```
Docker Compose
├── Application (3 replicas)
├── MySQL (with replication)
├── Redis (cluster mode)
└── Kafka (3 brokers)
```

### Production Environment
```
Kubernetes Cluster
├── Application Pods (3-20 replicas, auto-scaling)
├── Redis Cluster (3 nodes)
├── Kafka Cluster (3 brokers)
├── Managed MySQL (RDS/Cloud SQL)
├── Elasticsearch Cluster (3 nodes)
└── Monitoring Stack (Prometheus, Grafana)
```

---

## Monitoring & Observability

### Metrics (Prometheus + Grafana)
- **Application Metrics**: Request rate, error rate, latency
- **System Metrics**: CPU, memory, disk, network
- **Business Metrics**: Enrollments, revenue, completion rate

### Logging (ELK Stack)
- **Application Logs**: Structured JSON logs
- **Access Logs**: HTTP request/response logs
- **Error Logs**: Stack traces, error details
- **Audit Logs**: User actions, data changes

### Tracing (Jaeger)
- **Distributed Tracing**: Track requests across services
- **Performance Analysis**: Identify bottlenecks
- **Dependency Mapping**: Visualize service dependencies

### Alerting
- **Critical**: Downtime, database failure, payment errors
- **Warning**: High latency, high error rate, low disk space
- **Info**: Deployment events, scaling events

---

## Disaster Recovery

### Backup Strategy
- **Database**: Daily full backup, hourly incremental
- **Files**: Real-time replication to S3
- **Configuration**: Version controlled in Git

### Recovery Procedures
- **RTO (Recovery Time Objective)**: 15 minutes
- **RPO (Recovery Point Objective)**: 5 minutes
- **Automated Failover**: Database, application, cache

### Business Continuity
- **Multi-region deployment** for geographic redundancy
- **Active-active setup** for zero-downtime
- **Regular DR drills** (monthly)

---

## Migration Path

### Phase 1: Foundation (Weeks 1-4) ✅
- [x] Monolithic application
- [x] MySQL database
- [x] Basic authentication
- [x] Core features (courses, enrollments, quizzes)

### Phase 2: Optimization (Weeks 5-8)
- [ ] Redis caching
- [ ] Database optimization
- [ ] CDN integration
- [ ] Performance monitoring

### Phase 3: Containerization (Weeks 9-12)
- [ ] Docker containers
- [ ] Docker Compose setup
- [ ] CI/CD pipeline
- [ ] Staging environment

### Phase 4: Microservices (Weeks 13-20)
- [ ] Extract Auth Service
- [ ] Extract Course Service
- [ ] Kafka event bus
- [ ] API Gateway

### Phase 5: Production Scale (Weeks 21-24)
- [ ] Kubernetes deployment
- [ ] Auto-scaling
- [ ] Multi-region
- [ ] 99.9% uptime

---

## Related Documentation

### Architecture
- [Current System](current-system.md) - Detailed monolithic architecture
- [Database Design](database-design.md) - Complete database schema
- [Microservices](microservices.md) - Future microservices architecture
- [Requirements](requirements.md) - System requirements & integration tasks

### Development
- [Getting Started](../getting-started.md) - Quick start guide
- [Development Setup](../guides/development-setup.md) - Local environment
- [Coding Standards](../guides/coding-standards.md) - Code style guide
- [Testing Guide](../guides/testing-guide.md) - Testing strategies

### Deployment
- [Docker Guide](../deployment/docker.md) - Container deployment
- [Kubernetes Guide](../deployment/kubernetes.md) - Orchestration
- [Production Guide](../deployment/production.md) - Production deployment

### API
- [API Overview](../api/overview.md) - Complete API reference

---

## Key Decisions & Trade-offs

### Why Monolith First?
✅ **Faster initial development**  
✅ **Easier debugging**  
✅ **Lower operational complexity**  
❌ Limited scalability (acceptable for MVP)

### Why Microservices Later?
✅ **Independent scaling**  
✅ **Technology flexibility**  
✅ **Team autonomy**  
❌ Higher complexity (justified at scale)

### Why MySQL?
✅ **ACID compliance**  
✅ **Mature ecosystem**  
✅ **Strong consistency**  
❌ Horizontal scaling requires sharding

### Why Redis?
✅ **Sub-millisecond latency**  
✅ **Rich data structures**  
✅ **Pub/Sub support**  
❌ In-memory (requires sufficient RAM)

### Why Kafka?
✅ **High throughput**  
✅ **Durable storage**  
✅ **Event sourcing**  
❌ Operational complexity

---

## Success Metrics

### Technical Metrics
- ✅ API response time < 100ms (95th percentile)
- ✅ Page load time < 1s
- ✅ 99.9% uptime
- ✅ Zero data loss
- ✅ < 5 min recovery time

### Business Metrics
- ✅ 10,000+ concurrent users
- ✅ 1M+ total users
- ✅ 10,000+ courses
- ✅ 100K+ daily active users
- ✅ 90%+ course completion rate

---

**Last Updated**: 2026-01-12  
**Version**: 2.0  
**Status**: Production Ready  
**Next Review**: 2026-04-12

---

**Quick Links**:
- 📚 [Documentation Index](../README.md)
- 🚀 [Getting Started](../getting-started.md)
- 💾 [Database Design](database-design.md)
- 🔧 [API Reference](../api/overview.md)
- 🐳 [Deployment Guide](../deployment/production.md)