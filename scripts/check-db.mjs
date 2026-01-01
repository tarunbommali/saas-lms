import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const {
    DB_HOST = '127.0.0.1',
    DB_PORT = 3306,
    DB_USER = 'root',
    DB_PASSWORD = 'Disistarun@2001',
    DB_NAME = 'jntugv_certification'
} = process.env;

async function checkDatabase() {
    console.log('🔍 Checking database connection and tables...\n');

    try {
        const connection = await mysql.createConnection({
            host: DB_HOST,
            port: Number(DB_PORT),
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME
        });

        console.log('✅ Connected to MySQL database');

        // Check if tables exist
        const [tables] = await connection.query('SHOW TABLES');

        if (tables.length === 0) {
            console.log('❌ No tables found in database!');
            console.log('   Run the backend server to initialize tables automatically.');
        } else {
            console.log(`✅ Found ${tables.length} tables:`);
            tables.forEach(table => {
                const tableName = Object.values(table)[0];
                console.log(`   - ${tableName}`);
            });
        }

        // Check for sample data
        const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
        const [courses] = await connection.query('SELECT COUNT(*) as count FROM courses');

        console.log(`\n📊 Data Summary:`);
        console.log(`   Users: ${users[0].count}`);
        console.log(`   Courses: ${courses[0].count}`);

        await connection.end();
        console.log('\n✨ Database check complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
        process.exit(1);
    }
}

checkDatabase();
