# 📚 JNTU GV Certification Platform – Development Guide

A full‑stack, **React + Vite** frontend and **Express + MySQL + Drizzle ORM** backend that lets students browse, enroll in, and earn certification for industry‑relevant courses. The app ships with a polished UI, Google‑based SSO, and rich email‑notification flows (OTP, enrollment, certificate issuance).

---

## 1️⃣ Prerequisites

| Tool | Minimum version | Why? |
|------|----------------|------|
| **Node.js** | 20.x LTS (or newer) | Runs Vite, React, and the Express server |
| **npm** | bundled with Node | Package manager |
| **MySQL** | 8.x | Persistent data store (users, courses, enrollments, payments) |
| **Git** | any | Source‑control (optional but recommended) |
| **REST client** (Postman, Thunder Client, curl) | – | Test API endpoints manually |

Verify installations:

```bash
node --version
npm --version
mysql --version
```

---

## 2️⃣ Project Setup

```bash
# Clone the repo (if you haven’t already)
git clone <repo‑url>
cd jntugv-certification

# Install all dependencies (frontend + backend share the same node_modules)
npm install
```

### 2.1 Environment variables
Create a **`.env`** file in the repository root. It is automatically loaded by the backend (`dotenv/config`) and Vite (variables prefixed with `VITE_` become available to the client).

