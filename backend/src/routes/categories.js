// Categories API Routes
const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/database-service');
const db = new DatabaseService();

// GET /api/categories - Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await db.getCategories();
        res.json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/categories/:id - Get category by ID
router.get('/:id', async (req, res) => {
    try {
        const category = await db.getCategoryById(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }
        res.json({
            success: true,
            category
        });
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/categories/:id/stats - Get category statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const category = await db.getCategoryById(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        const stats = await db.getCategoryStatistics(category.table_name);
        res.json({
            success: true,
            category: category.name,
            stats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
