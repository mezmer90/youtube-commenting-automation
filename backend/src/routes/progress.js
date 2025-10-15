// Progress Tracking API Routes
const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/database-service');
const db = new DatabaseService();

// GET /api/progress/daily - Get today's progress
router.get('/daily', async (req, res) => {
    try {
        const progress = await db.getDailyProgress();

        // Calculate time until reset (GMT+5:30 midnight)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const nowIST = new Date(now.getTime() + istOffset);

        const midnight = new Date(nowIST);
        midnight.setUTCHours(24, 0, 0, 0);

        const timeUntilReset = midnight - nowIST;
        const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60));
        const minutesUntilReset = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

        res.json({
            success: true,
            date: progress.date,
            videos_commented: progress.videos_commented || 0,
            target: 100,
            percentage: Math.round(((progress.videos_commented || 0) / 100) * 100),
            categories_worked: progress.categories_worked || [],
            time_until_reset: `${hoursUntilReset}h ${minutesUntilReset}m`,
            timezone: 'GMT+5:30 (IST)'
        });
    } catch (error) {
        console.error('Error fetching daily progress:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/progress/increment - Increment daily counter
router.post('/increment', async (req, res) => {
    try {
        const { category_name } = req.body;

        if (!category_name) {
            return res.status(400).json({
                success: false,
                error: 'category_name is required'
            });
        }

        const result = await db.incrementDailyProgress(category_name);

        res.json({
            success: true,
            new_count: result.new_count,
            target: 100,
            remaining: 100 - result.new_count,
            date: result.date_val
        });
    } catch (error) {
        console.error('Error incrementing progress:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/progress/promo-texts - Get promo texts
router.get('/promo-texts', async (req, res) => {
    try {
        const promoTexts = await db.getPromoTexts();
        res.json({
            success: true,
            promo_texts: promoTexts
        });
    } catch (error) {
        console.error('Error fetching promo texts:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/progress/history - Get progress history for date range
router.get('/history', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'start_date and end_date are required (format: YYYY-MM-DD)'
            });
        }

        const history = await db.getProgressHistory(start_date, end_date);

        // Calculate totals
        const totalVideos = history.reduce((sum, day) => sum + (day.videos_commented || 0), 0);
        const avgPerDay = history.length > 0 ? (totalVideos / history.length).toFixed(1) : 0;

        res.json({
            success: true,
            start_date,
            end_date,
            days: history.length,
            total_videos: totalVideos,
            avg_per_day: parseFloat(avgPerDay),
            history
        });
    } catch (error) {
        console.error('Error fetching progress history:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
