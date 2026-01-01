/* eslint-disable no-console */
import 'dotenv/config';
import mysql from 'mysql2';
import { drizzle } from 'drizzle-orm/mysql2';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import * as schema from './schema.js';

const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASSWORD = 'Disistarun@2001',
  DB_NAME = 'jntugv_certification',
  DB_PORT,
} = process.env;

const connection = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT ? Number(DB_PORT) : undefined,
});

connection.connect((error) => {
  if (error) {
    console.error('Failed to connect to MySQL:', error.message);
    throw error;
  }
  console.log('Connected to MySQL database via mysql.createConnection');
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
];

const ensureColumnExists = async (client, tableName, columnName, columnDefinition) => {
  const [rows] = await client.query('SHOW COLUMNS FROM ?? LIKE ?', [tableName, columnName]);
  if (!rows || rows.length === 0) {
    await client.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${columnDefinition}`);
  }
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
};

const seedDefaultAdmin = async () => {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    console.warn('⚠️  Skipping default admin seed. Provide ADMIN_EMAIL and ADMIN_PASSWORD env vars to auto-create an admin user.');
    return;
  }

  const client = connection.promise();
  const [existing] = await client.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing && existing.length > 0) {
    console.log(`ℹ️  Admin user already exists for ${email}. Skipping seed.`);
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

  console.log(`✅ Seeded default admin user (${email}). Remember to rotate ADMIN_PASSWORD after first login.`);
};

export const db = drizzle(connection.promise(), { schema, mode: 'default' });
export const sqlConnection = connection;
export const dbReady = (async () => {
  try {
    await initializeDatabase();
    await seedDefaultAdmin();
    console.log('✅ Database schema ready');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
})();
