/**
 * Constants for the application
 */

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    GOOGLE: '/auth/google',
  },
  
  // Courses
  COURSES: {
    LIST: '/courses',
    DETAIL: (id) => `/courses/${id}`,
    CREATE: '/admin/courses',
    UPDATE: (id) => `/admin/courses/${id}`,
    DELETE: (id) => `/admin/courses/${id}`,
    MODULES: (id) => `/courses/${id}/modules`,
  },
  
  // Enrollments
  ENROLLMENTS: {
    LIST: '/enrollments',
    CREATE: '/enrollments',
    MY_ENROLLMENTS: '/enrollments/my-enrollments',
    DETAIL: (id) => `/enrollments/${id}`,
  },
  
  // Payments
  PAYMENTS: {
    LIST: '/payments',
    CREATE: '/payments',
    MY_PAYMENTS: '/payments/my-payments',
    UPDATE: (id) => `/payments/${id}`,
  },
  
  // Certifications
  CERTIFICATIONS: {
    LIST: '/admin/certifications',
    CREATE: '/admin/certifications',
    DETAIL: (id) => `/admin/certifications/${id}`,
    UPDATE: (id) => `/admin/certifications/${id}`,
    DELETE: (id) => `/admin/certifications/${id}`,
  },
  
  // Coupons
  COUPONS: {
    LIST: '/admin/coupons',
    CREATE: '/admin/coupons',
    VALIDATE: '/coupons/validate',
    UPDATE: (id) => `/admin/coupons/${id}`,
    DELETE: (id) => `/admin/coupons/${id}`,
  },
  
  // Users
  USERS: {
    LIST: '/admin/users',
    DETAIL: (id) => `/admin/users/${id}`,
    UPDATE: (id) => `/admin/users/${id}`,
    DELETE: (id) => `/admin/users/${id}`,
  },
  
  // Progress
  PROGRESS: {
    GET: (courseId) => `/progress/${courseId}`,
    UPDATE: (courseId) => `/progress/${courseId}`,
  },
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

// Course Difficulty Levels
export const DIFFICULTY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
};

// Course Categories
export const COURSE_CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'Data Science',
  'Machine Learning',
  'Artificial Intelligence',
  'Cloud Computing',
  'Cybersecurity',
  'DevOps',
  'Blockchain',
  'Game Development',
  'UI/UX Design',
  'Digital Marketing',
  'Business',
  'Other',
];

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

// Certification Status
export const CERTIFICATION_STATUS = {
  PENDING: 'PENDING',
  ISSUED: 'ISSUED',
  REVOKED: 'REVOKED',
};

// Enrollment Status
export const ENROLLMENT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

// Gender Options
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

// Content Types
export const CONTENT_TYPES = {
  VIDEO: 'video',
  DOCUMENT: 'document',
  QUIZ: 'quiz',
  ASSIGNMENT: 'assignment',
  EXTERNAL: 'external',
};

// Currency
export const CURRENCY = {
  CODE: 'INR',
  SYMBOL: '₹',
};

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'short',
  LONG: 'long',
  FULL: 'full',
  TIME: 'time',
  DATETIME: 'datetime',
};

// Toast Types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Modal Sizes
export const MODAL_SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
  FULL: 'full',
};

// Button Variants
export const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  OUTLINE: 'outline',
  GHOST: 'ghost',
  LINK: 'link',
  DESTRUCTIVE: 'destructive',
  SUCCESS: 'success',
};

// Button Sizes
export const BUTTON_SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  ICON: 'icon',
};

// Loading States
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

// File Upload
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
  URL: /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  NUMERIC: /^[0-9]+$/,
  ALPHABETIC: /^[a-zA-Z]+$/,
};

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An error occurred. Please try again.',
  NETWORK: 'Network error. Please check your internet connection.',
  UNAUTHORIZED: 'You need to sign in to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION: 'Please check your input and try again.',
  TIMEOUT: 'Request timeout. Please try again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  GENERIC: 'Operation completed successfully.',
  CREATED: 'Created successfully.',
  UPDATED: 'Updated successfully.',
  DELETED: 'Deleted successfully.',
  SAVED: 'Saved successfully.',
  SENT: 'Sent successfully.',
};

// Routes
export const ROUTES = {
  HOME: '/',
  COURSES: '/courses',
  COURSE_DETAIL: (id) => `/course/${id}`,
  LEARN: (id) => `/learn/${id}`,
  CHECKOUT: (id) => `/checkout/${id}`,
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  SIGNIN: '/auth/signin',
  SIGNUP: '/auth/signup',
  FORGOT_PASSWORD: '/auth/forgot-password',
  ADMIN: '/admin',
  ADMIN_COURSES: '/admin/courses',
  ADMIN_USERS: '/admin/users',
  ADMIN_ENROLLMENTS: '/admin/enrollments',
  ADMIN_CERTIFICATIONS: '/admin/certifications',
  ADMIN_COUPONS: '/admin/coupons',
  ADMIN_ANALYTICS: '/admin/analytics',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'jntugv_auth_token',
  USER: 'jntugv_user',
  THEME: 'jntugv_theme',
  LANGUAGE: 'jntugv_language',
};

// Theme
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

// Breakpoints (Tailwind default)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
};

export default {
  API_ENDPOINTS,
  USER_ROLES,
  DIFFICULTY_LEVELS,
  COURSE_CATEGORIES,
  PAYMENT_STATUS,
  CERTIFICATION_STATUS,
  ENROLLMENT_STATUS,
  GENDER_OPTIONS,
  CONTENT_TYPES,
  CURRENCY,
  DATE_FORMATS,
  TOAST_TYPES,
  MODAL_SIZES,
  BUTTON_VARIANTS,
  BUTTON_SIZES,
  LOADING_STATES,
  PAGINATION,
  FILE_UPLOAD,
  REGEX_PATTERNS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROUTES,
  STORAGE_KEYS,
  THEMES,
  BREAKPOINTS,
};
