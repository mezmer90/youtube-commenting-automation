// Database Service for Video Management
const { pool } = require('../config/database');

class DatabaseService {
    /**
     * Get all categories
     */
    async getCategories() {
        const result = await pool.query(`
            SELECT id, name, table_name, notion_database_id, notion_database_name,
                   total_videos, completed_videos, min_view_threshold,
                   created_at, updated_at
            FROM categories
            ORDER BY id
        `);
        return result.rows;
    }

    /**
     * Get category by ID
     */
    async getCategoryById(categoryId) {
        const result = await pool.query(
            'SELECT * FROM categories WHERE id = $1',
            [categoryId]
        );
        return result.rows[0];
    }

    /**
     * Get category by name
     */
    async getCategoryByName(name) {
        const result = await pool.query(
            'SELECT * FROM categories WHERE name = $1',
            [name]
        );
        return result.rows[0];
    }

    /**
     * Insert videos into category table
     */
    async insertVideos(tableName, videos) {
        if (!videos || videos.length === 0) {
            return { inserted: 0, duplicates: 0 };
        }

        let inserted = 0;
        let duplicates = 0;

        for (const video of videos) {
            try {
                await pool.query(`
                    INSERT INTO ${tableName} (
                        video_id, url, title, channel_name, channel_url,
                        view_count, likes, duration, thumbnail_url, upload_date,
                        description, tags
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (video_id) DO NOTHING
                `, [
                    video.video_id,
                    video.url,
                    video.title,
                    video.channel_name,
                    video.channel_url,
                    video.view_count,
                    video.likes,
                    video.duration,
                    video.thumbnail_url,
                    video.upload_date,
                    video.description || '',
                    video.tags || []
                ]);
                inserted++;
            } catch (error) {
                if (error.code === '23505') { // Duplicate key
                    duplicates++;
                } else {
                    console.error(`Error inserting video ${video.video_id}:`, error.message);
                }
            }
        }

        // Update category statistics
        await this.updateCategoryStats(tableName);

        return { inserted, duplicates, total: videos.length };
    }

    /**
     * Update category video count
     */
    async updateCategoryStats(tableName) {
        const countResult = await pool.query(`
            SELECT COUNT(*) as total,
                   COUNT(*) FILTER (WHERE commented_status = 'completed') as completed
            FROM ${tableName}
        `);

        const { total, completed } = countResult.rows[0];

        await pool.query(`
            UPDATE categories
            SET total_videos = $1, completed_videos = $2, updated_at = NOW()
            WHERE table_name = $3
        `, [parseInt(total), parseInt(completed), tableName]);
    }

    /**
     * Get next uncommented video from category
     */
    async getNextVideo(categoryId) {
        const category = await this.getCategoryById(categoryId);
        if (!category) {
            throw new Error('Category not found');
        }

        const result = await pool.query(`
            SELECT * FROM ${category.table_name}
            WHERE commented_status = 'pending'
            ORDER BY view_count DESC, date_added ASC
            LIMIT 1
        `);

        return result.rows[0];
    }

    /**
     * Update video status
     */
    async updateVideoStatus(tableName, videoId, updates) {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        if (updates.summary_status) {
            setClauses.push(`summary_status = $${paramIndex++}`);
            values.push(updates.summary_status);
        }

        if (updates.summary_text) {
            setClauses.push(`summary_text = $${paramIndex++}`);
            values.push(updates.summary_text);
            setClauses.push(`summary_generated_at = NOW()`);
        }

        if (updates.commented_status) {
            setClauses.push(`commented_status = $${paramIndex++}`);
            values.push(updates.commented_status);
            setClauses.push(`commented_at = NOW()`);
        }

        if (updates.comment_type) {
            setClauses.push(`comment_type = $${paramIndex++}`);
            values.push(updates.comment_type);
        }

        if (updates.comment_text) {
            setClauses.push(`comment_text = $${paramIndex++}`);
            values.push(updates.comment_text);
        }

        if (updates.promo_text !== undefined) {
            setClauses.push(`promo_text = $${paramIndex++}`);
            values.push(updates.promo_text);
        }

        if (updates.promo_position) {
            setClauses.push(`promo_position = $${paramIndex++}`);
            values.push(updates.promo_position);
        }

        if (updates.notion_saved !== undefined) {
            setClauses.push(`notion_saved = $${paramIndex++}`);
            values.push(updates.notion_saved);
        }

        if (updates.notion_page_id) {
            setClauses.push(`notion_page_id = $${paramIndex++}`);
            values.push(updates.notion_page_id);
            setClauses.push(`notion_saved_at = NOW()`);
        }

        setClauses.push(`updated_at = NOW()`);
        values.push(videoId);

        const query = `
            UPDATE ${tableName}
            SET ${setClauses.join(', ')}
            WHERE video_id = $${paramIndex}
        `;

        await pool.query(query, values);
        await this.updateCategoryStats(tableName);
    }

    /**
     * Get daily progress
     */
    async getDailyProgress() {
        const result = await pool.query(`
            SELECT * FROM daily_progress
            WHERE date = CURRENT_DATE
        `);

        if (result.rows.length === 0) {
            // Create today's record
            await pool.query(`
                INSERT INTO daily_progress (date, videos_commented, last_reset_at)
                VALUES (CURRENT_DATE, 0, NOW())
            `);
            return { date: new Date(), videos_commented: 0, categories_worked: [] };
        }

        return result.rows[0];
    }

    /**
     * Increment daily progress
     */
    async incrementDailyProgress(categoryName) {
        const result = await pool.query(`
            SELECT * FROM increment_daily_progress($1)
        `, [categoryName]);

        return result.rows[0];
    }

    /**
     * Get progress history for date range
     */
    async getProgressHistory(startDate, endDate) {
        const result = await pool.query(`
            SELECT date, videos_commented, categories_worked, last_reset_at
            FROM daily_progress
            WHERE date BETWEEN $1 AND $2
            ORDER BY date ASC
        `, [startDate, endDate]);

        return result.rows;
    }

    /**
     * Get promo texts
     */
    async getPromoTexts() {
        const result = await pool.query(`
            SELECT setting_key, setting_value
            FROM extension_settings
            WHERE setting_key LIKE 'promo_text_%'
            ORDER BY setting_key
        `);

        return result.rows.map(row => row.setting_value);
    }

    /**
     * Get video statistics for a category
     */
    async getCategoryStatistics(tableName) {
        const result = await pool.query(`
            SELECT
                COUNT(*) as total_videos,
                COUNT(*) FILTER (WHERE commented_status = 'completed') as commented,
                COUNT(*) FILTER (WHERE commented_status = 'pending') as pending,
                COUNT(*) FILTER (WHERE summary_status = 'completed') as summarized,
                AVG(view_count) as avg_views,
                MAX(view_count) as max_views,
                MIN(view_count) as min_views
            FROM ${tableName}
        `);

        return result.rows[0];
    }
}

module.exports = DatabaseService;
