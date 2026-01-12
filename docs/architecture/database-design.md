# Database Design - Enterprise-Scale LMS

## Overview

This document describes the database architecture for a large-scale Learning Management System designed to support **millions of users**, **thousands of concurrent sessions**, and **petabytes of content**.

## Design Principles

### 1. Scalability
- **Horizontal partitioning** (sharding) for large tables
- **Read replicas** for query distribution
- **Caching layer** (Redis) for hot data
- **Archive strategy** for historical data

### 2. Performance
- **Optimized indexes** for common queries
- **Denormalization** where appropriate
- **Materialized views** for complex aggregations
- **Partitioning** by date/region

### 3. Reliability
- **ACID compliance** for critical transactions
- **Soft deletes** for data recovery
- **Audit trails** for compliance
- **Backup and replication**

### 4. Security
- **Encryption at rest** and in transit
- **Row-level security** for multi-tenancy
- **PII data isolation**
- **Access control** via database roles

---

## Database Architecture

### Multi-Database Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼─────┐ ┌───────▼────────┐
│  Primary DB    │ │ Analytics│ │  Archive DB    │
│  (MySQL 8)     │ │ (TimescaleDB)│ (S3/Glacier) │
│                │ │          │ │                │
│ - Users        │ │ - Events │ │ - Old courses  │
│ - Courses      │ │ - Metrics│ │ - Completed    │
│ - Enrollments  │ │ - Logs   │ │   enrollments  │
└────────────────┘ └──────────┘ └────────────────┘
        │
