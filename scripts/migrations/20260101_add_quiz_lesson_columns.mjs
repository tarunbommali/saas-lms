import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = 3306,
  DB_USER = 'root',
  DB_PASSWORD = 'Disistarun@2001',
  DB_NAME = 'jntugv_certification',
} = process.env;

const MIGRATION_NAME = '20260101_add_quiz_lesson_columns';

const COLUMN_DEFINITIONS = [
  {
    table: 'quizzes',
    column: 'lesson_id',
    addColumnSql: 'ALTER TABLE `quizzes` ADD COLUMN `lesson_id` VARCHAR(36) NULL AFTER `module_id`',
    indexName: 'idx_quizzes_lesson_id',
    addIndexSql: 'ALTER TABLE `quizzes` ADD INDEX `idx_quizzes_lesson_id` (`lesson_id`)',
    constraintName: 'fk_quizzes_lesson_id',
    addConstraintSql: 'ALTER TABLE `quizzes` ADD CONSTRAINT `fk_quizzes_lesson_id` FOREIGN KEY (`lesson_id`) REFERENCES `module_lessons`(`id`) ON DELETE CASCADE',
  },
  {
    table: 'quiz_attempts',
    column: 'lesson_id',
    addColumnSql: 'ALTER TABLE `quiz_attempts` ADD COLUMN `lesson_id` VARCHAR(36) NULL AFTER `user_id`',
    indexName: 'idx_quiz_attempts_lesson_id',
    addIndexSql: 'ALTER TABLE `quiz_attempts` ADD INDEX `idx_quiz_attempts_lesson_id` (`lesson_id`)',
    constraintName: 'fk_quiz_attempts_lesson_id',
    addConstraintSql: 'ALTER TABLE `quiz_attempts` ADD CONSTRAINT `fk_quiz_attempts_lesson_id` FOREIGN KEY (`lesson_id`) REFERENCES `module_lessons`(`id`) ON DELETE SET NULL',
  },
];

async function columnExists(connection, table, column) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_NAME, table, column],
  );
  return rows[0]?.count > 0;
}

async function indexExists(connection, table, indexName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [DB_NAME, table, indexName],
  );
  return rows[0]?.count > 0;
}

async function constraintExists(connection, table, constraintName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [DB_NAME, table, constraintName],
  );
  return rows[0]?.count > 0;
}

async function runMigration() {
  console.log(`\n🚀 Running migration: ${MIGRATION_NAME}`);

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });

  try {
    for (const definition of COLUMN_DEFINITIONS) {
      const { table, column, addColumnSql, indexName, addIndexSql, constraintName, addConstraintSql } = definition;
      console.log(`\n📦 Processing table: ${table}`);

      const hasColumn = await columnExists(connection, table, column);
      if (!hasColumn) {
        console.log(`  ➕ Adding column ${column}`);
        await connection.query(addColumnSql);
      } else {
        console.log(`  ✅ Column ${column} already exists`);
      }

      if (indexName) {
        const hasIndex = await indexExists(connection, table, indexName);
        if (!hasIndex) {
          console.log(`  ➕ Adding index ${indexName}`);
          await connection.query(addIndexSql);
        } else {
          console.log(`  ✅ Index ${indexName} already exists`);
        }
      }

      if (constraintName) {
        const hasConstraint = await constraintExists(connection, table, constraintName);
        if (!hasConstraint) {
          console.log(`  ➕ Adding constraint ${constraintName}`);
          await connection.query(addConstraintSql);
        } else {
          console.log(`  ✅ Constraint ${constraintName} already exists`);
        }
      }
    }

    console.log(`\n✅ Migration ${MIGRATION_NAME} completed successfully.`);
  } catch (error) {
    console.error(`\n❌ Migration ${MIGRATION_NAME} failed:`, error);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration().catch(() => {
  process.exitCode = 1;
});
