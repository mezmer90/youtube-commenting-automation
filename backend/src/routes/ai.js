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

// POST /api/ai/comment - DEPRECATED
// Comments are now the full summary/chapters/takeaways content (no conversion)
router.post('/comment', async (req, res) => {
    res.status(410).json({
        success: false,
        error: 'This endpoint is deprecated. Use /api/ai/process instead. Comments are now the full generated content.'
    });
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
        console.log('🔥🔥🔥 NEW CODE DEPLOYED - COMMIT 741ebb3 🔥🔥🔥');

        let summary, comment;

        // Generate content based on type
        switch (selectedType) {
            case 'summary':
                // For summary type: generate once, use for both Notion and YouTube
                summary = await ai.generateSummary(transcript, metadata);
                comment = summary; // Post full summary as comment
                console.log('✅ Generated summary (used for both Notion and YouTube)');
                break;

            case 'chapters':
                // For chapters: generate chapters for YouTube, separate summary for Notion
                comment = await ai.generateChapters(transcript, metadata);
                console.log('✅ Generated chapters for YouTube comment');

                // Always generate full summary for Notion
                summary = await ai.generateSummary(transcript, metadata);
                console.log('✅ Generated summary for Notion database');
                break;

            case 'takeaways':
                // For takeaways: generate takeaways for YouTube, separate summary for Notion
                comment = await ai.generateTakeaways(transcript, metadata);
                console.log('✅ Generated takeaways for YouTube comment');

                // Always generate full summary for Notion
                summary = await ai.generateSummary(transcript, metadata);
                console.log('✅ Generated summary for Notion database');
                break;
        }

        res.json({
            success: true,
            summary,           // Always a full summary for Notion
            comment,           // Full content (summary/chapters/takeaways) for YouTube
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
