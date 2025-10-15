// Test Railway PostgreSQL Connection
const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
    console.log('🔌 Testing Railway PostgreSQL connection...\n');

    const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];

    if (!DATABASE_URL) {
        console.error('❌ No DATABASE_URL provided!');
        console.log('\nUsage:');
        console.log('  1. Set DATABASE_URL in .env file');
        console.log('  2. Or run: node test-connection.js "postgresql://..."\n');
        process.exit(1);
    }

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('✅ Connected successfully!\n');

        // Get database info
        const result = await client.query('SELECT version();');
        console.log('📊 PostgreSQL Version:');
        console.log(`  ${result.rows[0].version}\n`);

        // Get current database name
        const dbInfo = await client.query('SELECT current_database();');
        console.log('🗄️  Current Database:', dbInfo.rows[0].current_database);

        // List tables
        const tables = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        console.log('\n📋 Tables in database:');
        if (tables.rows.length === 0) {
            console.log('  (No tables yet - run migration first)');
        } else {
            tables.rows.forEach(row => {
                console.log(`  ✓ ${row.table_name}`);
            });
        }

        console.log('\n✅ Connection test passed!\n');

    } catch (error) {
        console.error('\n❌ Connection failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

testConnection();
