# Production Deployment Guide

## Overview

This guide covers deploying the JNTU GV LMS to production with high availability, scalability, and reliability using Docker, Kubernetes, Redis, and Kafka.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (Nginx/AWS ALB)             │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Kubernetes Cluster                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Application Pods (3+ replicas)                      │   │
│  │  - Express Backend + React Frontend                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Redis Cluster (Caching + Sessions)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Kafka Cluster (Event Streaming)                     │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              MySQL Database (RDS/Managed)                    │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Infrastructure
- **Kubernetes Cluster**: EKS, GKE, or AKS
- **Container Registry**: Docker Hub, ECR, or GCR
- **Database**: Managed MySQL (RDS, Cloud SQL)
- **Object Storage**: S3, GCS, or Azure Blob
- **Domain**: Registered domain with DNS access

### Tools
- `kubectl` - Kubernetes CLI
- `helm` - Kubernetes package manager
- `docker` - Container runtime
- `terraform` (optional) - Infrastructure as Code

## Step 1: Build Production Images

### 1.1 Optimize Dockerfile

```dockerfile
# Multi-stage production build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/package.json ./

# Security: Create non-root user
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

### 1.2 Build and Push Image

```bash
# Build image
docker build -t jntugv-lms:v1.0.0 .

# Tag for registry
docker tag jntugv-lms:v1.0.0 your-registry/jntugv-lms:v1.0.0
docker tag jntugv-lms:v1.0.0 your-registry/jntugv-lms:latest

# Push to registry
docker push your-registry/jntugv-lms:v1.0.0
docker push your-registry/jntugv-lms:latest
```

## Step 2: Set Up Kubernetes Cluster

### 2.1 Create Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: lms-production
  labels:
    name: lms-production
    environment: production
```

Apply:
```bash
kubectl apply -f k8s/namespace.yaml
```

### 2.2 Create Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: lms-secrets
  namespace: lms-production
type: Opaque
stringData:
  DB_HOST: "mysql.example.com"
  DB_USER: "lms_user"
  DB_PASSWORD: "secure_password"
  DB_NAME: "jntugv_lms"
  JWT_SECRET: "your_jwt_secret"
  RAZORPAY_KEY_ID: "your_key_id"
  RAZORPAY_KEY_SECRET: "your_key_secret"
  REDIS_URL: "redis://redis-cluster:6379"
  KAFKA_BROKERS: "kafka-0:9092,kafka-1:9092,kafka-2:9092"
```

Apply:
```bash
kubectl apply -f k8s/secrets.yaml
```

## Step 3: Deploy Redis Cluster

### 3.1 Redis StatefulSet

```yaml
# k8s/redis/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: lms-production
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
          name: redis
        command:
        - redis-server
        - --appendonly yes
        - --cluster-enabled yes
        - --cluster-config-file /data/nodes.conf
        - --cluster-node-timeout 5000
        volumeMounts:
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: lms-production
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
  - port: 6379
    name: redis
```

### 3.2 Initialize Redis Cluster

```bash
# Apply Redis resources
kubectl apply -f k8s/redis/

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=redis -n lms-production --timeout=300s

# Create cluster
kubectl exec -it redis-0 -n lms-production -- redis-cli --cluster create \
  $(kubectl get pods -l app=redis -n lms-production -o jsonpath='{range.items[*]}{.status.podIP}:6379 ') \
  --cluster-replicas 1
```

## Step 4: Deploy Kafka Cluster

### 4.1 Install Kafka using Helm

```bash
# Add Bitnami repo
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install Kafka
helm install kafka bitnami/kafka \
  --namespace lms-production \
  --set replicaCount=3 \
  --set persistence.size=20Gi \
  --set zookeeper.persistence.size=10Gi \
  --set metrics.kafka.enabled=true \
  --set metrics.jmx.enabled=true
