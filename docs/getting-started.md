# Getting Started with JNTU GV LMS

This guide will help you set up and start developing the JNTU GV Learning Management System.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or higher ([Download](https://nodejs.org/))
- **MySQL** 8.x ([Download](https://dev.mysql.com/downloads/))
- **Git** ([Download](https://git-scm.com/))
- **Code Editor** (VS Code recommended)

### Verify Installation

```bash
node --version    # Should show v20.x.x or higher
npm --version     # Should show 10.x.x or higher
mysql --version   # Should show 8.x.x
git --version     # Should show 2.x.x
```

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd saas-lms
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages for both frontend and backend.

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=jntugv_certification

# Backend Configuration
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_NAME=JNTU GV LMS

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Frontend Configuration
VITE_API_URL=http://localhost:3000
VITE_DEV_BACKEND_TARGET=http://localhost:3000
```

### 4. Set Up Database

Create the MySQL database:

```bash
mysql -u root -p -e "CREATE DATABASE jntugv_certification CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Initialize the database schema:

```bash
npm run init:db
```

This will:
- Create all required tables
- Set up indexes and foreign keys
- Seed initial admin user (if configured)

### 5. Start Development Servers

```bash
npm run dev
```

This starts both frontend and backend:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

## Project Structure

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

## Development Workflow

### Running Frontend Only

```bash
npm run dev:frontend
```

Access at: http://localhost:5173

### Running Backend Only

```bash
npm run dev:backend
```

API available at: http://localhost:3000

### Testing the Setup

1. **Check Backend Health**:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Test Proxy**:
   ```bash
   npm run test:proxy
   ```

3. **Access Frontend**:
   Open http://localhost:5173 in your browser

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend |
| `npm run dev:frontend` | Start only frontend (Vite) |
| `npm run dev:backend` | Start only backend (Express) |
| `npm run build` | Build frontend for production |
| `npm run lint` | Run ESLint |
| `npm run init:db` | Initialize database |
| `npm run create:admin` | Create admin user |
| `npm run test:proxy` | Test proxy configuration |

## Creating an Admin User

```bash
npm run create:admin
```

Follow the prompts to enter:
- Email address
- Password
- Name

Or set environment variables:

```env
ADMIN_EMAIL=admin@jntugv.edu.in
ADMIN_PASSWORD=SecurePassword123
ADMIN_NAME=Admin User
```

Then run:

```bash
npm run init:db
```

## Troubleshooting

### Database Connection Error

**Error**: `ER_ACCESS_DENIED_ERROR`

**Solution**:
1. Check MySQL is running
2. Verify credentials in `.env`
3. Ensure database exists

```bash
mysql -u root -p -e "SHOW DATABASES;"
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Or change port in .env
PORT=3001
```

### Frontend Can't Connect to Backend

**Error**: `Network Error` or `CORS Error`

**Solution**:
1. Ensure backend is running on port 3000
2. Check `VITE_DEV_BACKEND_TARGET` in `.env`
3. Restart both servers

### Module Not Found

**Error**: `Cannot find module`

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

Now that you're set up:

1. **Understand the Architecture**
   - Read [Architecture Overview](architecture/overview.md)
   - Review [Database Design](architecture/database-design.md)

2. **Start Developing**
   - Check [Development Setup](guides/development-setup.md)
   - Review [Coding Standards](guides/coding-standards.md)

3. **Explore the API**
   - Read [API Overview](api/overview.md)
   - Test endpoints with Postman/Thunder Client

4. **Learn the Codebase**
   - Frontend structure: `src/components/`
   - Backend structure: `backend/services/`
   - Database schema: `backend/db/schema.js`

## Getting Help

- **Documentation**: Check [docs/README.md](README.md)
- **Issues**: Create an issue in the repository
- **Team**: Ask in team chat
- **Email**: support@jntugv.edu.in

## Useful Resources

- [React Documentation](https://react.dev/)
- [Express Documentation](https://expressjs.com/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Vite Documentation](https://vitejs.dev/)

---

**Last Updated**: 2026-01-12  
**Next**: [Development Setup Guide](guides/development-setup.md)
