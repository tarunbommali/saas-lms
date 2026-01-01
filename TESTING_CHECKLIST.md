# Testing & Validation Checklist

## 🧪 Backend API Testing

### Authentication Endpoints
- [ ] **POST /api/auth/signup**
  - Valid signup with all required fields
  - Duplicate email rejection
  - Password validation (min 8 chars, uppercase, lowercase, number)
  - Email format validation
  
- [ ] **POST /api/auth/login**
  - Valid credentials login
  - Invalid email rejection
  - Invalid password rejection
  - JWT token generation
  
- [ ] **POST /api/auth/forgot-password**
  - Valid email generates OTP
  - Invalid email handling
  - OTP expiry (5 minutes)
  
- [ ] **POST /api/auth/reset-password**
  - Valid OTP resets password
  - Expired OTP rejection
  - Invalid OTP rejection
  
- [ ] **GET /api/auth/me**
  - Returns user profile with valid token
  - 401 error with invalid/missing token

### Course Endpoints
- [ ] **GET /api/courses**
  - Returns list of published courses
  - Pagination working
  - Filtering by category, difficulty
  
- [ ] **GET /api/courses/:id**
  - Returns course details
  - 404 for non-existent course
  
- [ ] **POST /api/admin/courses** (Admin only)
  - Create course with valid data
  - Validation errors for invalid data
  - 403 for non-admin users
  
- [ ] **PUT /api/admin/courses/:id** (Admin only)
  - Update course successfully
  - Validation on updates
  
- [ ] **DELETE /api/admin/courses/:id** (Admin only)
  - Soft delete course
  - Cannot delete course with active enrollments

### Payment Endpoints
- [ ] **POST /api/payments**
  - Create payment order
  - Razorpay order generation
  - Amount calculation with discounts
  
- [ ] **POST /api/payments/verify**
  - Verify payment signature
  - Create enrollment on successful payment
  - Update payment status
  
- [ ] **GET /api/payments/my-payments**
  - Returns user's payment history
  - Requires authentication

### Enrollment Endpoints
- [ ] **GET /api/enrollments/my-enrollments**
  - Returns user enrollments
  - Shows progress percentage
  
- [ ] **POST /api/enrollments** (Manual enrollment)
  - Admin can enroll users
  - Sends enrollment email
  
- [ ] **GET /api/enrollments/:id**
  - Returns enrollment details
  - User can only see own enrollments

### Certificate Endpoints
- [ ] **GET /api/admin/certifications**
  - List all certifications (admin)
  - Filter by user, course, status
  
- [ ] **POST /api/admin/certifications**
  - Create certification record
  - Generate certificate ID
  
- [ ] **PUT /api/admin/certifications/:id**
  - Update status to ISSUED
  - Send certificate email
  - Lock certificate after issuance

---

## 🎨 Frontend Component Testing

### Authentication Pages
- [ ] **Sign In Page** (`/auth/signin`)
  - Email validation
  - Password validation
  - Login functionality
  - Google OAuth button
  - Remember me checkbox
  - Forgot password link
  - Error messages display
  - Loading state during login
  
- [ ] **Sign Up Page** (`/auth/signup`)
  - All field validations
  - Password strength indicator
  - Password confirmation match
  - Terms acceptance
  - Duplicate email error
  - Success redirect
  
- [ ] **Forgot Password** (`/auth/forgot-password`)
  - Email submission
  - OTP input (6 digits)
  - OTP expiry countdown
  - Password reset
  - All validation messages

### Course Pages
- [ ] **Course List** (`/courses`)
  - Display all courses
  - Search functionality
  - Filter by category, difficulty, price
  - Sort by date, price, popularity
  - Responsive grid layout
  - Shimmer loading state
  
- [ ] **Course Details** (`/course/:id`)
  - All course information displayed
  - Enroll button
  - Price display
  - Instructor info
  - Module list
  - Prerequisites
  - What you'll learn
  - Reviews/ratings
  
- [ ] **Learn Page** (`/learn/:courseId`)
  - Video player
  - Module navigation
  - Progress tracking
  - Mark as complete
  - Next/Previous navigation
  - Certificate download (if completed)

### Payment Flow
- [ ] **Checkout Page** (`/checkout/:courseId`)
  - Course summary
  - Price breakdown
  - Coupon code input
  - Payment method selection
  - Razorpay integration
  - Payment success handling
  - Payment failure handling
  - Redirect to learn page on success

### Profile Pages
- [ ] **Profile View** (`/profile`)
  - User information display
  - Enrolled courses
  - Completed courses
  - Certificates
  - Payment history
  - Learning streak
  
- [ ] **Profile Edit** (`/profile/edit`)
  - Edit all profile fields
  - Form validation
  - Save changes
  - Cancel button
  - Success toast

### Admin Dashboard
- [ ] **Admin Home** (`/admin`)
  - Statistics cards
  - Recent activities
  - Quick actions
  
