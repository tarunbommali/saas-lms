# Docker Quick Reference

## Essential Commands

### Building Images
```bash
# Build single service
docker build -t lms/auth-service:latest ./services/auth-service

# Build all services
docker-compose build

# Build without cache
docker-compose build --no-cache
```

### Running Containers
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d auth-service

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f auth-service
```

### Managing Containers
```bash
# List running containers
docker-compose ps

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart service
docker-compose restart auth-service
```

### Debugging
```bash
# Execute command in container
docker-compose exec auth-service sh

# View container stats
docker stats

# Inspect container
docker inspect <container-id>
```

### Cleanup
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything
docker system prune -a --volumes
```

## Docker Compose Examples

### Basic Service
```yaml
services:
  auth-service:
    build: ./services/auth-service
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DB_HOST=mysql
    depends_on:
      - mysql
      - redis
```

### With Health Check
```yaml
services:
  auth-service:
    build: ./services/auth-service
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### With Volume Mounts
```yaml
services:
  auth-service:
    build: ./services/auth-service
    volumes:
      - ./services/auth-service:/app
      - /app/node_modules
```

## Kubernetes Quick Reference

### Basic Commands
```bash
# Apply configuration
kubectl apply -f k8s/

# Get resources
kubectl get pods
kubectl get services
kubectl get deployments

# Describe resource
kubectl describe pod <pod-name>

# View logs
kubectl logs <pod-name>
kubectl logs -f <pod-name>

# Execute command
kubectl exec -it <pod-name> -- sh
```

### Scaling
```bash
# Scale deployment
kubectl scale deployment auth-service --replicas=5

# Auto-scale
kubectl autoscale deployment auth-service --min=3 --max=10 --cpu-percent=70
```

### Updates
```bash
# Update image
kubectl set image deployment/auth-service auth-service=lms/auth-service:v2

# Rollout status
kubectl rollout status deployment/auth-service

# Rollback
kubectl rollout undo deployment/auth-service
```

## Common Issues & Solutions

### Issue: Container keeps restarting
```bash
# Check logs
docker-compose logs auth-service

# Common causes:
# - Database not ready
# - Missing environment variables
# - Port already in use
```

### Issue: Cannot connect to database
```bash
# Verify network
docker network ls
docker network inspect saas-lms_default

# Check database is running
docker-compose ps mysql

# Test connection
docker-compose exec auth-service ping mysql
```

### Issue: Out of disk space
```bash
# Check disk usage
docker system df

# Clean up
docker system prune -a --volumes
```

## Production Best Practices

1. **Use multi-stage builds** to reduce image size
2. **Don't run as root** - create non-root user
3. **Use .dockerignore** to exclude unnecessary files
4. **Pin versions** - don't use `latest` tag
5. **Health checks** - always implement health endpoints
6. **Resource limits** - set memory and CPU limits
7. **Secrets** - use Docker secrets or Kubernetes secrets
8. **Logging** - log to stdout/stderr
9. **Monitoring** - expose metrics endpoint
10. **Security scanning** - scan images for vulnerabilities

## Example .dockerignore
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
```

## Useful Docker Compose Snippets

### MySQL with Persistence
```yaml
mysql:
  image: mysql:8.0
  environment:
    MYSQL_ROOT_PASSWORD: root
    MYSQL_DATABASE: lms_db
  volumes:
    - mysql-data:/var/lib/mysql
  ports:
    - "3306:3306"

volumes:
  mysql-data:
```

### Redis Cache
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis-data:/data
  command: redis-server --appendonly yes

volumes:
  redis-data:
```

### RabbitMQ
```yaml
rabbitmq:
  image: rabbitmq:3-management
  ports:
    - "5672:5672"
    - "15672:15672"
  environment:
    RABBITMQ_DEFAULT_USER: admin
    RABBITMQ_DEFAULT_PASS: admin
```

## Performance Tips

1. **Layer caching**: Order Dockerfile commands from least to most frequently changing
2. **Multi-stage builds**: Separate build and runtime dependencies
3. **Alpine images**: Use Alpine Linux for smaller images
4. **BuildKit**: Enable Docker BuildKit for faster builds
5. **Compose v2**: Use Docker Compose v2 for better performance

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Use Compose v2
docker compose up -d
```
