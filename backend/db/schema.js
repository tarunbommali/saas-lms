import { sql } from 'drizzle-orm';
import {
  boolean,
  datetime,
  double,
  int,
  json,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';

const uuidPrimary = (name) =>
  varchar(name, 36)
    .notNull()
    .default(sql`(UUID())`);

const withTimestamps = () => ({
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const users = mysqlTable('users', {
  id: uuidPrimary('id').primaryKey(),
  email: varchar('email', 191).notNull().unique(),
  password: text('password'),
  passwordResetToken: varchar('password_reset_token', 191),
  passwordResetExpires: datetime('password_reset_expires'),
  googleId: varchar('google_id', 64).unique(),
  authProvider: varchar('auth_provider', 32).notNull().default('password'),
  displayName: varchar('display_name', 191),
  photoURL: text('photo_url'),
  firstName: varchar('first_name', 191),
  lastName: varchar('last_name', 191),
  phone: varchar('phone', 32),
  college: varchar('college', 191),
  gender: varchar('gender', 32),
  dateOfBirth: datetime('date_of_birth'),
  skills: json('skills').default(sql`(JSON_ARRAY())`),
  interests: json('interests').default(sql`(JSON_ARRAY())`),
  isAdmin: boolean('is_admin').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  emailVerified: boolean('email_verified').notNull().default(false),
  notifications: json('notifications').default(
    sql`(JSON_OBJECT('email', TRUE, 'sms', FALSE, 'push', FALSE))`
  ),
  totalCoursesEnrolled: int('total_courses_enrolled').notNull().default(0),
  totalCoursesCompleted: int('total_courses_completed').notNull().default(0),
  learningStreak: int('learning_streak').notNull().default(0),
  lastLoginAt: datetime('last_login_at'),
  ...withTimestamps(),
});

export const courses = mysqlTable('courses', {
  id: uuidPrimary('id').primaryKey(),
  title: varchar('title', 255).notNull(),
  description: text('description'),
  shortDescription: text('short_description'),
  instructor: varchar('instructor', 191),
  instructorBio: text('instructor_bio'),
  thumbnail: text('thumbnail'),
  bannerImage: text('banner_image'),
  previewVideo: text('preview_video'),
  price: int('price').notNull(),
  originalPrice: int('original_price'),
  currency: varchar('currency', 16).notNull().default('INR'),
  duration: double('duration'),
  difficulty: varchar('difficulty', 64).notNull().default('beginner'),
  language: varchar('language', 64).notNull().default('English'),
  category: varchar('category', 191),
  modules: json('modules').default(sql`(JSON_ARRAY())`),
  requirements: json('requirements').default(sql`(JSON_ARRAY())`),
  whatYouLearn: json('what_you_learn').default(sql`(JSON_ARRAY())`),
  contentAccessURL: text('content_access_url'),
  contentDescription: text('content_description'),
  totalEnrollments: int('total_enrollments').notNull().default(0),
  averageRating: double('average_rating').notNull().default(0),
  totalRatings: int('total_ratings').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(false),
  isFeatured: boolean('is_featured').notNull().default(false),
  isBestseller: boolean('is_bestseller').notNull().default(false),
  status: varchar('status', 64).notNull().default('draft'),
  contentType: varchar('content_type', 32).notNull().default('modules'),
  tags: json('tags').default(sql`(JSON_ARRAY())`),
  metaDescription: text('meta_description'),
  slug: varchar('slug', 255),
  publishedAt: datetime('published_at'),
  createdBy: varchar('created_by', 36).references(() => users.id),
  ...withTimestamps(),
});

export const enrollments = mysqlTable('enrollments', {
  id: uuidPrimary('id').primaryKey(),
  userId: varchar('user_id', 36)
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: varchar('course_id', 36)
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  courseTitle: varchar('course_title', 255),
  status: varchar('status', 64).notNull().default('PENDING'),
  enrolledAt: datetime('enrolled_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: datetime('completed_at'),
  paymentId: varchar('payment_id', 191),
  amount: int('amount'),
  currency: varchar('currency', 16),
  couponCode: varchar('coupon_code', 64),
  couponDiscount: int('coupon_discount').notNull().default(0),
  billingInfo: json('billing_info'),
  progress: json('progress').default(
    sql`(JSON_OBJECT(
      'modulesCompleted', 0,
      'totalModules', 0,
      'completionPercentage', 0,
  'lastAccessedAt', DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%sZ'),
      'timeSpent', 0
    ))`
  ),
  moduleProgress: json('module_progress').default(sql`(JSON_ARRAY())`),
  taskProgress: json('task_progress').default(sql`(JSON_OBJECT(
    'totalTasks', 0,
    'completedTasks', 0,
    'completionPercentage', 0,
    'validated', FALSE,
    'manualNotes', NULL,
    'validatedAt', NULL,
    'validatedBy', NULL
  ))`),
  certificateIssued: boolean('certificate_issued').notNull().default(false),
  certificateDownloadable: boolean('certificate_downloadable').notNull().default(false),
  certificateUrl: text('certificate_url'),
  certificateIssuedAt: datetime('certificate_issued_at'),
  certificateUnlockedAt: datetime('certificate_unlocked_at'),
  ...withTimestamps(),
});

export const certifications = mysqlTable('certifications', {
  id: uuidPrimary('id').primaryKey(),
  userId: varchar('user_id', 36)
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: varchar('course_id', 36)
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  enrollmentId: varchar('enrollment_id', 36).references(() => enrollments.id, { onDelete: 'set null' }),
  status: varchar('status', 32).notNull().default('PENDING'),
  overallScore: double('overall_score').notNull().default(0),
  completionPercentage: double('completion_percentage').notNull().default(0),
  taskProgress: json('task_progress').default(sql`(JSON_OBJECT(
    'totalTasks', 0,
    'completedTasks', 0,
    'completionPercentage', 0,
    'validated', FALSE,
    'manualNotes', NULL,
    'validatedAt', NULL,
    'validatedBy', NULL
  ))`),
  validated: boolean('validated').notNull().default(false),
  reviewerNotes: text('reviewer_notes'),
  certificateUrl: text('certificate_url'),
  issuedAt: datetime('issued_at'),
  expiresAt: datetime('expires_at'),
  issuedBy: varchar('issued_by', 191),
  reviewedBy: varchar('reviewed_by', 191),
  reviewedAt: datetime('reviewed_at'),
  metadata: json('metadata').default(sql`(JSON_OBJECT())`),
  ...withTimestamps(),
});

export const payments = mysqlTable('payments', {
  id: uuidPrimary('id').primaryKey(),
  paymentId: varchar('payment_id', 191).notNull().unique(),
  orderId: varchar('order_id', 191),
  enrollmentId: varchar('enrollment_id', 36).references(() => enrollments.id),
  userId: varchar('user_id', 36).notNull().references(() => users.id),
  courseId: varchar('course_id', 36).notNull().references(() => courses.id),
  courseTitle: varchar('course_title', 255),
  amount: int('amount').notNull(),
  currency: varchar('currency', 16).notNull().default('INR'),
  status: varchar('status', 64).notNull().default('created'),
  razorpayData: json('razorpay_data'),
  couponCode: varchar('coupon_code', 64),
  couponDiscount: int('coupon_discount').notNull().default(0),
  pricing: json('pricing'),
  capturedAt: datetime('captured_at'),
  refundedAt: datetime('refunded_at'),
  refund: json('refund'),
  ...withTimestamps(),
});

export const coupons = mysqlTable('coupons', {
  id: uuidPrimary('id').primaryKey(),
  code: varchar('code', 64).notNull().unique(),
  name: varchar('name', 191).notNull(),
  description: text('description'),
  type: varchar('type', 32).notNull(),
  value: int('value').notNull(),
  minOrderAmount: int('min_order_amount').notNull().default(0),
  maxDiscountAmount: int('max_discount_amount'),
  usageLimit: int('usage_limit'),
  usedCount: int('used_count').notNull().default(0),
  usageLimitPerUser: int('usage_limit_per_user').notNull().default(1),
  validFrom: datetime('valid_from').notNull().default(sql`CURRENT_TIMESTAMP`),
  validUntil: datetime('valid_until'),
  isActive: boolean('is_active').notNull().default(true),
  applicableCourses: json('applicable_courses').default(sql`(JSON_ARRAY())`),
  applicableCategories: json('applicable_categories').default(sql`(JSON_ARRAY())`),
  createdBy: varchar('created_by', 36).references(() => users.id),
  totalDiscountGiven: int('total_discount_given').notNull().default(0),
  totalOrders: int('total_orders').notNull().default(0),
  ...withTimestamps(),
});

// =====================================================
// LMS Schema - Modules, Quizzes, Progress Tracking
// =====================================================

/**
 * Course Modules - Standalone modules for structured learning
 */
export const courseModules = mysqlTable('course_modules', {
  id: uuidPrimary('id').primaryKey(),
  courseId: varchar('course_id', 36)
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar('title', 255).notNull(),
  description: text('description'),
  summary: text('summary'),
  orderIndex: int('order_index').notNull().default(1),
  duration: int('duration_minutes').default(0), // Duration in minutes
  contentType: varchar('content_type', 32).notNull().default('video'), // video, text, quiz, assignment
  contentUrl: text('content_url'), // URL for video/resource
  contentData: json('content_data'), // Additional content data
  isFreePreview: boolean('is_free_preview').notNull().default(false),
  isPublished: boolean('is_published').notNull().default(false),
  requiresPreviousCompletion: boolean('requires_previous_completion').notNull().default(true), // Gated learning
  passingScore: int('passing_score').default(70), // For quizzes
  resources: json('resources').default(sql`(JSON_ARRAY())`), // Additional resources
  ...withTimestamps(),
});

/**
 * Module Lessons - Individual lessons within a module
 */
export const moduleLessons = mysqlTable('module_lessons', {
  id: uuidPrimary('id').primaryKey(),
  moduleId: varchar('module_id', 36)
    .notNull()
    .references(() => courseModules.id, { onDelete: 'cascade' }),
  title: varchar('title', 255).notNull(),
  description: text('description'),
  orderIndex: int('order_index').notNull().default(1),
  duration: int('duration_minutes').default(0),
  contentType: varchar('content_type', 32).notNull().default('video'), // video, text, document, quiz
  contentUrl: text('content_url'),
  contentData: json('content_data'),
  isFreePreview: boolean('is_free_preview').notNull().default(false),
  isPublished: boolean('is_published').notNull().default(false),
  ...withTimestamps(),
});

/**
 * Quizzes - Quiz definitions linked to modules or courses
 */
export const quizzes = mysqlTable('quizzes', {
  id: uuidPrimary('id').primaryKey(),
  courseId: varchar('course_id', 36)
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  moduleId: varchar('module_id', 36)
    .references(() => courseModules.id, { onDelete: 'cascade' }), // Optional: quiz can be course-level or module-level
  title: varchar('title', 255).notNull(),
  description: text('description'),
  instructions: text('instructions'),
  passingScore: int('passing_score').notNull().default(70), // Percentage
  timeLimit: int('time_limit_minutes'), // NULL = no time limit
  maxAttempts: int('max_attempts'), // NULL = unlimited
  shuffleQuestions: boolean('shuffle_questions').notNull().default(false),
  shuffleOptions: boolean('shuffle_options').notNull().default(false),
  showCorrectAnswers: boolean('show_correct_answers').notNull().default(true), // Show after submission
  showScore: boolean('show_score').notNull().default(true),
  isRequired: boolean('is_required').notNull().default(true), // Required to pass module
  isPublished: boolean('is_published').notNull().default(false),
  orderIndex: int('order_index').notNull().default(1),
  totalQuestions: int('total_questions').notNull().default(0),
  totalPoints: int('total_points').notNull().default(0),
  ...withTimestamps(),
});

/**
 * Quiz Questions - Individual questions for quizzes
 */
export const quizQuestions = mysqlTable('quiz_questions', {
  id: uuidPrimary('id').primaryKey(),
  quizId: varchar('quiz_id', 36)
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  questionType: varchar('question_type', 32).notNull().default('multiple_choice'), // multiple_choice, true_false, short_answer, multiple_select
  options: json('options').default(sql`(JSON_ARRAY())`), // Array of options for MCQ
  correctAnswer: text('correct_answer').notNull(), // Single answer or JSON for multiple
  explanation: text('explanation'), // Explanation shown after answer
  points: int('points').notNull().default(1),
  orderIndex: int('order_index').notNull().default(1),
  difficulty: varchar('difficulty', 32).default('medium'), // easy, medium, hard
  tags: json('tags').default(sql`(JSON_ARRAY())`),
  isActive: boolean('is_active').notNull().default(true),
  ...withTimestamps(),
});

/**
 * Quiz Attempts - User attempts at quizzes
 */
export const quizAttempts = mysqlTable('quiz_attempts', {
  id: uuidPrimary('id').primaryKey(),
  quizId: varchar('quiz_id', 36)
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', 36)
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  enrollmentId: varchar('enrollment_id', 36)
    .references(() => enrollments.id, { onDelete: 'set null' }),
  attemptNumber: int('attempt_number').notNull().default(1),
  status: varchar('status', 32).notNull().default('in_progress'), // in_progress, completed, timed_out, abandoned
  score: double('score').default(0), // Percentage score
  pointsEarned: int('points_earned').default(0),
  totalPoints: int('total_points').default(0),
  correctAnswers: int('correct_answers').default(0),
  totalQuestions: int('total_questions').default(0),
  passed: boolean('passed').notNull().default(false),
  answers: json('answers').default(sql`(JSON_OBJECT())`), // {questionId: userAnswer}
  questionResults: json('question_results').default(sql`(JSON_ARRAY())`), // Detailed results per question
  timeSpentSeconds: int('time_spent_seconds').default(0),
  startedAt: datetime('started_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  submittedAt: datetime('submitted_at'),
  gradedAt: datetime('graded_at'),
  gradedBy: varchar('graded_by', 36), // For manual grading
  feedback: text('feedback'),
  ...withTimestamps(),
});

/**
 * User Module Progress - Detailed progress per module
 */
export const userModuleProgress = mysqlTable('user_module_progress', {
  id: uuidPrimary('id').primaryKey(),
  userId: varchar('user_id', 36)
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: varchar('course_id', 36)
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  moduleId: varchar('module_id', 36)
    .notNull()
    .references(() => courseModules.id, { onDelete: 'cascade' }),
  enrollmentId: varchar('enrollment_id', 36)
    .references(() => enrollments.id, { onDelete: 'set null' }),
  status: varchar('status', 32).notNull().default('not_started'), // not_started, in_progress, completed, locked
  progressPercentage: double('progress_percentage').notNull().default(0),
  isUnlocked: boolean('is_unlocked').notNull().default(false),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: datetime('completed_at'),
  lastAccessedAt: datetime('last_accessed_at'),
  timeSpentMinutes: int('time_spent_minutes').notNull().default(0),
  quizScore: double('quiz_score'), // Best quiz score for this module
  quizPassed: boolean('quiz_passed').notNull().default(false),
  quizAttempts: int('quiz_attempts').notNull().default(0),
  ...withTimestamps(),
});

/**
 * User Lesson Progress - Detailed progress per lesson
 */
export const userLessonProgress = mysqlTable('user_lesson_progress', {
  id: uuidPrimary('id').primaryKey(),
  userId: varchar('user_id', 36)
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  moduleId: varchar('module_id', 36)
    .notNull()
    .references(() => courseModules.id, { onDelete: 'cascade' }),
  lessonId: varchar('lesson_id', 36)
    .notNull()
    .references(() => moduleLessons.id, { onDelete: 'cascade' }),
  enrollmentId: varchar('enrollment_id', 36)
    .references(() => enrollments.id, { onDelete: 'set null' }),
  status: varchar('status', 32).notNull().default('not_started'), // not_started, in_progress, completed
  progressPercentage: double('progress_percentage').notNull().default(0),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: datetime('completed_at'),
  lastAccessedAt: datetime('last_accessed_at'),
  lastPosition: int('last_position').default(0), // For videos: last watched position in seconds
  timeSpentMinutes: int('time_spent_minutes').notNull().default(0),
  notes: text('notes'), // User's notes for this lesson
  ...withTimestamps(),
});
