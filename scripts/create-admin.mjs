#!/usr/bin/env node
/**
 * create-admin.mjs
 * Creates a new admin user in the MySQL database.
 * 
 * Usage:
 *   Set ADMIN_EMAIL, ADMIN_PASSWORD in .env then run:
 *   node scripts/create-admin.mjs
 * 
 * Required environment variables:
 *   ADMIN_EMAIL - Email for the admin user
 *   ADMIN_PASSWORD - Password for the admin user
 *   
 * Optional environment variables:
 *   ADMIN_NAME - Display name (default: 'Administrator')
 *   ADMIN_FIRST_NAME - First name
 *   ADMIN_LAST_NAME - Last name
 */
import process from 'node:process';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'jntugv_certification',
  DB_PORT = '3306',
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_NAME = 'Administrator',
  ADMIN_FIRST_NAME = 'Admin',
  ADMIN_LAST_NAME = '',
} = process.env;

async function main() {
  // Validate required environment variables
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
    console.error('Please set them in your .env file.');
    process.exit(1);
  }

  if (ADMIN_PASSWORD.length < 8) {
    console.error('ERROR: ADMIN_PASSWORD must be at least 8 characters long.');
    process.exit(1);
  }

  let connection;

  try {
    // Connect to MySQL
    console.log(`Connecting to MySQL at ${DB_HOST}:${DB_PORT}...`);
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: Number(DB_PORT),
    });

    console.log('Connected to MySQL database.');

    const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase();

    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT id, email, is_admin FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.is_admin) {
        console.log('---');
        console.log('⚠️  Admin user already exists with this email.');
        console.log(`   ID: ${existingUser.id}`);
        console.log(`   Email: ${existingUser.email}`);
        console.log('---');
        console.log('If you want to grant admin to a different user, use grant-admin.mjs instead.');
      } else {
        console.log('---');
        console.log('⚠️  User exists but is not an admin.');
        console.log('   Use grant-admin.mjs to promote this user to admin status.');
        console.log('---');
      }
      process.exit(0);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const userId = randomUUID();
    const displayName = ADMIN_NAME || [ADMIN_FIRST_NAME, ADMIN_LAST_NAME].filter(Boolean).join(' ').trim() || normalizedEmail;

    // Insert new admin user
    await connection.execute(
      `INSERT INTO users (
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
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 1, 'password', NOW(), NOW())`,
      [
        userId,
        normalizedEmail,
        hashedPassword,
        displayName,
        ADMIN_FIRST_NAME || null,
        ADMIN_LAST_NAME || null,
      ]
    );

    console.log('---');
    console.log('✅ SUCCESS: Admin user created.');
    console.log(`   ID: ${userId}`);
    console.log(`   Email: ${normalizedEmail}`);
    console.log(`   Name: ${displayName}`);
    console.log('---');
    console.log('You can now sign in with this email and password.');

  } catch (error) {
    console.error('FATAL ERROR creating admin user:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('A user with this email already exists.');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

main();