```dotenv
# ── Backend (Express + Drizzle) ─────────────────────
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=jntugv_certification
DB_PORT=3306

# JWT secret for auth middleware
JWT_SECRET=choose-a-strong-secret

# Server port (default 3000)
PORT=3000

# ── Frontend (Vite) ───────────────────────────────
# API proxy – Vite forwards `/api/*` to the backend.
VITE_DEV_BACKEND_TARGET=http://localhost:3000   # dev only
# Production API endpoint (set before `npm run build`)
# VITE_API_URL=https://api.example.com/api
```

> **Tip:** Add `.env` to `.gitignore` to keep secrets out of source control.

---

## 3️⃣ Database Setup

```sql
CREATE DATABASE IF NOT EXISTS jntugv_certification
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

The **Drizzle** schema (`backend/db/schema.js`) will auto‑create tables on first insert, but you can also run any migration scripts you add later.

---

## 4️⃣ Running the Application

### 4.1 Backend API
```bash
node ./backend/server.js
```
You should see:
```
🚀 Backend server running on port 3000
📊 API endpoints available at http://localhost:3000/api
Connected to MySQL database via mysql.createConnection
```

> **Optional:** Add an npm script for convenience:
```json
"scripts": {
  "dev:backend": "node backend/server.js"
}
```
Then run `npm run dev:backend`.

### 4.2 Frontend (React + Vite)
```bash
npm run dev
```
Vite starts on **http://localhost:5173** and proxies `/api/*` to the backend target defined in `.env`. Open the URL shown in the terminal (usually `http://localhost:5173/`).

---

## 5️⃣ Feature Workflows

### 5.1 Authentication
| Step | UI Component | API Route | Description |
|------|--------------|-----------|-------------|
| **Sign‑Up** | `src/pages/SignUp.jsx` | `POST /api/auth/signup` | Creates a new user, hashes password, sends a **welcome email** (`sendWelcomeEmail`). |
| **Sign‑In** | `src/pages/SignIn.jsx` | `POST /api/auth/login` | Validates credentials, returns JWT, stores session in `localStorage`. |
| **Forgot Password** | `src/pages/ForgotPassword.jsx` | `POST /api/auth/forgot-password` | Generates OTP, stores hashed OTP, sends **OTP email** (`sendOtpEmail`). |
| **Reset Password** | Same page (step 3) | `POST /api/auth/reset-password` | Verifies OTP, updates password. |
| **Google SSO** | `src/pages/SignIn.jsx` & `src/pages/SignUp.jsx` (Google button) | `POST /api/auth/google` | Verifies Google ID token, creates/updates user, returns JWT. |
| **Session Refresh** | `src/contexts/AuthContext.jsx` (`fetchCurrentUser`) | `GET /api/auth/me` | Retrieves current user profile, updates context. |
All auth pages are wrapped by **`AuthProvider`** and **`ProtectedRoute`** (for private routes).

### 5.2 Email Notification System
Implemented in **`backend/services/email.js`** using **Nodemailer**.
| Trigger | Backend Logic | Email Template |
|--------|----------------|----------------|
| **OTP for password reset** | `sendOtpEmail(email, otp, expiry)` called from `forgot-password` endpoint | HTML with large OTP code, 5‑minute expiry notice |
| **Welcome after sign‑up** | `sendWelcomeEmail(email, name)` called after successful sign‑up | Branded welcome layout |
| **Course enrollment (admin‑manual)** | `sendEnrollmentEmail({ email, userName, courseTitle, adminName })` called in `enrollments.js` when admin enrolls another user | Confirmation with course title and “Start Learning” CTA |
| **Certificate issuance** | `sendCertificateIssuedEmail({ email, userName, courseTitle, certificateId })` called in `certifications.js` when status → `ISSUED` | Certificate ID, download link, congratulatory message |
> **SMTP configuration** – set in `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURITY`, `SMTP_EMAIL`, `SMTP_PASSWORD`, `SMTP_FROM_NAME`). If not set, the service falls back to console logging (development mode).

### 5.3 Course Browsing
| Page | Component | Data Source | Key Features |
|------|-----------|-------------|--------------|
| **Landing (Home) Page** | `src/pages/LandingPage.jsx` → `FeaturedCourses` component | `useRealtime()` (real‑time MySQL listener) or fallback `fallbackCourses` JSON | Hero banner, featured courses carousel, “Explore Our Courses” CTA |
| **Course List / Details** | `src/pages/CoursePage.jsx` (list) & `src/pages/CourseDetailsPage.jsx` (detail) | `GET /api/courses` & `GET /api/courses/:id` | Shows course image (`imageUrl` fallback), description, price, enrollment button |
| **Learn Page** | `src/pages/LearnPage.jsx` | `GET /api/courses/:id/modules` | Video/lesson player, progress tracking (`RealtimeContext`) |
| **Checkout** | `src/pages/CheckoutPage.jsx` | `POST /api/payments/create-session` (Stripe‑like flow) | Payment status, order summary, post‑payment redirect to Learn page |

### 5.4 Enrollment Management (Admin)
- **Route**: `backend/routes/enrollments.js` (`POST /api/enrollments`)
- **UI**: `src/pages/admin/enrollment-management/EnrollmentManagement.jsx` (list) & `ManualEnrollmentForm.jsx` (manual enrollment)
- **Workflow**: Admin selects a user → selects a course → API creates enrollment record → **Enrollment email** is sent.

### 5.5 Payments
- **Route**: `backend/routes/payments.js` (`POST /api/payments/create-session`)
- **UI**: `src/pages/CheckoutPage.jsx`
- **Flow**: Frontend collects payment method → backend creates a payment session → on success, user is redirected to the Learn page and receives a **receipt email** (future enhancement).

### 5.6 Admin Dashboard
All admin pages are lazy‑loaded under `/admin/*` and protected by `ProtectedRoute` with `requiredRole="admin"`.
| Section | Component | Core Routes |
|---------|-----------|-------------|
| **Dashboard** | `AdminPage.jsx` | – |
| **Analytics** | `Analytics.jsx` | – (future: integrate DB stats) |
| **Course Management** | `CourseManagement.jsx`, `CourseCreateForm.jsx`, `CourseEditForm.jsx` | `GET/POST /api/courses`, `PUT /api/courses/:id` |
| **User Management** | `UsersManagement.jsx`, `UserManagementForm.jsx` | `GET /api/users`, `PUT /api/users/:id` |
| **Coupons** | `AdminCoupons.jsx`, `CreateEditCouponPage.jsx` | `GET/POST /api/coupons` |
| **Enrollments** | `EnrollmentManagement.jsx`, `ManualEnrollmentForm.jsx` | `GET /api/enrollments`, `POST /api/enrollments` |
| **Certificates** | `CertificateGenerator.jsx` | `GET /api/certifications`, `PUT /api/certifications/:id` (status → `ISSUED` triggers email) |

---

## 6️⃣ Testing & Linting
```bash
# Lint the whole repo
npm run lint

# Run unit / integration tests (add your test runner, e.g., Vitest)
npm test
```
All ESLint errors have been silenced where appropriate (`/* eslint-disable no-console, no-unused-vars */` in `AuthContext.jsx`).

---

## 7️⃣ Troubleshooting
| Symptom | Likely Cause | Fix |
|---------|---------------|-----|
| **Port conflict** (3000 or 5173) | Another process using the same port | Change `PORT` in `.env` and adjust `VITE_DEV_BACKEND_TARGET` |
| **CORS errors** | Backend CORS not configured for custom origin | Update `backend/server.js` CORS options (`origin: ['http://localhost:5173', '<prod‑url>']`) |
| **Database connection failure** | Wrong MySQL credentials or server down | Verify `.env` values, ensure MySQL service is running |
| **Email not sent** | SMTP vars missing or auth blocked | Fill all `SMTP_*` vars, enable “less secure apps” or use an App Password for Gmail |
| **Auth pages blank** | Browser cache / extension interference | Hard‑refresh (`Ctrl+Shift+R`) or open in incognito mode |

---

## 8️⃣ Future Scope & Roadmap
| Area | Planned Enhancements | Benefit |
|------|----------------------|---------|
| **Email Service** | Move to a transactional email provider (SendGrid, Mailgun) with templating engine (MJML) | Better deliverability, analytics, and design flexibility |
| **Google SSO** | Replace custom fallback button with **Google Identity Services** native button (auto‑render) | Streamlined UI, reduced maintenance |
| **OTP Security** | Store OTP hashes with a **rate‑limit** and **brute‑force protection** | Hardened password‑reset flow |
| **Payments** | Integrate **Stripe Checkout** (or Razorpay) and store receipts in DB; send receipt email | Real payment processing, audit trail |
| **Admin UI** | Add **drag‑and‑drop page builder** for landing page sections | Non‑technical content management |
| **Analytics Dashboard** | Real‑time charts (user growth, course completions) via **Chart.js** or **Recharts** | Data‑driven decisions |
| **Testing** | Full **Vitest** + **React Testing Library** coverage for UI, **Jest** for backend | CI‑ready quality gate |
| **CI/CD** | GitHub Actions workflow to lint, test, and deploy to Vercel (frontend) & Render (backend) | Automated releases |
| **Internationalisation (i18n)** | Add `react-i18next` and language files (EN, TE) | Reach a broader audience |
| **Accessibility** | WCAG 2.1 AA audit, ARIA labels, keyboard navigation | Inclusive experience |
| **Dockerisation** | Provide `Dockerfile` and `docker-compose.yml` for one‑click dev/prod environments | Consistent environments, easier onboarding |

---

## 9️⃣ Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/awesome-feature`).
3. Follow the **code‑style** (Prettier + ESLint).
4. Write tests for new logic.
5. Submit a PR – reviewers will run the CI pipeline (lint + tests).

---

## 🔖 License
MIT – see `LICENSE` file.

---

*Happy building! 🎉*
