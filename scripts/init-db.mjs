import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const {
    DB_HOST = '127.0.0.1',
    DB_PORT = 3306,
    DB_USER = 'root',
    DB_PASSWORD = 'Disistarun@2001',
    DB_NAME = 'jntugv_certification',
    ADMIN_EMAIL = 'admin@jntugv.edu.in',
    ADMIN_PASSWORD = 'admin123',
    ADMIN_FIRST_NAME = 'Admin',
    ADMIN_LAST_NAME = 'User',
    ADMIN_DISPLAY_NAME = 'Platform Admin'
} = process.env;

async function initializeDatabase() {
    console.log('🚀 Starting Database Initialization...\n');

    let connection;

    try {
        // Connect without database first
        connection = await mysql.createConnection({
            host: DB_HOST,
            port: Number(DB_PORT),
            user: DB_USER,
            password: DB_PASSWORD
        });

        console.log('✅ Connected to MySQL server');

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
        console.log(`✅ Database "${DB_NAME}" created/verified\n`);

        // Switch to the database
        await connection.query(`USE \`${DB_NAME}\``);

        // Drop existing tables (in reverse order of dependencies)
        console.log('🗑️  Dropping existing tables...');
        const tablesToDrop = [
            'user_lesson_progress',
            'user_module_progress',
            'quiz_attempts',
            'quiz_questions',
            'quizzes',
            'module_lessons',
            'course_modules',
            'certifications',
            'payments',
            'enrollments',
            'coupons',
            'courses',
            'users'
        ];

        for (const table of tablesToDrop) {
            await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
        }
        console.log('✅ Existing tables dropped\n');

        // Create tables
        console.log('📊 Creating tables...\n');

        // 1. Users table
        await connection.query(`
            CREATE TABLE users (
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
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_users_email (email),
                INDEX idx_users_is_admin (is_admin),
                INDEX idx_users_is_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created table: users');

        // 2. Courses table
        await connection.query(`
            CREATE TABLE courses (
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
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_courses_is_published (is_published),
                INDEX idx_courses_category (category),
                INDEX idx_courses_difficulty (difficulty),
                INDEX idx_courses_created_by (created_by)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created table: courses');

        // 3. Coupons table
        await connection.query(`
            CREATE TABLE coupons (
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
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_coupons_code (code),
                INDEX idx_coupons_is_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created table: coupons');

        // 4. Enrollments table
        await connection.query(`
            CREATE TABLE enrollments (
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
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                INDEX idx_enrollments_user_id (user_id),
                INDEX idx_enrollments_course_id (course_id),
                INDEX idx_enrollments_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created table: enrollments');

        // 5. Payments table
        await connection.query(`
            CREATE TABLE payments (
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
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (course_id) REFERENCES courses(id),
                INDEX idx_payments_user_id (user_id),
                INDEX idx_payments_course_id (course_id),
                INDEX idx_payments_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created table: payments');

        // 6. Certifications table
        await connection.query(`
            CREATE TABLE certifications (
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
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
                INDEX idx_certifications_user_id (user_id),
                INDEX idx_certifications_course_id (course_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created table: certifications');

        // 7. Course Modules table
        await connection.query(`
            CREATE TABLE course_modules (
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
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                INDEX idx_course_modules_course_id (course_id),
                INDEX idx_course_modules_order (course_id, order_index)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created table: course_modules');

        // 8. Module Lessons table
        await connection.query(`
            CREATE TABLE module_lessons (
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
                FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
                INDEX idx_module_lessons_module_id (module_id),
                INDEX idx_module_lessons_order (module_id, order_index)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created table: module_lessons');

        // 9. Quizzes table
        await connection.query(`
            CREATE TABLE quizzes (
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
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
                FOREIGN KEY (lesson_id) REFERENCES module_lessons(id) ON DELETE CASCADE,
                INDEX idx_quizzes_course_id (course_id),
                INDEX idx_quizzes_module_id (module_id),
                INDEX idx_quizzes_lesson_id (lesson_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created table: quizzes');

        // 10. Quiz Questions table
        await connection.query(`
            CREATE TABLE quiz_questions (
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
                FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
                INDEX idx_quiz_questions_quiz_id (quiz_id),
                INDEX idx_quiz_questions_order (quiz_id, order_index)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created table: quiz_questions');

        // 11. Quiz Attempts table
        await connection.query(`
            CREATE TABLE quiz_attempts (
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
                FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (lesson_id) REFERENCES module_lessons(id) ON DELETE SET NULL,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
                INDEX idx_quiz_attempts_quiz_user (quiz_id, user_id),
                INDEX idx_quiz_attempts_user (user_id),
                INDEX idx_quiz_attempts_lesson_id (lesson_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created table: quiz_attempts');

        // 12. User Module Progress table
        await connection.query(`
            CREATE TABLE user_module_progress (
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
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
                UNIQUE KEY uk_user_module_progress (user_id, module_id),
                INDEX idx_user_module_progress_user_course (user_id, course_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created table: user_module_progress');

        // 13. User Lesson Progress table
        await connection.query(`
            CREATE TABLE user_lesson_progress (
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
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
                FOREIGN KEY (lesson_id) REFERENCES module_lessons(id) ON DELETE CASCADE,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
                UNIQUE KEY uk_user_lesson_progress (user_id, lesson_id),
                INDEX idx_user_lesson_progress_user_module (user_id, module_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Created table: user_lesson_progress');

        console.log('\n✅ All 13 tables created successfully!\n');

        // Seed admin user
        console.log('👤 Seeding admin user...');

        const adminId = randomUUID();
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

        await connection.query(`
            INSERT INTO users (
                id,
                email,
                password,
                display_name,
                first_name,
                last_name,
                is_admin,
                is_active,
                email_verified,
                auth_provider,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            adminId,
            ADMIN_EMAIL.toLowerCase(),
            hashedPassword,
            ADMIN_DISPLAY_NAME,
            ADMIN_FIRST_NAME,
            ADMIN_LAST_NAME,
            1, // is_admin
            1, // is_active
            1, // email_verified
            'password'
        ]);

        console.log('✅ Admin user created successfully!');
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
        console.log(`   ⚠️  Remember to change the password after first login!\n`);

        // Summary
        const [tables] = await connection.query('SHOW TABLES');
        const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');

        console.log('📊 Database Summary:');
        console.log(`   Database: ${DB_NAME}`);
        console.log(`   Tables: ${tables.length}`);
        console.log(`   Users: ${userCount[0].count}`);
        console.log(`   Admin Users: 1`);

        console.log('\n✨ Database initialization completed successfully!');
        console.log('\n🚀 Next steps:');
        console.log('   1. Start the backend: npm run dev:backend');
        console.log('   2. Start the frontend: npm run dev:frontend');
        console.log('   3. Login with admin credentials');

    } catch (error) {
        console.error('\n❌ Database initialization failed:');
        console.error(error.message);
        console.error('\nStack trace:');
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✅ Database connection closed');
        }
    }
}

// Run the initialization
initializeDatabase();
