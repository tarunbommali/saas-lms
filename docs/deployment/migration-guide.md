# Microservices Migration Guide

## Quick Start

This guide helps you migrate from the current monolithic architecture to microservices.

## Step-by-Step Migration

### 1. Set Up Docker Environment

```bash
# Install Docker Desktop (Windows)
# Download from: https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
docker-compose --version
```

### 2. Create Service Structure

```bash
# Create microservices directory structure
mkdir -p services/{auth-service,course-service,payment-service,email-service}
mkdir -p k8s/{auth-service,course-service,payment-service}
mkdir -p shared/{utils,middleware,types}
```

### 3. Extract Auth Service (First Service)

```bash
# Copy relevant files
cp -r backend/services/auth.service.js services/auth-service/
cp -r backend/controllers/auth.controller.js services/auth-service/
cp -r backend/routes/auth.js services/auth-service/
cp -r backend/middleware/auth.js services/auth-service/
```

### 4. Create Service Package

```json
// services/auth-service/package.json
{
  "name": "auth-service",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^5.1.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^3.0.3",
    "mysql2": "^3.11.3",
    "ioredis": "^5.3.2",
    "dotenv": "^16.6.1"
  }
}
```

### 5. Create Dockerfile

```dockerfile
# services/auth-service/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
```

### 6. Test Locally with Docker Compose

```bash
# Start services
docker-compose up -d

# Check logs
docker-compose logs -f auth-service

# Test endpoint
curl http://localhost:3001/health
```

### 7. Repeat for Other Services

Follow the same pattern for:
- Course Service (Port 3002)
- Payment Service (Port 3006)
- Email Service (Port 3008)
- Progress Service (Port 3004)

## Testing Strategy

### Unit Tests
```javascript
// services/auth-service/tests/auth.test.js
const request = require('supertest');
const app = require('../app');

describe('Auth Service', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    expect(res.statusCode).toBe(201);
  });
});
```

### Integration Tests
```bash
# Run all service tests
npm run test:integration
```

## Deployment Checklist

- [ ] All services containerized
- [ ] Docker Compose working locally
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Health checks implemented
- [ ] Logging configured
- [ ] Metrics exposed
- [ ] Documentation updated

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs service-name

# Rebuild container
docker-compose build --no-cache service-name
```

### Database Connection Issues
```bash
# Verify database is running
docker-compose ps

# Check network
docker network inspect saas-lms_default
```

### Port Conflicts
```bash
# Find process using port
netstat -ano | findstr :3001

# Kill process
taskkill /PID <pid> /F
```

## Next Steps

1. Complete service extraction
2. Set up Kubernetes cluster
3. Deploy to staging environment
4. Performance testing
5. Production deployment

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Microservices Patterns](https://microservices.io/patterns/)
