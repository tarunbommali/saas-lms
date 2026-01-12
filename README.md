# 📚 JNTU GV Learning Management System (LMS)

A production-ready, scalable Learning Management System built with modern web technologies and designed for enterprise-scale deployment.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development servers (frontend + backend)
npm run dev

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
```

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## 🎯 Overview

JNTU GV LMS is a comprehensive learning platform that provides:

- **Course Management**: Create, organize, and publish courses with modules and lessons
- **Student Enrollment**: Seamless enrollment and progress tracking
- **Quiz System**: Interactive quizzes with automated grading
- **Payment Integration**: Razorpay integration for course purchases
- **Certificate Generation**: Automated PDF certificate generation
- **Analytics Dashboard**: Real-time insights and reporting
- **Email Notifications**: Automated email workflows
- **Admin Portal**: Complete administrative control

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and dev server
- **TailwindCSS 4** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Framer Motion** - Animations
- **Recharts** - Data visualization

### Backend
- **Node.js 20** - Runtime environment
- **Express 5** - Web framework
- **MySQL 8** - Primary database
- **Drizzle ORM** - Type-safe database queries
- **JWT** - Authentication
- **Nodemailer** - Email service

### DevOps & Tools
- **Docker** - Containerization
- **Kubernetes** - Orchestration (production)
- **GitHub Actions** - CI/CD
- **ESLint** - Code linting

---

## 📁 Project Structure

```
saas-lms/
├── backend/              # Express backend
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── db/             # Database schema & connection
│   ├── middleware/     # Custom middleware
│   ├── repositories/   # Data access layer
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   └── utils/          # Helper functions
├── src/                 # React frontend
│   ├── api/            # API client
│   ├── components/     # React components
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── pages/          # Page components
│   └── utils/          # Utility functions
├── docs/                # Documentation
├── scripts/            # Utility scripts
└── public/             # Static assets
```

---

## 🏁 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **MySQL** 8.x
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd saas-lms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file in root directory
   cp .env.example .env
   ```

4. **Configure database**
   ```bash
   # Create MySQL database
   mysql -u root -p -e "CREATE DATABASE jntugv_certification CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   
   # Initialize database schema
   npm run init:db
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

---

## 💻 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:frontend` | Start only Vite dev server (port 5173) |
| `npm run dev:backend` | Start only Express server (port 3000) |
| `npm run build` | Build frontend for production |
| `npm run build:full` | Build frontend and show deployment instructions |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run test:proxy` | Test proxy configuration |
| `npm run init:db` | Initialize database schema |
| `npm run create:admin` | Create admin user |
| `npm run grant:admin` | Grant admin privileges to user |

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=jntugv_certification

# Backend
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_NAME=JNTU GV LMS

# Payment (Razorpay)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Frontend
VITE_API_URL=http://localhost:3000
VITE_DEV_BACKEND_TARGET=http://localhost:3000
```

### Development Workflow

1. **Frontend Development**
   - Frontend runs on `http://localhost:5173`
   - Hot module replacement enabled
   - API calls proxied to backend automatically

2. **Backend Development**
   - Backend runs on `http://localhost:3000`
   - Auto-restart on file changes (using `--watch` flag)
   - API endpoints available at `/api/*`

3. **Database Changes**
   - Update schema in `backend/db/schema.js`
   - Run migrations if needed
   - Use `npm run check:db` to verify schema

---

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

### Architecture & Design
- **[architecture.md](docs/architecture.md)** - System architecture overview
- **[database.md](docs/database.md)** - Database schema and design
- **[ENHANCED_SYSTEM_DESIGN.md](docs/ENHANCED_SYSTEM_DESIGN.md)** - Microservices architecture (future)

### Development Guides
- **[STRUCTURE.md](docs/STRUCTURE.md)** - Frontend project structure
- **[PROXY_SETUP.md](docs/PROXY_SETUP.md)** - Proxy configuration guide
- **[DOCKER_KUBERNETES_GUIDE.md](docs/DOCKER_KUBERNETES_GUIDE.md)** - Container orchestration

### Migration & Scaling
- **[MICROSERVICES_MIGRATION.md](docs/MICROSERVICES_MIGRATION.md)** - Migration to microservices
- **[SYSTEM_DESIGN_SUMMARY.md](docs/SYSTEM_DESIGN_SUMMARY.md)** - Scalability roadmap

### Quick References
- **[PROXY_QUICK_REF.md](docs/PROXY_QUICK_REF.md)** - Proxy commands
- **[DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md)** - Complete documentation index

---

## 🚢 Deployment

### Production Build

```bash
# Build frontend
npm run build:full

# Start production server
npm start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t jntugv-lms .

# Run container
docker run -p 3000:3000 --env-file .env jntugv-lms
```

### Kubernetes Deployment

See [DOCKER_KUBERNETES_GUIDE.md](docs/DOCKER_KUBERNETES_GUIDE.md) for detailed instructions.

---

## 🔐 Security

- **Authentication**: JWT-based with secure token management
- **Authorization**: Role-based access control (RBAC)
- **Password Hashing**: bcrypt with salt rounds
- **SQL Injection**: Protected via parameterized queries
- **XSS Protection**: Input sanitization and validation
- **CORS**: Configurable origin restrictions
- **Rate Limiting**: API endpoint protection

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- auth.test.js

# Run with coverage
npm run test:coverage
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful commit messages
- Add tests for new features

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Team

**JNTU GV Development Team**

---

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Contact: support@jntugv.edu.in

---

## 🗺️ Roadmap

### Current Version (v1.0)
- ✅ Course management
- ✅ Student enrollment
- ✅ Quiz system
- ✅ Payment integration
- ✅ Certificate generation
- ✅ Admin dashboard

### Upcoming Features (v2.0)
- 🔄 Microservices architecture
- 🔄 Real-time notifications
- 🔄 Video streaming optimization
- 🔄 Mobile app
- 🔄 AI-powered recommendations
- 🔄 Advanced analytics

See [ENHANCED_SYSTEM_DESIGN.md](docs/ENHANCED_SYSTEM_DESIGN.md) for detailed roadmap.

---

## 🙏 Acknowledgments

- React Team for the amazing framework
- Vite for the blazing-fast build tool
- All open-source contributors

---

**Built with ❤️ by JNTU GV Team**
