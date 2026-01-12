# Documentation

Welcome to the JNTU GV LMS documentation. This directory contains all technical documentation for the project.

## 📁 Structure

```
docs/
├── README.md                    # This file - documentation overview
├── getting-started.md           # Quick start guide
├── architecture/                # System architecture documentation
│   ├── overview.md             # Architecture overview
│   ├── current-system.md       # Current monolithic architecture
│   ├── database-design.md      # Database schema and design
│   └── microservices.md        # Future microservices architecture
├── guides/                      # Development and operational guides
│   ├── development-setup.md    # Local development setup
│   ├── coding-standards.md     # Code style and standards
│   ├── testing-guide.md        # Testing strategies
│   └── contributing.md         # Contribution guidelines
├── api/                         # API documentation
│   ├── overview.md             # API overview
│   ├── authentication.md       # Auth endpoints
│   ├── courses.md              # Course endpoints
│   └── swagger.yaml            # OpenAPI specification
└── deployment/                  # Deployment documentation
    ├── docker.md               # Docker setup
    ├── kubernetes.md           # Kubernetes deployment
    └── production.md           # Production deployment guide
```

## 🚀 Quick Links

### For Developers
- [Getting Started](getting-started.md) - Set up your development environment
- [Development Setup](guides/development-setup.md) - Detailed setup instructions
- [Architecture Overview](architecture/overview.md) - Understand the system
- [Database Design](architecture/database-design.md) - Database schema

### For DevOps
- [Docker Guide](deployment/docker.md) - Containerization
- [Kubernetes Guide](deployment/kubernetes.md) - Orchestration
- [Production Deployment](deployment/production.md) - Deploy to production

### For Architects
- [Architecture Overview](architecture/overview.md) - System design
- [Current System](architecture/current-system.md) - Monolithic architecture
- [Microservices](architecture/microservices.md) - Future architecture

## 📚 Documentation by Topic

### Architecture
- [Architecture Overview](architecture/overview.md)
- [Current System Design](architecture/current-system.md)
- [Database Design](architecture/database-design.md)
- [Microservices Architecture](architecture/microservices.md)

### Development
- [Getting Started](getting-started.md)
- [Development Setup](guides/development-setup.md)
- [Coding Standards](guides/coding-standards.md)
- [Testing Guide](guides/testing-guide.md)
- [Contributing](guides/contributing.md)

### API
- [API Overview](api/overview.md)
- [Authentication API](api/authentication.md)
- [Courses API](api/courses.md)
- [OpenAPI Specification](api/swagger.yaml)

### Deployment
- [Docker Setup](deployment/docker.md)
- [Kubernetes Deployment](deployment/kubernetes.md)
- [Production Guide](deployment/production.md)

## 🎯 Common Tasks

### "I want to..."

**...start developing**
1. Read [Getting Started](getting-started.md)
2. Follow [Development Setup](guides/development-setup.md)
3. Review [Coding Standards](guides/coding-standards.md)

**...understand the architecture**
1. Read [Architecture Overview](architecture/overview.md)
2. Review [Database Design](architecture/database-design.md)
3. Check [Current System](architecture/current-system.md)

**...deploy the application**
1. Read [Docker Guide](deployment/docker.md)
2. Follow [Kubernetes Guide](deployment/kubernetes.md)
3. Review [Production Guide](deployment/production.md)

**...use the API**
1. Read [API Overview](api/overview.md)
2. Check specific endpoint docs
3. Review [OpenAPI Spec](api/swagger.yaml)

## 📖 Documentation Standards

### File Naming
- Use lowercase with hyphens: `database-design.md`
- Be descriptive: `development-setup.md` not `dev.md`
- Group related docs in folders

### Content Structure
Each document should have:
1. Clear title (# heading)
2. Brief description
3. Table of contents (for long docs)
4. Structured content with headings
5. Code examples where relevant
6. Last updated date

### Updating Documentation
- Update docs when code changes
- Keep examples current
- Add new docs for new features
- Remove outdated information

## 🔄 Documentation Lifecycle

### When to Update
- New feature added
- Architecture changes
- API changes
- Deployment process changes
- Bug fixes that affect usage

### How to Update
1. Edit the relevant markdown file
2. Update "Last Updated" date
3. Submit PR with doc changes
4. Get review from team

## 📊 Documentation Status

| Category | Status | Last Updated |
|----------|--------|--------------|
| Getting Started | ✅ Complete | 2026-01-12 |
| Architecture | ✅ Complete | 2026-01-12 |
| Development Guides | ✅ Complete | 2026-01-12 |
| API Documentation | 🔄 In Progress | 2026-01-12 |
| Deployment | ✅ Complete | 2026-01-12 |

## 🤝 Contributing to Documentation

We welcome documentation improvements! Please:
1. Follow the documentation standards
2. Keep language clear and concise
3. Include code examples
4. Test all commands and code
5. Submit a PR with your changes

## 📞 Support

If you can't find what you're looking for:
1. Check the [Getting Started](getting-started.md) guide
2. Search the documentation
3. Ask in team chat
4. Create an issue

---

**Last Updated**: 2026-01-12  
**Maintained By**: Development Team