```

### 4.2 Create Kafka Topics

```bash
# Create topics for events
kubectl exec -it kafka-0 -n lms-production -- kafka-topics.sh \
  --create \
  --bootstrap-server localhost:9092 \
  --topic enrollment-events \
  --partitions 3 \
  --replication-factor 2

kubectl exec -it kafka-0 -n lms-production -- kafka-topics.sh \
  --create \
  --bootstrap-server localhost:9092 \
  --topic payment-events \
  --partitions 3 \
  --replication-factor 2

kubectl exec -it kafka-0 -n lms-production -- kafka-topics.sh \
  --create \
  --bootstrap-server localhost:9092 \
  --topic progress-events \
  --partitions 3 \
  --replication-factor 2
```

## Step 5: Deploy Application

### 5.1 Application Deployment

```yaml
# k8s/app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lms-app
  namespace: lms-production
  labels:
    app: lms-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lms-app
  template:
    metadata:
      labels:
        app: lms-app
        version: v1
    spec:
      containers:
      - name: lms-app
        image: your-registry/jntugv-lms:v1.0.0
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        envFrom:
        - secretRef:
            name: lms-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: lms-app
  namespace: lms-production
spec:
  selector:
    app: lms-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### 5.2 Horizontal Pod Autoscaler

```yaml
# k8s/app/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: lms-app-hpa
  namespace: lms-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: lms-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 4
        periodSeconds: 30
```

## Step 6: Configure Ingress

### 6.1 Install Nginx Ingress Controller

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace lms-production \
  --set controller.replicaCount=2 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux \
  --set defaultBackend.nodeSelector."kubernetes\.io/os"=linux
```

### 6.2 Create Ingress Resource

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lms-ingress
  namespace: lms-production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  tls:
  - hosts:
    - lms.jntugv.edu.in
    - api.jntugv.edu.in
    secretName: lms-tls-secret
  rules:
  - host: lms.jntugv.edu.in
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lms-app
            port:
              number: 80
  - host: api.jntugv.edu.in
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lms-app
            port:
              number: 80
```

## Step 7: SSL/TLS Certificates

### 7.1 Install cert-manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### 7.2 Create ClusterIssuer

```yaml
# k8s/cert-manager/cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@jntugv.edu.in
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

## Step 8: Monitoring & Logging

### 8.1 Install Prometheus & Grafana

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace lms-production \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi
```

### 8.2 Application Metrics

```javascript
// backend/utils/metrics.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeEnrollments = new prometheus.Gauge({
  name: 'active_enrollments_total',
  help: 'Number of active enrollments'
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

module.exports = {
  httpRequestDuration,
  httpRequestTotal,
  activeEnrollments
};
```

### 8.3 Install ELK Stack for Logging

```bash
helm repo add elastic https://helm.elastic.co
helm repo update

# Install Elasticsearch
helm install elasticsearch elastic/elasticsearch \
  --namespace lms-production \
  --set replicas=3 \
  --set volumeClaimTemplate.resources.requests.storage=30Gi

# Install Kibana
helm install kibana elastic/kibana \
  --namespace lms-production

# Install Filebeat
helm install filebeat elastic/filebeat \
  --namespace lms-production
```

## Step 9: Database Setup

### 9.1 Use Managed Database (Recommended)

**AWS RDS**:
```bash
aws rds create-db-instance \
  --db-instance-identifier jntugv-lms-prod \
  --db-instance-class db.t3.medium \
  --engine mysql \
  --engine-version 8.0 \
  --master-username admin \
  --master-user-password SecurePassword123! \
  --allocated-storage 100 \
  --storage-type gp3 \
  --backup-retention-period 7 \
  --multi-az \
  --publicly-accessible false
```

### 9.2 Initialize Database

```bash
# Run migrations
kubectl run -it --rm db-migrate \
  --image=your-registry/jntugv-lms:v1.0.0 \
  --namespace=lms-production \
  --restart=Never \
  --env="DB_HOST=mysql.example.com" \
  --env="DB_USER=admin" \
  --env="DB_PASSWORD=SecurePassword123!" \
  --env="DB_NAME=jntugv_lms" \
  -- npm run init:db
```

