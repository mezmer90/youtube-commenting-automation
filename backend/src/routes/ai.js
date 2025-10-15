// AI Processing API Routes
const express = require('express');
const router = express.Router();
const OpenRouterService = require('../services/openrouter-service');
const ai = new OpenRouterService();

// POST /api/ai/summarize - Generate summary from transcript
router.post('/summarize', async (req, res) => {
    try {
        const { transcript, metadata } = req.body;

        if (!transcript) {
            return res.status(400).json({
                success: false,
                error: 'transcript is required'
            });
        }

        const summary = await ai.generateSummary(transcript, metadata || {});

        res.json({
            success: true,
            summary,
            metadata: metadata || {}
        });
    } catch (error) {
        console.error('Error generating summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/ai/chapters - Generate chapter breakdown
router.post('/chapters', async (req, res) => {
    try {
        const { transcript, metadata } = req.body;

        if (!transcript) {
            return res.status(400).json({
                success: false,
                error: 'transcript is required'
            });
        }

        const chapters = await ai.generateChapters(transcript, metadata || {});

        res.json({
            success: true,
            chapters,
            metadata: metadata || {}
        });
    } catch (error) {
        console.error('Error generating chapters:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/ai/takeaways - Extract key takeaways
router.post('/takeaways', async (req, res) => {
    try {
        const { transcript, metadata } = req.body;

        if (!transcript) {
            return res.status(400).json({
                success: false,
                error: 'transcript is required'
            });
        }

        const takeaways = await ai.generateTakeaways(transcript, metadata || {});

        res.json({
            success: true,
            takeaways,
            metadata: metadata || {}
        });
    } catch (error) {
        console.error('Error generating takeaways:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/ai/comment - Generate YouTube comment
router.post('/comment', async (req, res) => {
    try {
        const { summary, type, metadata } = req.body;

        if (!summary) {
            return res.status(400).json({
                success: false,
                error: 'summary is required'
            });
        }

        if (!type || !['summary', 'chapters', 'takeaways'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'type must be one of: summary, chapters, takeaways'
            });
        }

        const comment = await ai.generateComment(summary, type, metadata || {});

        res.json({
            success: true,
            comment,
            type,
            metadata: metadata || {}
        });
    } catch (error) {
        console.error('Error generating comment:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/ai/process - Complete processing (summary + comment)
router.post('/process', async (req, res) => {
    try {
        const { transcript, metadata, comment_type } = req.body;

        if (!transcript) {
            return res.status(400).json({
                success: false,
                error: 'transcript is required'
            });
        }

        // Determine comment type (random if not specified)
        const types = ['summary', 'chapters', 'takeaways'];
        const selectedType = comment_type || types[Math.floor(Math.random() * types.length)];

        console.log(`🎲 Processing video with type: ${selectedType}`);

        let summary, content;

        // Generate content based on type
        switch (selectedType) {
            case 'summary':
                summary = await ai.generateSummary(transcript, metadata);
                content = summary;
                break;
            case 'chapters':
                content = await ai.generateChapters(transcript, metadata);
                summary = content; // Use chapters as summary for storage
                break;
            case 'takeaways':
                content = await ai.generateTakeaways(transcript, metadata);
                summary = content; // Use takeaways as summary for storage
                break;
        }

        // Generate comment
        const comment = await ai.generateComment(content, selectedType, metadata);

        res.json({
            success: true,
            summary,
            comment,
            comment_type: selectedType,
            metadata: metadata || {}
        });
    } catch (error) {
        console.error('Error in complete processing:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
