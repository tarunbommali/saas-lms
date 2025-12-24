#!/usr/bin/env node
/**
 * grant-admin.mjs
 * Grants admin privileges to an existing user in the MySQL database.
 * 
 * Usage:
 *   Set EMAIL or UID in .env then run:
 *   node scripts/grant-admin.mjs
 * 
 * Required environment variables (one of):
 *   EMAIL - Email of the user to promote
 *   UID - User ID to promote
 */
import process from 'node:process';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'jntugv_certification',
  DB_PORT = '3306',
  EMAIL,
  UID,
} = process.env;

async function main() {
  // Validate required environment variables
  if (!EMAIL && !UID) {
    console.error('ERROR: Either EMAIL or UID environment variable is required.');
    console.error('Please set one of them in your .env file or pass as environment variable.');
    console.error('');
    console.error('Examples:');
    console.error('  EMAIL=user@example.com node scripts/grant-admin.mjs');
    console.error('  UID=12345678-1234-1234-1234-123456789abc node scripts/grant-admin.mjs');
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

    // Find the user
    let user;
    if (UID) {
      const [users] = await connection.execute(
        'SELECT id, email, display_name, is_admin FROM users WHERE id = ?',
        [UID]
      );
      user = users[0];
    } else {
      const normalizedEmail = EMAIL.trim().toLowerCase();
      const [users] = await connection.execute(
        'SELECT id, email, display_name, is_admin FROM users WHERE email = ?',
        [normalizedEmail]
      );
      user = users[0];
    }

    if (!user) {
      console.error('ERROR: User not found.');
      console.error(`Searched for: ${UID ? `UID=${UID}` : `Email=${EMAIL}`}`);
      process.exit(1);
    }

    if (user.is_admin) {
      console.log('---');
      console.log('ℹ️  User is already an admin.');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.display_name || 'N/A'}`);
      console.log('---');
      process.exit(0);
    }

    // Grant admin privileges
    await connection.execute(
      'UPDATE users SET is_admin = 1, updated_at = NOW() WHERE id = ?',
      [user.id]
    );

    console.log('---');
    console.log('✅ SUCCESS: Admin privileges granted.');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.display_name || 'N/A'}`);
    console.log('---');
    console.log('The user now has admin access. They may need to log out and log back in.');

  } catch (error) {
    console.error('FATAL ERROR granting admin privileges:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

main();
