// Admin API Routes for Video Search & Management
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const YouTubeAPIService = require('../services/youtube-api');
const DatabaseService = require('../services/database-service');

const youtubeAPI = new YouTubeAPIService();
const db = new DatabaseService();

/**
 * POST /api/admin/init-db
 * Initialize processed_videos tracking table and update categories table
 */
router.post('/init-db', async (req, res) => {
    try {
        console.log('Initializing database tables...');

        // Add timestamp columns to categories table if they don't exist
        await pool.query(`
            ALTER TABLE categories
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
        `);

        // Backfill timestamps for existing categories
        await pool.query(`
            UPDATE categories
            SET created_at = NOW(), updated_at = NOW()
            WHERE created_at IS NULL OR updated_at IS NULL;
        `);

        console.log('✅ Categories table updated with timestamps');

        // Create processed_videos table
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

        console.log('✅ processed_videos table created');

        res.json({
            success: true,
            message: 'Database tables initialized successfully'
        });
    } catch (error) {
        console.error('Error initializing database:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/admin/search
 * Search YouTube videos with pagination (up to 500 results)
 */
router.post('/search', async (req, res) => {
    try {
        const {
            keywords = '',
            maxResults = 500,
            order = 'relevance',
            publishedAfter = null
        } = req.body;

        if (!keywords || keywords.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Keywords are required'
            });
        }

        console.log(`🔍 Admin search: "${keywords}" (max: ${maxResults})`);

        const videos = await youtubeAPI.searchVideosWithPagination(keywords, {
            maxResults: Math.min(maxResults, 500),
            order,
            publishedAfter
        });

        // Get channel subscriber counts for all unique channels
        const channelIds = [...new Set(videos.map(v => v.channel_id).filter(Boolean))];
        const channelData = await youtubeAPI.getMultipleChannelSubscribers(channelIds);

        // Merge channel data into videos
        const videosWithChannelData = videos.map(video => ({
            ...video,
            channel_subscriber_count: channelData[video.channel_id] || '0'
        }));

        res.json({
            success: true,
            count: videosWithChannelData.length,
            videos: videosWithChannelData
        });

    } catch (error) {
        console.error('Error in admin search:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/admin/check-duplicates
 * Check if videos exist in any category
 */
router.post('/check-duplicates', async (req, res) => {
    try {
        const { video_ids } = req.body;

        if (!Array.isArray(video_ids) || video_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'video_ids array is required'
            });
        }

        const result = await pool.query(`
            SELECT video_id, categories, first_added_to_category
            FROM processed_videos
            WHERE video_id = ANY($1)
        `, [video_ids]);

        const duplicates = {};
        result.rows.forEach(row => {
            duplicates[row.video_id] = {
                categories: row.categories,
                firstCategory: row.first_added_to_category
            };
        });

        res.json({
            success: true,
            duplicates
        });

    } catch (error) {
        console.error('Error checking duplicates:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/admin/bulk-add
 * Add selected videos to a category
 */
router.post('/bulk-add', async (req, res) => {
    try {
        const { category_id, videos } = req.body;

        if (!category_id || !Array.isArray(videos) || videos.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'category_id and videos array are required'
            });
        }

        const category = await db.getCategoryById(category_id);
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        console.log(`📥 Bulk adding ${videos.length} videos to ${category.name}`);
        console.log('First video sample:', JSON.stringify(videos[0], null, 2));

        // Check for existing videos
        const videoIds = videos.map(v => v.video_id);
        const existingResult = await pool.query(`
            SELECT video_id
            FROM processed_videos
            WHERE video_id = ANY($1)
        `, [videoIds]);

        const existingVideoIds = new Set(existingResult.rows.map(r => r.video_id));

        // Filter out duplicates
        const newVideos = videos.filter(v => !existingVideoIds.has(v.video_id));
        const skipped = videos.length - newVideos.length;

        console.log(`   New videos: ${newVideos.length}, Skipped (duplicates): ${skipped}`);

        let inserted = 0;
        let errors = 0;

        // Insert new videos
        for (const video of newVideos) {
            try {
                // Insert into category table
                await pool.query(`
                    INSERT INTO ${category.table_name} (
                        video_id, url, title, channel_name, channel_url,
                        channel_subscriber_count, view_count, likes, duration,
                        thumbnail_url, upload_date, description, tags
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (video_id) DO NOTHING
                `, [
                    video.video_id,
                    video.url,
                    video.title,
                    video.channel_name,
                    video.channel_url,
                    video.channel_subscriber_count || null,
                    video.view_count || 0,
                    video.likes || 0,
                    video.duration || '',
                    video.thumbnail_url || '',
                    video.upload_date || new Date(),
                    video.description || '',
                    video.tags || []
                ]);

                // Track in processed_videos
                await pool.query(`
                    INSERT INTO processed_videos (video_id, categories, first_added_to_category)
                    VALUES ($1, ARRAY[$2], $2)
                    ON CONFLICT (video_id) DO UPDATE
                    SET categories = array_append(processed_videos.categories, $2),
                        updated_at = NOW()
                    WHERE NOT ($2 = ANY(processed_videos.categories))
                `, [video.video_id, category.name]);

                inserted++;

            } catch (error) {
                console.error(`Error inserting video ${video.video_id}:`, error.message);
                console.error('Video data:', JSON.stringify(video, null, 2));
                console.error('Full error:', error);
                errors++;
            }
        }

        // Update category stats
        await db.updateCategoryStats(category.table_name);

        res.json({
            success: true,
            category: category.name,
            inserted,
            skipped,
            errors,
            total: videos.length
        });

    } catch (error) {
        console.error('Error in bulk add:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * POST /api/admin/create-category
 * Create a new category
 */
router.post('/create-category', async (req, res) => {
    try {
        const { name, min_view_threshold = 100000 } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Category name is required'
            });
        }

        // Generate table name
        const tableName = 'videos_' + name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_');

        console.log(`Creating category: ${name} (${tableName})`);

        // Create category record
        await pool.query(`
            INSERT INTO categories (name, table_name, min_view_threshold)
            VALUES ($1, $2, $3)
        `, [name, tableName, min_view_threshold]);

        // Create category videos table
        await pool.query(`
            CREATE TABLE ${tableName} (
                id SERIAL PRIMARY KEY,
                video_id VARCHAR(20) NOT NULL UNIQUE,
                url TEXT NOT NULL,
                title TEXT NOT NULL,
                channel_name TEXT,
                channel_url TEXT,
                channel_subscriber_count TEXT,
                view_count BIGINT,
                likes INTEGER,
                duration TEXT,
                thumbnail_url TEXT,
                upload_date TIMESTAMP,
                tags TEXT[],
                description TEXT,
                summary_status VARCHAR(20) DEFAULT 'pending',
                summary_text TEXT,
                summary_generated_at TIMESTAMP,
                commented_status VARCHAR(20) DEFAULT 'pending',
                commented_at TIMESTAMP,
                comment_type VARCHAR(20),
                comment_text TEXT,
                promo_text TEXT,
                promo_position VARCHAR(10),
                notion_saved BOOLEAN DEFAULT false,
                notion_page_id TEXT,
                notion_saved_at TIMESTAMP,
                date_added TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE INDEX idx_${tableName}_video_id ON ${tableName}(video_id);
            CREATE INDEX idx_${tableName}_commented_status ON ${tableName}(commented_status);
        `);

        const category = await db.getCategoryByName(name);

        res.json({
            success: true,
            category
        });

    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/admin/update-category/:id
 * Update category name
 */
router.put('/update-category/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Category name is required'
            });
        }

        console.log(`Updating category ${id} to: ${name}`);

        await pool.query(`
            UPDATE categories
            SET name = $1, updated_at = NOW()
            WHERE id = $2
        `, [name, id]);

        const category = await db.getCategoryById(id);

        res.json({
            success: true,
            category
        });

    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/admin/delete-category/:id
 * Delete a category and its table
 */
router.delete('/delete-category/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const category = await db.getCategoryById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        console.log(`Deleting category: ${category.name} (${category.table_name})`);

        // Drop the videos table
        await pool.query(`DROP TABLE IF EXISTS ${category.table_name}`);

        // Delete category record
        await pool.query(`DELETE FROM categories WHERE id = $1`, [id]);

        res.json({
            success: true,
            message: `Category "${category.name}" deleted successfully`
        });

    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