## Step 10: Backup Strategy

### 10.1 Database Backups

```yaml
# k8s/cronjobs/db-backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: db-backup
  namespace: lms-production
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mysql:8.0
            command:
            - /bin/sh
            - -c
            - |
              mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME | \
              gzip > /backup/backup-$(date +%Y%m%d-%H%M%S).sql.gz && \
              aws s3 cp /backup/*.sql.gz s3://lms-backups/database/
            envFrom:
            - secretRef:
                name: lms-secrets
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            emptyDir: {}
          restartPolicy: OnFailure
```

## Step 11: Deployment Process

### 11.1 Blue-Green Deployment

```bash
# Deploy new version (green)
kubectl set image deployment/lms-app \
  lms-app=your-registry/jntugv-lms:v1.1.0 \
  -n lms-production

# Monitor rollout
kubectl rollout status deployment/lms-app -n lms-production

# If issues, rollback
kubectl rollout undo deployment/lms-app -n lms-production
```

### 11.2 Canary Deployment

```yaml
# k8s/app/canary-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lms-app-canary
  namespace: lms-production
spec:
  replicas: 1  # Start with 1 pod
  selector:
    matchLabels:
      app: lms-app
      version: canary
  template:
    metadata:
      labels:
        app: lms-app
        version: canary
    spec:
      containers:
      - name: lms-app
        image: your-registry/jntugv-lms:v1.1.0
        # ... same config as main deployment
```

## Step 12: Security Hardening

### 12.1 Network Policies

```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: lms-app-policy
  namespace: lms-production
spec:
  podSelector:
    matchLabels:
      app: lms-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx-ingress
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to:
    - podSelector:
        matchLabels:
          app: kafka
    ports:
    - protocol: TCP
      port: 9092
```

### 12.2 Pod Security Policy

```yaml
# k8s/pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'projected'
  - 'secret'
  - 'downwardAPI'
  - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## Step 13: Disaster Recovery

### 13.1 Backup Checklist

- [ ] Database backups (daily)
- [ ] Redis snapshots (hourly)
- [ ] Kafka topic backups
- [ ] Configuration backups
- [ ] SSL certificates backup

### 13.2 Recovery Procedures

```bash
# Restore database
gunzip < backup.sql.gz | mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME

# Restore Redis
kubectl exec -it redis-0 -n lms-production -- redis-cli --rdb /data/dump.rdb

# Restore application
kubectl apply -f k8s/
```

## Step 14: Performance Optimization

### 14.1 CDN Configuration

Use CloudFlare or AWS CloudFront for static assets:

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  base: 'https://cdn.jntugv.edu.in/'
});
```

### 14.2 Redis Caching Strategy

```javascript
// backend/middleware/cache.js
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});

const cacheMiddleware = (duration) => async (req, res, next) => {
  const key = `cache:${req.originalUrl}`;
  
  try {
    const cached = await client.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      client.setEx(key, duration, JSON.stringify(body));
      res.sendResponse(body);
    };
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = cacheMiddleware;
```

## Deployment Checklist

- [ ] Build and push Docker images
- [ ] Create Kubernetes namespace
- [ ] Configure secrets
- [ ] Deploy Redis cluster
- [ ] Deploy Kafka cluster
- [ ] Deploy application
- [ ] Configure ingress
- [ ] Set up SSL certificates
- [ ] Configure monitoring
- [ ] Set up logging
- [ ] Initialize database
- [ ] Configure backups
- [ ] Test deployment
- [ ] Configure DNS
- [ ] Enable autoscaling
- [ ] Security hardening
- [ ] Load testing
- [ ] Documentation update

---

**Last Updated**: 2026-01-12  
**Environment**: Production  
**Contact**: devops@jntugv.edu.in
