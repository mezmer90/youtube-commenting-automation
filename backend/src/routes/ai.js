// AI Processing API Routes
const express = require('express');
const router = express.Router();
const OpenRouterService = require('../services/openrouter-service');
const ai = new OpenRouterService();

/**
 * Strip markdown formatting from YouTube comments
 * Keep plain text formatting (##, -, numbered lists, timestamps)
 * Remove: **bold**, *italic*, [links](), etc.
 */
function stripMarkdownForYouTube(text) {
    if (!text) return text;

    // Remove **bold**
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');

    // Remove *italic*
    text = text.replace(/\*([^*]+)\*/g, '$1');

    // Remove _italic_
    text = text.replace(/_([^_]+)_/g, '$1');

    // Remove __bold__
    text = text.replace(/__([^_]+)__/g, '$1');

    return text;
}

/**
 * Count words in text
 * YouTube has a 1200-word limit for comments
 */
function countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

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
                comment = stripMarkdownForYouTube(summary); // Strip markdown for YouTube
                console.log('✅ Generated summary (used for both Notion and YouTube)');
                break;

            case 'chapters':
                // For chapters: generate chapters for YouTube, separate summary for Notion
                const rawChapters = await ai.generateChapters(transcript, metadata);
                comment = stripMarkdownForYouTube(rawChapters); // Strip markdown for YouTube
                console.log('✅ Generated chapters for YouTube comment');

                // Always generate full summary for Notion
                summary = await ai.generateSummary(transcript, metadata);
                console.log('✅ Generated summary for Notion database');
                break;

            case 'takeaways':
                // For takeaways: generate takeaways for YouTube, separate summary for Notion
                const rawTakeaways = await ai.generateTakeaways(transcript, metadata);
                comment = stripMarkdownForYouTube(rawTakeaways); // Strip markdown for YouTube
                console.log('✅ Generated takeaways for YouTube comment');

                // Always generate full summary for Notion
                summary = await ai.generateSummary(transcript, metadata);
                console.log('✅ Generated summary for Notion database');
                break;
        }

        // Check word count and condense if needed (YouTube 1200-word limit)
        const wordCount = countWords(comment);
        console.log(`📊 Comment word count: ${wordCount} words`);

        if (wordCount > 1200) {
            console.log('⚠️  Comment exceeds 1200 words, condensing...');
            comment = await ai.condenseComment(comment, 1200);
            // Strip markdown again after condensing (in case AI added any)
            comment = stripMarkdownForYouTube(comment);
            const newWordCount = countWords(comment);
            console.log(`✅ Comment condensed: ${wordCount} → ${newWordCount} words`);
        }

        res.json({
            success: true,
            summary,           // Always a full summary for Notion
            comment,           // Full content (summary/chapters/takeaways) for YouTube
            comment_type: selectedType,
            metadata: metadata || {},
            // DISTINCTIVE MARKER - PROOF OF NEW CODE DEPLOYMENT
            code_version: 'v2.0-NEW-PROMPTS',
            deployed_at: '2025-10-15T17:35:00Z',
            commit_hash: '5c783cf'
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