┌───────▼────────┐
│  Read Replicas │
│  (3+ instances)│
└────────────────┘
```

### Sharding Strategy

**Shard by User ID** for user-centric tables:
```
Shard 1: Users 0-999,999
Shard 2: Users 1M-1.999M
Shard 3: Users 2M-2.999M
...
```

**Shard by Course ID** for course-centric tables:
```
Shard 1: Courses 0-9,999
Shard 2: Courses 10K-19,999
...
```

---

## Core Schema

### 1. Users & Authentication

#### users
```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) UNIQUE NOT NULL,  -- Public identifier
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    avatar_url VARCHAR(500),
    bio TEXT,
    
    -- Metadata
    role ENUM('student', 'instructor', 'admin', 'super_admin') DEFAULT 'student',
    status ENUM('active', 'suspended', 'deleted', 'pending') DEFAULT 'pending',
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en',
    
    -- Tracking
    last_login_at TIMESTAMP NULL,
    last_login_ip VARCHAR(45),
    login_count INT UNSIGNED DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,  -- Soft delete
    
    -- Indexes
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_at (deleted_at),
    FULLTEXT INDEX idx_fulltext_name (first_name, last_name, display_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partition by creation year for archival
ALTER TABLE users PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

#### user_profiles
```sql
-- Extended profile information (1-to-1 with users)
CREATE TABLE user_profiles (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    
    -- Personal Information
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other', 'prefer_not_to_say'),
    phone VARCHAR(20),
    country_code CHAR(2),  -- ISO 3166-1 alpha-2
    
    -- Professional
    occupation VARCHAR(100),
    organization VARCHAR(200),
    job_title VARCHAR(100),
    
    -- Education
    education_level ENUM('high_school', 'bachelors', 'masters', 'phd', 'other'),
    field_of_study VARCHAR(100),
    
    -- Social Links
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    twitter_handle VARCHAR(100),
    website_url VARCHAR(500),
    
    -- Preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    
    -- Privacy
    profile_visibility ENUM('public', 'private', 'connections_only') DEFAULT 'public',
    show_email BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_country (country_code),
    INDEX idx_occupation (occupation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### user_sessions
```sql
-- Active user sessions (stored in Redis for performance)
-- This is the SQL schema for backup/analytics
CREATE TABLE user_sessions (
    id CHAR(64) PRIMARY KEY,  -- Session token hash
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Session Data
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type ENUM('desktop', 'mobile', 'tablet', 'other'),
    browser VARCHAR(50),
    os VARCHAR(50),
    
    -- Location
    country_code CHAR(2),
    city VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_last_activity (last_activity_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### user_oauth_providers
```sql
-- OAuth provider connections
CREATE TABLE user_oauth_providers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    
    provider ENUM('google', 'microsoft', 'github', 'linkedin', 'facebook') NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    
    -- OAuth Data
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP NULL,
    
    -- Profile Data
    provider_data JSON,  -- Store full profile
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider_user (provider, provider_user_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. Courses & Content

#### courses
```sql
CREATE TABLE courses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) UNIQUE NOT NULL,
    
    -- Basic Information
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    subtitle VARCHAR(500),
    description TEXT,
    
    -- Content
    learning_objectives JSON,  -- Array of objectives
    prerequisites JSON,        -- Array of prerequisites
    target_audience TEXT,
    
    -- Media
    thumbnail_url VARCHAR(500),
    promo_video_url VARCHAR(500),
    
    -- Categorization
    category_id INT UNSIGNED,
    subcategory_id INT UNSIGNED,
    tags JSON,  -- Array of tags
    
    -- Difficulty & Duration
    difficulty_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'beginner',
    estimated_duration_hours DECIMAL(6,2),  -- Total course hours
    
    -- Pricing
    price DECIMAL(10,2) DEFAULT 0.00,
    currency CHAR(3) DEFAULT 'INR',
    discount_price DECIMAL(10,2) NULL,
    is_free BOOLEAN DEFAULT FALSE,
    
    -- Instructor
    instructor_id BIGINT UNSIGNED NOT NULL,
    co_instructors JSON,  -- Array of user IDs
    
    -- Status & Publishing
    status ENUM('draft', 'review', 'published', 'archived') DEFAULT 'draft',
    published_at TIMESTAMP NULL,
    
    -- Features
    has_certificate BOOLEAN DEFAULT TRUE,
    has_quizzes BOOLEAN DEFAULT FALSE,
    has_assignments BOOLEAN DEFAULT FALSE,
    has_discussions BOOLEAN DEFAULT TRUE,
    
    -- Language & Accessibility
    language VARCHAR(10) DEFAULT 'en',
    has_subtitles BOOLEAN DEFAULT FALSE,
    subtitle_languages JSON,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords JSON,
    
    -- Statistics (denormalized for performance)
    enrollment_count INT UNSIGNED DEFAULT 0,
    completion_count INT UNSIGNED DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INT UNSIGNED DEFAULT 0,
    view_count INT UNSIGNED DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (instructor_id) REFERENCES users(id),
    INDEX idx_slug (slug),
    INDEX idx_category (category_id),
    INDEX idx_instructor (instructor_id),
    INDEX idx_status (status),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_price (price),
    INDEX idx_published_at (published_at),
    INDEX idx_rating (average_rating),
    FULLTEXT INDEX idx_fulltext_search (title, subtitle, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partition by status for query optimization
ALTER TABLE courses PARTITION BY LIST COLUMNS(status) (
    PARTITION p_draft VALUES IN ('draft'),
    PARTITION p_review VALUES IN ('review'),
    PARTITION p_published VALUES IN ('published'),
    PARTITION p_archived VALUES IN ('archived')
);
```

#### course_categories
```sql
CREATE TABLE course_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id INT UNSIGNED NULL,
    
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(7),  -- Hex color
    
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES course_categories(id) ON DELETE SET NULL,
    INDEX idx_parent (parent_id),
    INDEX idx_slug (slug),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### course_modules
```sql
CREATE TABLE course_modules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id BIGINT UNSIGNED NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    display_order INT DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    
    -- Duration
    estimated_duration_minutes INT UNSIGNED,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_id (course_id),
    INDEX idx_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### module_lessons
```sql
CREATE TABLE module_lessons (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module_id BIGINT UNSIGNED NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Content Type
    type ENUM('video', 'article', 'quiz', 'assignment', 'live_session', 'download') NOT NULL,
    
    -- Content URLs
    video_url VARCHAR(500),
    video_duration_seconds INT UNSIGNED,
    video_provider ENUM('youtube', 'vimeo', 'aws_s3', 'custom'),
    
    article_content LONGTEXT,
    
    file_url VARCHAR(500),
    file_size_bytes BIGINT UNSIGNED,
    file_type VARCHAR(50),
    
    -- Settings
    is_free_preview BOOLEAN DEFAULT FALSE,
    is_downloadable BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    
    display_order INT DEFAULT 0,
    
    -- Completion Criteria
    min_watch_percentage INT DEFAULT 80,  -- For videos
    min_read_time_seconds INT,  -- For articles
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
    INDEX idx_module_id (module_id),
    INDEX idx_type (type),
    INDEX idx_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3. Enrollments & Progress

#### enrollments
```sql
-- Sharded by user_id for scalability
CREATE TABLE enrollments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    course_id BIGINT UNSIGNED NOT NULL,
    
    -- Enrollment Details
    enrollment_type ENUM('free', 'paid', 'gifted', 'scholarship') DEFAULT 'free',
    payment_id BIGINT UNSIGNED NULL,
    
    -- Status
    status ENUM('active', 'completed', 'expired', 'refunded', 'cancelled') DEFAULT 'active',
    
    -- Progress (denormalized for performance)
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    completed_lessons INT UNSIGNED DEFAULT 0,
    total_lessons INT UNSIGNED,
    
    -- Time Tracking
    total_watch_time_seconds BIGINT UNSIGNED DEFAULT 0,
    last_accessed_at TIMESTAMP NULL,
    
    -- Completion
    completed_at TIMESTAMP NULL,
    certificate_issued_at TIMESTAMP NULL,
    certificate_id BIGINT UNSIGNED NULL,
    
    -- Validity
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,  -- For time-limited courses
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (user_id, course_id),
    INDEX idx_user_id (user_id),
    INDEX idx_course_id (course_id),
    INDEX idx_status (status),
    INDEX idx_enrolled_at (enrolled_at),
    INDEX idx_progress (progress_percentage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partition by enrollment year
ALTER TABLE enrollments PARTITION BY RANGE (YEAR(enrolled_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

#### lesson_progress
```sql
-- Tracks individual lesson completion
CREATE TABLE lesson_progress (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    lesson_id BIGINT UNSIGNED NOT NULL,
    enrollment_id BIGINT UNSIGNED NOT NULL,
    
    -- Progress
    status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Video Progress
    last_position_seconds INT UNSIGNED DEFAULT 0,
    watch_time_seconds INT UNSIGNED DEFAULT 0,
    
    -- Completion
    completed_at TIMESTAMP NULL,
    
    -- Notes
    user_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES module_lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_lesson (user_id, lesson_id),
    INDEX idx_enrollment_id (enrollment_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 4. Quizzes & Assessments

#### quizzes
```sql
CREATE TABLE quizzes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id BIGINT UNSIGNED NOT NULL,
    module_id BIGINT UNSIGNED NULL,
    lesson_id BIGINT UNSIGNED NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    
    -- Settings
    quiz_type ENUM('practice', 'graded', 'final_exam') DEFAULT 'practice',
    time_limit_minutes INT UNSIGNED NULL,
    passing_score_percentage DECIMAL(5,2) DEFAULT 70.00,
    max_attempts INT UNSIGNED NULL,  -- NULL = unlimited
    
    -- Question Settings
    total_questions INT UNSIGNED,
    questions_per_attempt INT UNSIGNED,  -- For randomized quizzes
    shuffle_questions BOOLEAN DEFAULT TRUE,
    shuffle_options BOOLEAN DEFAULT TRUE,
    
    -- Feedback
    show_correct_answers BOOLEAN DEFAULT TRUE,
    show_answers_after ENUM('immediately', 'after_submission', 'after_deadline', 'never') DEFAULT 'after_submission',
    
    -- Availability
    available_from TIMESTAMP NULL,
    available_until TIMESTAMP NULL,
    
    is_published BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_id (course_id),
    INDEX idx_type (quiz_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### quiz_questions
```sql
CREATE TABLE quiz_questions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    quiz_id BIGINT UNSIGNED NOT NULL,
    
    question_text TEXT NOT NULL,
    question_type ENUM('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank') NOT NULL,
    
    -- Options (for multiple choice)
    options JSON,  -- Array of options
    correct_answer JSON,  -- Array of correct option indexes or text
    
    -- Scoring
    points DECIMAL(5,2) DEFAULT 1.00,
    
    -- Explanation
    explanation TEXT,
    
    -- Media
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    
    display_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    INDEX idx_quiz_id (quiz_id),
    INDEX idx_type (question_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### quiz_attempts
```sql
CREATE TABLE quiz_attempts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    quiz_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    enrollment_id BIGINT UNSIGNED NOT NULL,
    
    attempt_number INT UNSIGNED NOT NULL,
    
    -- Answers
    answers JSON,  -- Array of {question_id, answer, is_correct, points}
    
    -- Scoring
    total_points DECIMAL(8,2),
    earned_points DECIMAL(8,2),
    percentage DECIMAL(5,2),
    passed BOOLEAN,
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    time_taken_seconds INT UNSIGNED,
    
    -- Status
    status ENUM('in_progress', 'submitted', 'graded', 'expired') DEFAULT 'in_progress',
    
    -- Grading (for manual grading)
    graded_by BIGINT UNSIGNED NULL,
    graded_at TIMESTAMP NULL,
    feedback TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attempt (quiz_id, user_id, attempt_number),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_submitted_at (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5. Payments & Transactions

#### payments
```sql
CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    course_id BIGINT UNSIGNED NOT NULL,
    
    -- Payment Details
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'INR',
    
    -- Discounts
    original_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    coupon_code VARCHAR(50),
    
    -- Payment Gateway
    payment_gateway ENUM('razorpay', 'stripe', 'paypal', 'manual') NOT NULL,
    gateway_transaction_id VARCHAR(255),
    gateway_order_id VARCHAR(255),
    
    -- Payment Method
    payment_method ENUM('card', 'upi', 'netbanking', 'wallet', 'emi') NOT NULL,
    
    -- Status
    status ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled') DEFAULT 'pending',
    
    -- Metadata
    payment_metadata JSON,  -- Store gateway response
    
    -- Refund
    refund_amount DECIMAL(10,2) NULL,
    refund_reason TEXT,
    refunded_at TIMESTAMP NULL,
    refunded_by BIGINT UNSIGNED NULL,
    
    -- Invoice
    invoice_number VARCHAR(50) UNIQUE,
    invoice_url VARCHAR(500),
    
    -- Timestamps
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    INDEX idx_user_id (user_id),
    INDEX idx_course_id (course_id),
    INDEX idx_status (status),
    INDEX idx_gateway_transaction (gateway_transaction_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partition by payment year for compliance/archival
ALTER TABLE payments PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

#### coupons
```sql
CREATE TABLE coupons (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Discount
    discount_type ENUM('percentage', 'fixed_amount') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2) NULL,  -- For percentage discounts
    
    -- Applicability
    applicable_to ENUM('all_courses', 'specific_courses', 'categories') DEFAULT 'all_courses',
    course_ids JSON,  -- Array of course IDs
    category_ids JSON,  -- Array of category IDs
    
    -- Usage Limits
    max_uses INT UNSIGNED NULL,  -- NULL = unlimited
    max_uses_per_user INT UNSIGNED DEFAULT 1,
    current_uses INT UNSIGNED DEFAULT 0,
    
    -- Validity
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NULL,
    
    -- Minimum Purchase
    min_purchase_amount DECIMAL(10,2) DEFAULT 0.00,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_code (code),
    INDEX idx_active (is_active),
    INDEX idx_valid_until (valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 6. Certificates

#### certificates
```sql
CREATE TABLE certificates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    course_id BIGINT UNSIGNED NOT NULL,
    enrollment_id BIGINT UNSIGNED NOT NULL,
    
    -- Certificate Details
    certificate_number VARCHAR(50) UNIQUE NOT NULL,
    verification_code CHAR(32) UNIQUE NOT NULL,
    
    -- Content
    student_name VARCHAR(255) NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    instructor_name VARCHAR(255),
    
    -- Completion Details
    completion_date DATE NOT NULL,
    grade DECIMAL(5,2),  -- Final grade
    
    -- Files
    pdf_url VARCHAR(500),
    pdf_generated_at TIMESTAMP NULL,
    
    -- Verification
    is_verified BOOLEAN DEFAULT TRUE,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Blockchain (for future)
    blockchain_hash VARCHAR(255),
    blockchain_verified BOOLEAN DEFAULT FALSE,
    
    -- Revocation
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    revoked_by BIGINT UNSIGNED NULL,
    revocation_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
    UNIQUE KEY unique_user_course (user_id, course_id),
    INDEX idx_certificate_number (certificate_number),
    INDEX idx_verification_code (verification_code),
    INDEX idx_completion_date (completion_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 7. Reviews & Ratings

#### course_reviews
```sql
CREATE TABLE course_reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    enrollment_id BIGINT UNSIGNED NOT NULL,
    
    -- Rating
    rating TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
    
    -- Review
    title VARCHAR(255),
    review_text TEXT,
    
    -- Detailed Ratings
    content_rating TINYINT UNSIGNED CHECK (content_rating BETWEEN 1 AND 5),
    instructor_rating TINYINT UNSIGNED CHECK (instructor_rating BETWEEN 1 AND 5),
    value_rating TINYINT UNSIGNED CHECK (value_rating BETWEEN 1 AND 5),
    
    -- Engagement
    helpful_count INT UNSIGNED DEFAULT 0,
    not_helpful_count INT UNSIGNED DEFAULT 0,
    
    -- Status
    status ENUM('pending', 'approved', 'rejected', 'flagged') DEFAULT 'pending',
    moderated_by BIGINT UNSIGNED NULL,
    moderated_at TIMESTAMP NULL,
    moderation_notes TEXT,
    
    -- Response
    instructor_response TEXT,
    responded_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_course_review (user_id, course_id),
    INDEX idx_course_id (course_id),
    INDEX idx_rating (rating),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 8. Analytics & Events (TimescaleDB)

#### user_events
```sql
-- Store in TimescaleDB for time-series data
CREATE TABLE user_events (
    time TIMESTAMPTZ NOT NULL,
    user_id BIGINT NOT NULL,
    
    -- Event Details
    event_type VARCHAR(50) NOT NULL,  -- 'page_view', 'video_play', 'quiz_start', etc.
    event_category VARCHAR(50),
    event_action VARCHAR(50),
    event_label VARCHAR(255),
    
    -- Context
    course_id BIGINT,
    lesson_id BIGINT,
    quiz_id BIGINT,
    
    -- Session
    session_id VARCHAR(64),
    
    -- Device & Location
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50),
    ip_address INET,
    country_code CHAR(2),
    
    -- Additional Data
    properties JSONB,
    
    PRIMARY KEY (time, user_id, event_type)
);

-- Create hypertable for time-series optimization
SELECT create_hypertable('user_events', 'time');

-- Create indexes
CREATE INDEX idx_user_events_user_id ON user_events (user_id, time DESC);
CREATE INDEX idx_user_events_type ON user_events (event_type, time DESC);
CREATE INDEX idx_user_events_course ON user_events (course_id, time DESC) WHERE course_id IS NOT NULL;
```

---

## Advanced Features

### 1. Full-Text Search (Elasticsearch)

```json
// Course index mapping
{
  "mappings": {
    "properties": {
      "id": { "type": "long" },
      "title": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "description": { "type": "text" },
      "instructor_name": { "type": "text" },
      "category": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "price": { "type": "float" },
      "rating": { "type": "float" },
      "enrollment_count": { "type": "integer" },
      "created_at": { "type": "date" }
    }
  }
}
```

### 2. Caching Strategy (Redis)

```javascript
// Cache keys structure
user:{user_id}:profile          // TTL: 1 hour
course:{course_id}:details      // TTL: 30 minutes
course:{course_id}:modules      // TTL: 30 minutes
user:{user_id}:enrollments      // TTL: 15 minutes
course:{course_id}:reviews      // TTL: 10 minutes
trending:courses                // TTL: 5 minutes
```

### 3. Message Queue (Kafka Topics)

```
enrollment.created
enrollment.completed
payment.success
payment.failed
certificate.issued
quiz.submitted
lesson.completed
user.registered
course.published
```

---

## Performance Optimization

### 1. Indexes Strategy

```sql
-- Composite indexes for common queries
CREATE INDEX idx_enrollments_user_status ON enrollments(user_id, status, enrolled_at);
CREATE INDEX idx_courses_category_rating ON courses(category_id, average_rating DESC);
CREATE INDEX idx_payments_user_status_date ON payments(user_id, status, created_at);

-- Covering indexes
CREATE INDEX idx_courses_list_covering ON courses(status, published_at, id, title, price, average_rating);
```

### 2. Materialized Views

```sql
-- Popular courses view
CREATE MATERIALIZED VIEW popular_courses AS
SELECT 
    c.id,
    c.title,
    c.thumbnail_url,
    c.price,
    c.average_rating,
    c.enrollment_count,
    c.review_count,
    cat.name as category_name
FROM courses c
LEFT JOIN course_categories cat ON c.category_id = cat.id
WHERE c.status = 'published'
ORDER BY c.enrollment_count DESC
LIMIT 100;

-- Refresh periodically
REFRESH MATERIALIZED VIEW popular_courses;
```

### 3. Query Optimization

```sql
-- Use EXPLAIN ANALYZE for query optimization
EXPLAIN ANALYZE
SELECT c.*, u.name as instructor_name
FROM courses c
JOIN users u ON c.instructor_id = u.id
WHERE c.status = 'published'
  AND c.category_id = 5
ORDER BY c.average_rating DESC
LIMIT 20;
```

---

## Backup & Recovery

### 1. Backup Strategy

```bash
# Full backup daily
mysqldump --single-transaction --routines --triggers \
  --all-databases > backup_$(date +%Y%m%d).sql

# Incremental backup (binary logs)
mysqlbinlog --start-datetime="2026-01-12 00:00:00" \
  /var/log/mysql/mysql-bin.000001 > incremental.sql

# Point-in-time recovery
mysql < backup_20260112.sql
mysql < incremental.sql
```

### 2. Replication Setup

```sql
-- Master configuration
[mysqld]
server-id=1
log-bin=mysql-bin
binlog-format=ROW
sync-binlog=1

-- Slave configuration
[mysqld]
server-id=2
relay-log=mysql-relay-bin
read-only=1
```

---

## Security Best Practices

### 1. Data Encryption

```sql
-- Encrypt sensitive columns
ALTER TABLE users 
MODIFY COLUMN email VARCHAR(255) ENCRYPTED;

-- Use TDE (Transparent Data Encryption)
ALTER INSTANCE ROTATE INNODB MASTER KEY;
```

### 2. Row-Level Security

```sql
-- Create policy for user data access
CREATE POLICY user_data_policy ON users
FOR SELECT
USING (id = CURRENT_USER_ID() OR CURRENT_USER_ROLE() = 'admin');
```

### 3. Audit Logging

```sql
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED,
    action VARCHAR(50),
    table_name VARCHAR(50),
    record_id BIGINT UNSIGNED,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_table_action (table_name, action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;
```

---

## Monitoring & Maintenance

### 1. Performance Metrics

```sql
-- Slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- Monitor table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'lms_db'
ORDER BY size_mb DESC;
```

### 2. Index Usage

```sql
-- Check unused indexes
SELECT * FROM sys.schema_unused_indexes;

-- Check duplicate indexes
SELECT * FROM sys.schema_redundant_indexes;
```

---

## Migration Strategy

### 1. Zero-Downtime Migration

```sql
-- Add new column
ALTER TABLE users ADD COLUMN new_field VARCHAR(255);

-- Backfill data
UPDATE users SET new_field = old_field WHERE new_field IS NULL;

-- Switch application to use new column

-- Drop old column
ALTER TABLE users DROP COLUMN old_field;
```

### 2. Data Archival

```sql
-- Archive old enrollments
INSERT INTO enrollments_archive
SELECT * FROM enrollments
WHERE status = 'completed'
  AND completed_at < DATE_SUB(NOW(), INTERVAL 2 YEAR);

DELETE FROM enrollments
WHERE status = 'completed'
  AND completed_at < DATE_SUB(NOW(), INTERVAL 2 YEAR);
```

---

## Scalability Roadmap

### Phase 1: Vertical Scaling (0-10K users)
- Single MySQL instance
- Redis for caching
- Regular backups

### Phase 2: Read Replicas (10K-100K users)
- Master-slave replication
- Read queries to replicas
- Write queries to master

### Phase 3: Sharding (100K-1M users)
- Shard by user_id
- Separate analytics database
- CDN for static content

### Phase 4: Multi-Region (1M+ users)
- Geographic sharding
- Multi-region replication
- Edge caching
- Microservices architecture

---

**Last Updated**: 2026-01-12  
**Version**: 2.0 - Enterprise Scale  
**Database**: MySQL 8.0, TimescaleDB, Redis, Elasticsearch
