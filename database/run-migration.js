// Database Migration Runner for Railway PostgreSQL
// Run this script to set up the initial database schema

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables (DATABASE_URL will come from Railway)
require('dotenv').config();

async function runMigration() {
    console.log('🚀 Starting database migration...\n');

    // Get database URL from environment or command line
    const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];

    if (!DATABASE_URL) {
        console.error('❌ ERROR: No DATABASE_URL provided!');
        console.log('\nUsage:');
        console.log('  1. Set DATABASE_URL in .env file');
        console.log('  2. Or run: node run-migration.js "postgresql://..."');
        console.log('  3. Or use Railway CLI: railway run node run-migration.js\n');
        process.exit(1);
    }

    // Create PostgreSQL client
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Required for Railway
        }
    });

    try {
        // Connect to database
        console.log('📡 Connecting to Railway PostgreSQL...');
        await client.connect();
        console.log('✅ Connected successfully!\n');

        // Read migration SQL file
        const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
        console.log('📄 Reading migration file:', migrationPath);
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Execute migration
        console.log('⚙️  Executing migration...\n');
        await client.query(sql);

        console.log('✅ Migration completed successfully!\n');

        // Verify tables created
        console.log('🔍 Verifying tables...');
        const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        console.log('\n📊 Tables created:');
        result.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });

        // Check categories
        const categories = await client.query('SELECT name, table_name FROM categories ORDER BY id;');
        console.log('\n📁 Categories configured:');
        categories.rows.forEach(cat => {
            console.log(`  ✓ ${cat.name} → ${cat.table_name}`);
        });

        // Check extension settings
        const settings = await client.query('SELECT setting_key, setting_value FROM extension_settings;');
        console.log('\n⚙️  Extension settings:');
        settings.rows.forEach(setting => {
            console.log(`  ✓ ${setting.setting_key}: ${setting.setting_value}`);
        });

        console.log('\n🎉 Database setup complete!');
        console.log('\n📝 Next steps:');
        console.log('  1. Populate video tables with YouTube data');
        console.log('  2. Configure Notion database IDs for each category');
        console.log('  3. Test backend API endpoints\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    } finally {
        await client.end();
        console.log('👋 Database connection closed.\n');
    }
}

// Run migration
runMigration();