- [ ] **Course Management** (`/admin/courses`)
  - List all courses
  - Create new course
  - Edit course
  - Delete course
  - Publish/unpublish
  - Preview course
  
- [ ] **User Management** (`/admin/users`)
  - List all users
  - User details
  - Edit user role
  - Activate/deactivate
  - View user enrollments
  
- [ ] **Enrollment Management** (`/admin/enrollments`)
  - List all enrollments
  - Manual enrollment
  - View progress
  - Update status
  
- [ ] **Certificate Management** (`/admin/certifications`)
  - List all certificates
  - Issue certificate
  - View certificate
  - Download certificate
  - Revoke certificate
  
- [ ] **Coupon Management** (`/admin/coupons`)
  - List coupons
  - Create coupon
  - Edit coupon
  - Activate/deactivate
  - View usage statistics

---

## 🎯 UI/UX Testing

### Responsive Design
- [ ] Mobile (320px - 640px)
  - All pages responsive
  - Navigation works
  - Forms usable
  - Buttons accessible
  
- [ ] Tablet (640px - 1024px)
  - Optimal layout
  - Side navigation
  - Grid layouts
  
- [ ] Desktop (1024px+)
  - Full feature display
  - Multi-column layouts
  - Hover effects

### Component Testing
- [ ] **Buttons**
  - All variants render correctly
  - Hover states work
  - Loading state shows spinner
  - Disabled state prevents clicks
  - Icons display correctly
  
- [ ] **Cards**
  - Hover effects
  - Click handlers
  - Shadow and border
  - Content overflow handling
  
- [ ] **Modals**
  - Opens and closes
  - Backdrop click closes
  - Escape key closes
  - Body scroll prevented
  - Animations smooth
  
- [ ] **Toasts**
  - All types display
  - Auto-dismiss works
  - Manual close works
  - Multiple toasts stack
  - Animations smooth
  
- [ ] **Forms**
  - All input types work
  - Validation messages
  - Error states
  - Helper text
  - Required indicators
  - Submit disabled until valid
  
- [ ] **Loading States**
  - Spinner sizes correct
  - Loading screen displays
  - Loading overlay works
  - Skeleton loaders

### Accessibility
- [ ] Keyboard Navigation
  - Tab through all interactive elements
  - Enter/Space activate buttons
  - Escape closes modals
  - Arrow keys in lists
  
- [ ] Screen Reader
  - All images have alt text
  - ARIA labels present
  - Form labels associated
  - Error announcements
  
- [ ] Color Contrast
  - Text readable
  - Focus indicators visible
  - Error states clear

---

## ⚡ Performance Testing

### Load Times
- [ ] Initial page load < 3s
- [ ] Time to interactive < 5s
- [ ] API response times < 500ms
- [ ] Image optimization
- [ ] Lazy loading works

### Optimization
- [ ] Code splitting effective
- [ ] Bundle size reasonable
- [ ] Caching working
- [ ] No memory leaks
- [ ] Smooth animations (60fps)

---

## 🔒 Security Testing

### Authentication
- [ ] JWT tokens secure
- [ ] Token expiry works
- [ ] Refresh token flow
- [ ] Password hashing (bcrypt)
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection

### Authorization
- [ ] Role-based access control
- [ ] Admin routes protected
- [ ] User can only access own data
- [ ] API rate limiting works

### Data Validation
- [ ] Server-side validation
- [ ] Input sanitization
- [ ] File upload restrictions
- [ ] SQL injection tests
- [ ] XSS attempt prevention

---

## 📊 Database Testing

### Data Integrity
- [ ] Foreign key constraints
- [ ] Unique constraints
- [ ] NOT NULL constraints
- [ ] Default values
- [ ] Timestamps auto-update

### Queries
- [ ] Efficient queries (no N+1)
- [ ] Proper indexing
- [ ] Connection pooling
- [ ] Transaction handling
- [ ] Error handling

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] No console errors
- [ ] No console warnings
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Seed data (if needed)

### Production
- [ ] HTTPS enabled
- [ ] Environment is 'production'
- [ ] Error logging configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] CDN configured (if used)

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Health check endpoint responding
- [ ] SSL certificate valid
- [ ] DNS configured correctly
- [ ] Performance metrics baseline

---

## 📝 Test Commands

```bash
# Backend Tests
cd /app
node backend/server.js

# Frontend Tests  
npm run dev:frontend

# Health Check
curl http://localhost:3000/api/health

# Login Test
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@example.com","password":"admin123"}'

# Get Courses
curl http://localhost:3000/api/courses
```

---

## ✅ Sign-off

**Tested By:** _______________  
**Date:** _______________  
**Environment:** Development / Staging / Production  
**Status:** Pass / Fail / Pending  
**Notes:** 

---

**Version:** 1.0.0  
**Last Updated:** January 1, 2026
