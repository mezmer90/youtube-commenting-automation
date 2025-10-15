// Videos API Routes
const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/database-service');
const db = new DatabaseService();

// GET /api/videos/next - Get next uncommented video
router.get('/next', async (req, res) => {
    try {
        const { category_id } = req.query;

        if (!category_id) {
            return res.status(400).json({
                success: false,
                error: 'category_id is required'
            });
        }

        const video = await db.getNextVideo(category_id);

        if (!video) {
            return res.json({
                success: true,
                video: null,
                message: 'No pending videos found in this category'
            });
        }

        res.json({
            success: true,
            video
        });
    } catch (error) {
        console.error('Error fetching next video:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/videos/update-status - Update video status
router.post('/update-status', async (req, res) => {
    try {
        const {
            category_id,
            video_id,
            summary_status,
            summary_text,
            commented_status,
            comment_type,
            comment_text,
            promo_text,
            promo_position,
            notion_saved,
            notion_page_id
        } = req.body;

        if (!category_id || !video_id) {
            return res.status(400).json({
                success: false,
                error: 'category_id and video_id are required'
            });
        }

        const category = await db.getCategoryById(category_id);
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        const updates = {};
        if (summary_status) updates.summary_status = summary_status;
        if (summary_text) updates.summary_text = summary_text;
        if (commented_status) updates.commented_status = commented_status;
        if (comment_type) updates.comment_type = comment_type;
        if (comment_text) updates.comment_text = comment_text;
        if (promo_text !== undefined) updates.promo_text = promo_text;
        if (promo_position) updates.promo_position = promo_position;
        if (notion_saved !== undefined) updates.notion_saved = notion_saved;
        if (notion_page_id) updates.notion_page_id = notion_page_id;

        await db.updateVideoStatus(category.table_name, video_id, updates);

        res.json({
            success: true,
            message: 'Video status updated successfully'
        });
    } catch (error) {
        console.error('Error updating video status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
