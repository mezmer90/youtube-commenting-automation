// Initialize processed_videos tracking table
const { pool } = require('./database');

async function initProcessedVideosTable() {
    try {
        console.log('Creating processed_videos tracking table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS processed_videos (
                id SERIAL PRIMARY KEY,
                video_id VARCHAR(20) NOT NULL UNIQUE,
                categories TEXT[] DEFAULT '{}',
                first_added_to_category VARCHAR(100),
                date_added TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_processed_videos_video_id
            ON processed_videos(video_id);
        `);

        console.log('✅ processed_videos table ready');
        return true;
    } catch (error) {
        console.error('❌ Error creating processed_videos table:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    initProcessedVideosTable()
        .then(() => {
            console.log('✅ Initialization complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Initialization failed:', error);
            process.exit(1);
        });
}

module.exports = { initProcessedVideosTable };
