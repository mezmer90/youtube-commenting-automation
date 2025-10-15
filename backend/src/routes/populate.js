// Video Population API Routes
const express = require('express');
const router = express.Router();
const { populateCategory } = require('../scripts/populate-videos');
const DatabaseService = require('../services/database-service');
const db = new DatabaseService();

// POST /api/populate - Populate videos for a category
router.post('/', async (req, res) => {
    try {
        const {
            category_name,
            keywords,
            max_results = 50,
            order = 'relevance',
            adaptive_threshold = true,
            upload_days = 730
        } = req.body;

        if (!category_name || !keywords || !Array.isArray(keywords)) {
            return res.status(400).json({
                success: false,
                error: 'category_name and keywords (array) are required'
            });
        }

        const result = await populateCategory(category_name, keywords, {
            maxResults: max_results,
            order,
            adaptiveThreshold: adaptive_threshold,
            uploadDays: upload_days
        });

        res.json({
            success: true,
            category: category_name,
            result
        });
    } catch (error) {
        console.error('Error populating videos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
