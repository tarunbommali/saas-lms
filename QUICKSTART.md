# Quick Start Guide - JNTU-GV Certification Platform

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or newer
- MySQL/MariaDB
- npm or yarn

### Installation

1. **Clone and Install Dependencies**
```bash
cd /app
npm install
```

2. **Configure Environment**
```bash
# .env file is already configured with:
# - Database connection (MySQL)
# - JWT secret
# - Server port (3000)
# - Admin credentials
```

3. **Start Services**
```bash
# Services are managed by supervisor
supervisorctl status

# Restart if needed
supervisorctl restart jntugv_backend
supervisorctl restart jntugv_frontend
```

### Access Points

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/api/health

### Default Admin Account
- **Email:** admin@example.com
- **Password:** your_admin_password
- ⚠️ **Change this password immediately after first login!**

---

## 📁 Project Structure

```
/app/
├── backend/                    # Express.js backend
│   ├── db/                    # Database schema and connection
│   ├── middleware/            # Auth, validation, error handling
│   ├── routes/                # API routes
│   ├── services/              # Business logic (payment, certificate, email)
│   └── server.js              # Main server file
│
├── src/                       # React frontend
│   ├── api/                   # API client and services
│   ├── components/            # Reusable components
│   │   ├── ui/               # UI components (Button, Card, Modal, etc.)
│   │   ├── Certificate/      # Certificate generation
│   │   ├── Course/           # Course-related components
│   │   └── Admin/            # Admin components
│   ├── contexts/              # React contexts (Auth, Toast, etc.)
│   ├── hooks/                 # Custom React hooks
│   ├── pages/                 # Page components
│   │   ├── admin/            # Admin dashboard pages
│   │   └── ...               # Public pages
│   ├── styles/                # Global styles and design system
│   ├── utils/                 # Utility functions
│   │   ├── validation.js     # Zod validation schemas
│   │   ├── format.js         # Formatting utilities
│   │   ├── apiHelpers.js     # API helpers with retry logic
│   │   ├── helpers.js        # General utilities
│   │   └── constants.js      # App constants
│   ├── App.jsx                # Main App component
│   └── main.jsx               # Entry point
│
└── .env                       # Environment variables
```

---

## 🔑 Key Features

### ✅ User Management
- Registration with email/password
- Google OAuth integration (configurable)
- Password reset with OTP
- Profile management
- Role-based access (Admin/User)

### 📚 Course Management
- Browse and search courses
- Course categories and difficulty levels
- Module-based learning
- Progress tracking
- Video content support

### 💳 Payment System
- Razorpay integration (production-ready)
- Secure payment verification
- Payment history
- Coupon system (structure ready)
- Invoice generation

### 🎓 Certificate System
- Automatic certificate generation
- Multiple certificate designs (modern, classic, minimal)
- PDF download
- Certificate verification
- Social sharing

### 📊 Admin Dashboard
- User management
- Course management
- Enrollment management
- Certificate issuance
- Coupon management
- Analytics (structure ready)

---

## 🛠️ Development

### Running Locally

```bash
# Backend (Node.js/Express)
cd /app
node backend/server.js

# Frontend (React/Vite)
npm run dev:frontend

# Or run both with concurrently
npm run dev
```

### API Testing

```bash
# Health check
curl http://localhost:3000/api/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your_admin_password"}'

# Get courses
curl http://localhost:3000/api/courses

# Get user profile (with token)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Adding New Features

1. **Backend Route:**
   - Add route in `/app/backend/routes/`
   - Add validation middleware
   - Implement business logic in service
   - Add error handling

2. **Frontend Page:**
   - Create page component in `/app/src/pages/`
   - Add route in `/app/src/App.jsx`
   - Use shared components from `/app/src/components/ui/`
   - Use hooks from `/app/src/hooks/`
   - Add API calls in `/app/src/api/`

3. **UI Component:**
   - Create in `/app/src/components/ui/`
   - Follow design system in `/app/src/styles/designSystem.js`
   - Use cn() utility for className merging
   - Add data-testid attributes

---

## 🎨 Design System

### Colors
- Primary: Blue (#3b82f6)
- Success: Green (#22c55e)
- Error: Red (#ef4444)
- Warning: Yellow (#f59e0b)
- Info: Sky (#0ea5e9)

### Components
All UI components support:
- Multiple variants (primary, secondary, outline, ghost, etc.)
- Multiple sizes (xs, sm, md, lg, xl)
- Loading states
- Disabled states
- Hover/focus effects
- Accessibility attributes

### Usage Example
```jsx
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useToastContext } from '../contexts/ToastContext';

function MyComponent() {
  const { success, error } = useToastContext();
  
  const handleSubmit = async () => {
    try {
      // API call
      success('Operation successful!');
    } catch (err) {
      error('Something went wrong');
    }
  };
  
  return (
    <Card>
      <Button 
        variant="primary" 
        size="md" 
        loading={isLoading}
        onClick={handleSubmit}
      >
        Submit
      </Button>
    </Card>
  );
}
```

---

## 🔒 Security Best Practices

1. **Never commit .env file**
2. **Change default admin password**
3. **Use strong JWT secret (min 32 characters)**
4. **Enable HTTPS in production**
5. **Keep dependencies updated**
6. **Validate all user inputs**
7. **Sanitize data before database queries**
8. **Use prepared statements (Drizzle ORM handles this)**

---

## 📈 Performance Tips

1. **Use React.memo for expensive components**
2. **Lazy load admin routes (already implemented)**
3. **Optimize images (use WebP format)**
4. **Enable compression (already enabled)**
5. **Use API response caching (implemented)**
6. **Debounce search inputs (utility provided)**
7. **Implement virtual scrolling for large lists**

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
tail -100 /var/log/supervisor/jntugv_backend.err.log

# Common issues:
# - MySQL not running: supervisorctl restart mysql
# - Port 3000 in use: change PORT in .env
# - Missing dependencies: npm install
```

### Frontend errors
```bash
# Check logs
tail -100 /var/log/supervisor/jntugv_frontend.err.log

# Common issues:
# - Node version: use Node 20.x
# - Missing modules: npm install
# - Build errors: check console for specific error
```

### Database connection issues
```bash
# Check MySQL status
mysql -u root -p

# Grant permissions
GRANT ALL PRIVILEGES ON jntugv_certification.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

---

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Express.js](https://expressjs.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [Zod Validation](https://zod.dev)

---

## 🤝 Support

For issues or questions:
1. Check TESTING_CHECKLIST.md
2. Review IMPROVEMENTS.md for feature details
3. Check error logs
4. Review code comments

---

**Happy Coding! 🚀**

**Version:** 2.0.0  
**Last Updated:** January 1, 2026
