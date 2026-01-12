# Docker Deployment Guide

This guide covers containerizing and deploying the JNTU GV LMS using Docker.

## Prerequisites

- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)
- Basic understanding of Docker concepts

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Access the application at: http://localhost:3000

## Docker Configuration

### Dockerfile (Backend + Frontend)

```dockerfile
# Multi-stage build for optimization
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend code
COPY backend ./backend

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "backend/server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  # Application
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=lms_user
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=jntugv_certification
      - JWT_SECRET=${JWT_SECRET}
      - RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
      - RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}
    depends_on:
      mysql:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - lms-network

  # MySQL Database
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: jntugv_certification
      MYSQL_USER: lms_user
      MYSQL_PASSWORD: ${DB_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - lms-network

  # Redis (Optional - for caching)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    restart: unless-stopped
    networks:
      - lms-network

volumes:
  mysql-data:
  redis-data:

networks:
  lms-network:
    driver: bridge
```

### .dockerignore

```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
README.md
.vscode
.idea
*.md
tests
coverage
dist
.DS_Store
```

## Environment Variables

Create a `.env` file for Docker Compose:

```env
# Database
MYSQL_ROOT_PASSWORD=secure_root_password
DB_PASSWORD=secure_db_password

# Application
JWT_SECRET=your_jwt_secret_here
NODE_ENV=production

# Payment Gateway
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

## Docker Commands

### Building

```bash
# Build the application image
docker build -t jntugv-lms:latest .

# Build with no cache
docker build --no-cache -t jntugv-lms:latest .

# Build specific service with docker-compose
docker-compose build app
```

### Running

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d app

# View logs
docker-compose logs -f app

# Follow logs for all services
docker-compose logs -f
```

### Managing

```bash
# List running containers
docker-compose ps

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart a service
docker-compose restart app

# Execute command in container
docker-compose exec app sh

# View container stats
docker stats
```

### Debugging

```bash
# Access container shell
docker-compose exec app sh

# View application logs
docker-compose logs app

# Inspect container
docker inspect <container-id>

# View container processes
docker-compose top app
```

## Production Deployment

### 1. Build Production Image

```bash
# Build optimized image
docker build -t jntugv-lms:v1.0.0 .

# Tag for registry
docker tag jntugv-lms:v1.0.0 your-registry/jntugv-lms:v1.0.0

# Push to registry
docker push your-registry/jntugv-lms:v1.0.0
```

### 2. Deploy to Server

```bash
# Pull image on server
docker pull your-registry/jntugv-lms:v1.0.0

# Run with docker-compose
docker-compose up -d
```

### 3. Database Initialization

```bash
# Run database migrations
docker-compose exec app npm run init:db

# Create admin user
docker-compose exec app npm run create:admin
```

## Health Checks

### Application Health Check

```bash
# Check application health
curl http://localhost:3000/api/health

# Expected response
{
  "status": "ok",
  "message": "Server is running successfully 🚀",
  "timestamp": "2026-01-12T08:00:00.000Z"
}
```

### Container Health Status

```bash
# View health status
docker-compose ps

# Inspect health check
docker inspect --format='{{json .State.Health}}' <container-id>
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Common issues:
# - Database not ready
# - Missing environment variables
# - Port already in use
```

### Database Connection Error

```bash
# Verify database is running
docker-compose ps mysql

# Check database logs
docker-compose logs mysql

# Test connection
docker-compose exec app sh
# Inside container:
nc -zv mysql 3306
```

### Port Conflicts

```bash
# Find process using port
# Windows
netstat -ano | findstr :3000

# Change port in docker-compose.yml
ports:
  - "3001:3000"
```

### Out of Disk Space

```bash
# Check disk usage
docker system df

# Clean up
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

## Performance Optimization

### 1. Multi-Stage Builds

Use multi-stage builds to reduce image size:
- Build stage: Compile and build
- Production stage: Only runtime dependencies

### 2. Layer Caching

Optimize Dockerfile layer order:
```dockerfile
# Copy package files first (changes less frequently)
COPY package*.json ./
RUN npm ci

# Copy source code last (changes frequently)
COPY . .
```

### 3. Resource Limits

Set resource limits in docker-compose.yml:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Monitoring

### Container Metrics

```bash
# View real-time stats
docker stats

# View specific container
docker stats <container-id>
```

### Logs

```bash
# View logs
docker-compose logs -f

# View last 100 lines
docker-compose logs --tail=100 app

# View logs since timestamp
docker-compose logs --since 2026-01-12T08:00:00 app
```

## Backup & Recovery

### Database Backup

```bash
# Backup database
docker-compose exec mysql mysqldump -u root -p jntugv_certification > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u root -p jntugv_certification < backup.sql
```

### Volume Backup

```bash
# Backup volume
docker run --rm -v mysql-data:/data -v $(pwd):/backup alpine tar czf /backup/mysql-backup.tar.gz /data

# Restore volume
docker run --rm -v mysql-data:/data -v $(pwd):/backup alpine tar xzf /backup/mysql-backup.tar.gz -C /
```

## Security Best Practices

1. **Don't run as root**
   ```dockerfile
   USER nodejs
   ```

2. **Use secrets for sensitive data**
   ```yaml
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

3. **Scan images for vulnerabilities**
   ```bash
   docker scan jntugv-lms:latest
   ```

4. **Keep base images updated**
   ```bash
   docker pull node:20-alpine
   ```

5. **Use .dockerignore**
   - Exclude sensitive files
   - Reduce image size

## Next Steps

- [Kubernetes Deployment](kubernetes.md) - For production scale
- [Migration Guide](migration-guide.md) - Migrate to microservices
- [Monitoring Setup](../guides/monitoring.md) - Set up monitoring

---

**Last Updated**: 2026-01-12  
**Next**: [Kubernetes Deployment](kubernetes.md)
