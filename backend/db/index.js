/* eslint-disable no-console */
import mysql from 'mysql2';
import { drizzle } from 'drizzle-orm/mysql2';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import * as schema from './schema.js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

const connection = mysql.createConnection({
  host: config.db.host || 'localhost',
  user: config.db.user || 'root',
  password: config.db.password,
  database: config.db.name,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
});

connection.connect((error) => {
  if (error) {
    logger.error('Failed to connect to MySQL:', error.message);
    throw error;
  }
  logger.info('Connected to MySQL database via mysql.createConnection');
});

const createTablesStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    password TEXT,
    password_reset_token VARCHAR(191),
    password_reset_expires DATETIME,
    google_id VARCHAR(64) UNIQUE,
    auth_provider VARCHAR(32) NOT NULL DEFAULT 'password',
    display_name VARCHAR(191),
    photo_url TEXT,
    first_name VARCHAR(191),
    last_name VARCHAR(191),
    phone VARCHAR(32),
    college VARCHAR(191),
    gender VARCHAR(32),
    date_of_birth DATETIME,
    skills JSON DEFAULT (JSON_ARRAY()),
    interests JSON DEFAULT (JSON_ARRAY()),
    is_admin TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    email_verified TINYINT(1) NOT NULL DEFAULT 0,
    notifications JSON DEFAULT (JSON_OBJECT('email', TRUE, 'sms', FALSE, 'push', FALSE)),
    total_courses_enrolled INT NOT NULL DEFAULT 0,
    total_courses_completed INT NOT NULL DEFAULT 0,
    learning_streak INT NOT NULL DEFAULT 0,
    last_login_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    short_description TEXT,
    instructor VARCHAR(191),
    instructor_bio TEXT,
    thumbnail TEXT,
    banner_image TEXT,
    preview_video TEXT,
    price INT NOT NULL,
    original_price INT,
    currency VARCHAR(16) NOT NULL DEFAULT 'INR',
    duration DOUBLE,
    difficulty VARCHAR(64) NOT NULL DEFAULT 'beginner',
    language VARCHAR(64) NOT NULL DEFAULT 'English',
    category VARCHAR(191),
    modules JSON DEFAULT (JSON_ARRAY()),
    requirements JSON DEFAULT (JSON_ARRAY()),
    what_you_learn JSON DEFAULT (JSON_ARRAY()),
    content_access_url TEXT,
    content_description TEXT,
    total_enrollments INT NOT NULL DEFAULT 0,
    average_rating DOUBLE NOT NULL DEFAULT 0,
    total_ratings INT NOT NULL DEFAULT 0,
    is_published TINYINT(1) NOT NULL DEFAULT 0,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    is_bestseller TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(64) NOT NULL DEFAULT 'draft',
    content_type VARCHAR(32) NOT NULL DEFAULT 'modules',
    tags JSON DEFAULT (JSON_ARRAY()),
    meta_description TEXT,
    slug VARCHAR(255),
    published_at DATETIME,
    created_by VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS enrollments (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    course_title VARCHAR(255),
    status VARCHAR(64) NOT NULL DEFAULT 'PENDING',
    enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    payment_id VARCHAR(191),
    amount INT,
    currency VARCHAR(16),
    coupon_code VARCHAR(64),
    coupon_discount INT NOT NULL DEFAULT 0,
    billing_info JSON,
    progress JSON DEFAULT (JSON_OBJECT(
      'modulesCompleted', 0,
      'totalModules', 0,
      'completionPercentage', 0,
      'lastAccessedAt', DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%sZ'),
      'timeSpent', 0
    )),
    module_progress JSON DEFAULT (JSON_ARRAY()),
    task_progress JSON DEFAULT (JSON_OBJECT(
      'totalTasks', 0,
      'completedTasks', 0,
      'completionPercentage', 0,
      'validated', FALSE,
      'manualNotes', NULL,
      'validatedAt', NULL,
      'validatedBy', NULL
    )),
    certificate_issued TINYINT(1) NOT NULL DEFAULT 0,
    certificate_downloadable TINYINT(1) NOT NULL DEFAULT 0,
    certificate_url TEXT,
    certificate_issued_at DATETIME,
    certificate_unlocked_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_enrollments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS certifications (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    enrollment_id VARCHAR(36),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    overall_score DOUBLE NOT NULL DEFAULT 0,
    completion_percentage DOUBLE NOT NULL DEFAULT 0,
    task_progress JSON DEFAULT (JSON_OBJECT(
      'totalTasks', 0,
      'completedTasks', 0,
      'completionPercentage', 0,
      'validated', FALSE,
      'manualNotes', NULL,
      'validatedAt', NULL,
      'validatedBy', NULL
    )),
    validated TINYINT(1) NOT NULL DEFAULT 0,
    reviewer_notes TEXT,
    certificate_url TEXT,
    issued_at DATETIME,
    expires_at DATETIME,
    issued_by VARCHAR(191),
    reviewed_by VARCHAR(191),
    reviewed_at DATETIME,
    metadata JSON DEFAULT (JSON_OBJECT()),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_certifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_certifications_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_certifications_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    payment_id VARCHAR(191) NOT NULL UNIQUE,
    order_id VARCHAR(191),
    enrollment_id VARCHAR(36),
    user_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    course_title VARCHAR(255),
    amount INT NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'INR',
    status VARCHAR(64) NOT NULL DEFAULT 'created',
    razorpay_data JSON,
    coupon_code VARCHAR(64),
    coupon_discount INT NOT NULL DEFAULT 0,
    pricing JSON,
    captured_at DATETIME,
    refunded_at DATETIME,
    refund JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_payments_course FOREIGN KEY (course_id) REFERENCES courses(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(191) NOT NULL,
    description TEXT,
    type VARCHAR(32) NOT NULL,
    value INT NOT NULL,
    min_order_amount INT NOT NULL DEFAULT 0,
    max_discount_amount INT,
    usage_limit INT,
    used_count INT NOT NULL DEFAULT 0,
    usage_limit_per_user INT NOT NULL DEFAULT 1,
    valid_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_until DATETIME,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
  applicable_courses JSON DEFAULT (JSON_ARRAY()),
  applicable_categories JSON DEFAULT (JSON_ARRAY()),
    created_by VARCHAR(36),
    total_discount_given INT NOT NULL DEFAULT 0,
    total_orders INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_coupons_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS course_modules (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    summary TEXT,
    order_index INT NOT NULL DEFAULT 1,
    duration_minutes INT DEFAULT 0,
    content_type VARCHAR(32) NOT NULL DEFAULT 'video',
    content_url TEXT,
    content_data JSON,
    is_free_preview TINYINT(1) NOT NULL DEFAULT 0,
    is_published TINYINT(1) NOT NULL DEFAULT 0,
    requires_previous_completion TINYINT(1) NOT NULL DEFAULT 1,
    passing_score INT DEFAULT 70,
    resources JSON DEFAULT (JSON_ARRAY()),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_course_modules_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_modules_course_id (course_id),
    INDEX idx_course_modules_order (course_id, order_index)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS module_lessons (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    module_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT NOT NULL DEFAULT 1,
    duration_minutes INT DEFAULT 0,
    content_type VARCHAR(32) NOT NULL DEFAULT 'video',
    content_url TEXT,
    content_data JSON,
    is_free_preview TINYINT(1) NOT NULL DEFAULT 0,
    is_published TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_module_lessons_module FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
    INDEX idx_module_lessons_module_id (module_id),
    INDEX idx_module_lessons_order (module_id, order_index)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS quizzes (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    module_id VARCHAR(36),
    lesson_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    passing_score INT NOT NULL DEFAULT 70,
    time_limit_minutes INT,
    max_attempts INT,
    shuffle_questions TINYINT(1) NOT NULL DEFAULT 0,
    shuffle_options TINYINT(1) NOT NULL DEFAULT 0,
    show_correct_answers TINYINT(1) NOT NULL DEFAULT 1,
    show_score TINYINT(1) NOT NULL DEFAULT 1,
    is_required TINYINT(1) NOT NULL DEFAULT 1,
    is_published TINYINT(1) NOT NULL DEFAULT 0,
    order_index INT NOT NULL DEFAULT 1,
    total_questions INT NOT NULL DEFAULT 0,
    total_points INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_quizzes_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_quizzes_module FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
    CONSTRAINT fk_quizzes_lesson FOREIGN KEY (lesson_id) REFERENCES module_lessons(id) ON DELETE SET NULL,
    INDEX idx_quizzes_course_id (course_id),
    INDEX idx_quizzes_module_id (module_id),
    INDEX idx_quizzes_lesson_id (lesson_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS quiz_questions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    quiz_id VARCHAR(36) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(32) NOT NULL DEFAULT 'multiple_choice',
    options JSON DEFAULT (JSON_ARRAY()),
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    points INT NOT NULL DEFAULT 1,
    order_index INT NOT NULL DEFAULT 1,
    difficulty VARCHAR(32) DEFAULT 'medium',
    tags JSON DEFAULT (JSON_ARRAY()),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_quiz_questions_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    INDEX idx_quiz_questions_quiz_id (quiz_id),
    INDEX idx_quiz_questions_order (quiz_id, order_index)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS quiz_attempts (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    quiz_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    lesson_id VARCHAR(36),
    enrollment_id VARCHAR(36),
    attempt_number INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
    score DOUBLE DEFAULT 0,
    points_earned INT DEFAULT 0,
    total_points INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    passed TINYINT(1) NOT NULL DEFAULT 0,
    answers JSON DEFAULT (JSON_OBJECT()),
    question_results JSON DEFAULT (JSON_ARRAY()),
    time_spent_seconds INT DEFAULT 0,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME,
    graded_at DATETIME,
    graded_by VARCHAR(36),
    feedback TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_quiz_attempts_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    CONSTRAINT fk_quiz_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_quiz_attempts_lesson FOREIGN KEY (lesson_id) REFERENCES module_lessons(id) ON DELETE SET NULL,
    CONSTRAINT fk_quiz_attempts_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
    INDEX idx_quiz_attempts_quiz_user (quiz_id, user_id),
    INDEX idx_quiz_attempts_user (user_id),
    INDEX idx_quiz_attempts_enrollment (enrollment_id),
    INDEX idx_quiz_attempts_lesson (lesson_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS user_module_progress (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    module_id VARCHAR(36) NOT NULL,
    enrollment_id VARCHAR(36),
    status VARCHAR(32) NOT NULL DEFAULT 'not_started',
    progress_percentage DOUBLE NOT NULL DEFAULT 0,
    is_unlocked TINYINT(1) NOT NULL DEFAULT 0,
    is_completed TINYINT(1) NOT NULL DEFAULT 0,
    completed_at DATETIME,
    last_accessed_at DATETIME,
    time_spent_minutes INT NOT NULL DEFAULT 0,
    quiz_score DOUBLE,
    quiz_passed TINYINT(1) NOT NULL DEFAULT 0,
    quiz_attempts INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_module_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_module_progress_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_module_progress_module FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_module_progress_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_module_progress (user_id, module_id),
    INDEX idx_user_module_progress_user_course (user_id, course_id),
    INDEX idx_user_module_progress_enrollment (enrollment_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS user_lesson_progress (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    module_id VARCHAR(36) NOT NULL,
    lesson_id VARCHAR(36) NOT NULL,
    enrollment_id VARCHAR(36),
    status VARCHAR(32) NOT NULL DEFAULT 'not_started',
    progress_percentage DOUBLE NOT NULL DEFAULT 0,
    is_completed TINYINT(1) NOT NULL DEFAULT 0,
    completed_at DATETIME,
    last_accessed_at DATETIME,
    last_position INT DEFAULT 0,
    time_spent_minutes INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_lesson_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_lesson_progress_module FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_lesson_progress_lesson FOREIGN KEY (lesson_id) REFERENCES module_lessons(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_lesson_progress_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
    UNIQUE KEY uk_user_lesson_progress (user_id, lesson_id),
    INDEX idx_user_lesson_progress_user_module (user_id, module_id),
    INDEX idx_user_lesson_progress_enrollment (enrollment_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
];

const ensureColumnExists = async (client, tableName, columnName, columnDefinition) => {
  const [rows] = await client.query('SHOW COLUMNS FROM ?? LIKE ?', [tableName, columnName]);
  if (!rows || rows.length === 0) {
    await client.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${columnDefinition}`);
  }
};

const ensureIndexExists = async (client, tableName, indexName, indexDefinition) => {
  const [rows] = await client.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  if (!rows || rows.length === 0) {
    try {
      await client.query(`CREATE INDEX ${indexName} ON ${tableName} ${indexDefinition}`);
      logger.info(`✅ Created index ${indexName} on ${tableName}`);
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        logger.warn(`⚠️ Could not create index ${indexName} on ${tableName}:`, error.message);
      }
    }
  }
};

const ensureForeignKeyExists = async (client, tableName, constraintName, constraintDefinition) => {
  const [rows] = await client.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [tableName, constraintName]
  );

  if (!rows || rows.length === 0) {
    try {
      await client.query(`ALTER TABLE \`${tableName}\` ADD CONSTRAINT ${constraintName} ${constraintDefinition}`);
      logger.info(`✅ Added foreign key ${constraintName} on ${tableName}`);
    } catch (error) {
      if (!error.message.toLowerCase().includes('duplicate')) {
        logger.warn(`⚠️ Could not add foreign key ${constraintName} on ${tableName}:`, error.message);
      }
    }
  }
};

const createPerformanceIndexes = async (client) => {
  logger.info('📊 Creating performance indexes...');

  // Users table indexes
  await ensureIndexExists(client, 'users', 'idx_users_email', '(email)');
  await ensureIndexExists(client, 'users', 'idx_users_is_admin', '(is_admin)');
  await ensureIndexExists(client, 'users', 'idx_users_is_active', '(is_active)');
  await ensureIndexExists(client, 'users', 'idx_users_google_id', '(google_id)');

  // Courses table indexes
  await ensureIndexExists(client, 'courses', 'idx_courses_is_published', '(is_published)');
  await ensureIndexExists(client, 'courses', 'idx_courses_category', '(category)');
  await ensureIndexExists(client, 'courses', 'idx_courses_difficulty', '(difficulty)');
  await ensureIndexExists(client, 'courses', 'idx_courses_slug', '(slug)');
  await ensureIndexExists(client, 'courses', 'idx_courses_created_by', '(created_by)');
  await ensureIndexExists(client, 'courses', 'idx_courses_status', '(status)');

  // Enrollments table indexes
  await ensureIndexExists(client, 'enrollments', 'idx_enrollments_user_id', '(user_id)');
  await ensureIndexExists(client, 'enrollments', 'idx_enrollments_course_id', '(course_id)');
  await ensureIndexExists(client, 'enrollments', 'idx_enrollments_status', '(status)');
  await ensureIndexExists(client, 'enrollments', 'idx_enrollments_user_course', '(user_id, course_id)');

  // Certifications table indexes
  await ensureIndexExists(client, 'certifications', 'idx_certifications_user_id', '(user_id)');
  await ensureIndexExists(client, 'certifications', 'idx_certifications_course_id', '(course_id)');
  await ensureIndexExists(client, 'certifications', 'idx_certifications_status', '(status)');

  // Payments table indexes
  await ensureIndexExists(client, 'payments', 'idx_payments_user_id', '(user_id)');
  await ensureIndexExists(client, 'payments', 'idx_payments_course_id', '(course_id)');
  await ensureIndexExists(client, 'payments', 'idx_payments_status', '(status)');
  await ensureIndexExists(client, 'payments', 'idx_payments_order_id', '(order_id)');

  // Coupons table indexes
  await ensureIndexExists(client, 'coupons', 'idx_coupons_code', '(code)');
  await ensureIndexExists(client, 'coupons', 'idx_coupons_is_active', '(is_active)');

  logger.info('✅ Performance indexes created');
};

const initializeDatabase = async () => {
  const client = connection.promise();
  for (const statement of createTablesStatements) {
    await client.query(statement);
  }

  await ensureColumnExists(client, 'users', 'password_reset_token', 'password_reset_token VARCHAR(191)');
  await ensureColumnExists(client, 'users', 'password_reset_expires', 'password_reset_expires DATETIME');
  await ensureColumnExists(client, 'courses', 'requirements', 'requirements JSON DEFAULT (JSON_ARRAY())');
  await ensureColumnExists(client, 'courses', 'what_you_learn', 'what_you_learn JSON DEFAULT (JSON_ARRAY())');
  await ensureColumnExists(client, 'courses', 'is_bestseller', 'is_bestseller TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumnExists(client, 'courses', 'content_type', "content_type VARCHAR(32) NOT NULL DEFAULT 'modules'");
  await ensureColumnExists(client, 'courses', 'created_by', 'created_by VARCHAR(36)');
  await ensureColumnExists(client, 'courses', 'difficulty', "difficulty VARCHAR(64) NOT NULL DEFAULT 'beginner'");
  await ensureColumnExists(client, 'enrollments', 'module_progress', 'module_progress JSON DEFAULT (JSON_ARRAY())');
  await ensureColumnExists(
    client,
    'enrollments',
    'task_progress',
    "task_progress JSON DEFAULT (JSON_OBJECT('totalTasks', 0, 'completedTasks', 0, 'completionPercentage', 0, 'validated', FALSE, 'manualNotes', NULL, 'validatedAt', NULL, 'validatedBy', NULL))"
  );
  await ensureColumnExists(
    client,
    'enrollments',
    'certificate_downloadable',
    'certificate_downloadable TINYINT(1) NOT NULL DEFAULT 0'
  );
  await ensureColumnExists(client, 'enrollments', 'certificate_url', 'certificate_url TEXT');
  await ensureColumnExists(client, 'enrollments', 'certificate_issued', 'certificate_issued TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumnExists(client, 'enrollments', 'certificate_issued_at', 'certificate_issued_at DATETIME');
  await ensureColumnExists(client, 'enrollments', 'certificate_unlocked_at', 'certificate_unlocked_at DATETIME');
  await ensureColumnExists(client, 'quizzes', 'lesson_id', 'lesson_id VARCHAR(36)');
  await ensureColumnExists(client, 'quiz_attempts', 'lesson_id', 'lesson_id VARCHAR(36)');
  await ensureForeignKeyExists(
    client,
    'quizzes',
    'fk_quizzes_lesson',
    'FOREIGN KEY (lesson_id) REFERENCES module_lessons(id) ON DELETE SET NULL'
  );
  await ensureForeignKeyExists(
    client,
    'quiz_attempts',
    'fk_quiz_attempts_lesson',
    'FOREIGN KEY (lesson_id) REFERENCES module_lessons(id) ON DELETE SET NULL'
  );
  await ensureIndexExists(client, 'quizzes', 'idx_quizzes_lesson_id', '(lesson_id)');
  await ensureIndexExists(client, 'quiz_attempts', 'idx_quiz_attempts_lesson', '(lesson_id)');

  // Create performance indexes
  await createPerformanceIndexes(client);

  logger.info('✅ Database tables and indexes initialized');
};

const seedDefaultAdmin = async () => {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    logger.warn('⚠️  Skipping default admin seed. Provide ADMIN_EMAIL and ADMIN_PASSWORD env vars to auto-create an admin user.');
    return;
  }

  const client = connection.promise();
  const [existing] = await client.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing && existing.length > 0) {
    logger.info(`ℹ️  Admin user already exists for ${email}. Skipping seed.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const adminId = randomUUID();

  await client.query(
    `INSERT INTO users (
      id,
      email,
      password,
      display_name,
      first_name,
      last_name,
      is_admin,
      is_active,
      auth_provider,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      adminId,
      email.toLowerCase(),
      passwordHash,
      process.env.ADMIN_DISPLAY_NAME || 'Platform Admin',
      process.env.ADMIN_FIRST_NAME || 'Admin',
      process.env.ADMIN_LAST_NAME || '',
      1,
      1,
      'password'
    ]
  );

  logger.info(`✅ Seeded default admin user (${email}). Remember to rotate ADMIN_PASSWORD after first login.`);
};

export const db = drizzle(connection.promise(), { schema, mode: 'default' });
export const sqlConnection = connection;
export const dbReady = (async () => {
  try {
    await initializeDatabase();
    await seedDefaultAdmin();
    logger.info('✅ Database schema ready');
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  }
})();
