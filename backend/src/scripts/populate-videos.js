// Script to Populate Videos from YouTube API
require('dotenv').config();
const YouTubeAPIService = require('../services/youtube-api');
const DatabaseService = require('../services/database-service');

const youtubeAPI = new YouTubeAPIService();
const db = new DatabaseService();

/**
 * Populate videos for a specific category
 */
async function populateCategory(categoryName, keywords, options = {}) {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📁 Populating category: ${categoryName}`);
        console.log(`${'='.repeat(60)}\n`);

        // Get category from database
        const category = await db.getCategoryByName(categoryName);
        if (!category) {
            throw new Error(`Category "${categoryName}" not found in database`);
        }

        console.log(`✅ Category found: ${category.name} (${category.table_name})`);
        console.log(`📊 Current stats: ${category.total_videos} total, ${category.completed_videos} completed`);
        console.log(`🎯 Min view threshold: ${category.min_view_threshold.toLocaleString()}\n`);

        // Calculate date filter (last 2 years)
        const uploadDays = options.uploadDays || process.env.DEFAULT_UPLOAD_DAYS || 730;
        const publishedAfter = new Date();
        publishedAfter.setDate(publishedAfter.getDate() - uploadDays);

        console.log(`📅 Fetching videos from last ${uploadDays} days (${publishedAfter.toISOString().split('T')[0]})\n`);

        let allVideos = [];

        // Search for each keyword
        for (const keyword of keywords) {
            console.log(`🔍 Searching for: "${keyword}"`);

            const videos = await youtubeAPI.searchVideos(keyword, {
                maxResults: options.maxResults || 50,
                order: options.order || 'relevance',
                publishedAfter: publishedAfter.toISOString()
            });

            console.log(`   Found: ${videos.length} videos`);
            allVideos.push(...videos);

            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Remove duplicates
        const uniqueVideos = Array.from(
            new Map(allVideos.map(v => [v.video_id, v])).values()
        );

        console.log(`\n📊 Total unique videos found: ${uniqueVideos.length}`);

        // Calculate adaptive threshold if needed
        let minViewThreshold = category.min_view_threshold;
        if (options.adaptiveThreshold) {
            const calculatedThreshold = youtubeAPI.calculateAdaptiveThreshold(
                uniqueVideos,
                category.min_view_threshold
            );
            console.log(`🎯 Adaptive threshold calculated: ${calculatedThreshold.toLocaleString()}`);
            minViewThreshold = calculatedThreshold;
        }

        // Filter by view count
        const filteredVideos = youtubeAPI.filterByViewCount(uniqueVideos, minViewThreshold);
        console.log(`✅ Videos after view filter (>=${minViewThreshold.toLocaleString()}): ${filteredVideos.length}\n`);

        if (filteredVideos.length === 0) {
            console.log('⚠️  No videos match the criteria. Try lowering the view threshold.\n');
            return { inserted: 0, duplicates: 0, total: 0 };
        }

        // Insert into database
        console.log(`💾 Inserting videos into ${category.table_name}...`);
        const result = await db.insertVideos(category.table_name, filteredVideos);

        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ Population Complete!`);
        console.log(`${'='.repeat(60)}`);
        console.log(`📊 Results:`);
        console.log(`   - Total found: ${result.total}`);
        console.log(`   - Newly inserted: ${result.inserted}`);
        console.log(`   - Duplicates skipped: ${result.duplicates}`);

        // Show updated stats
        const stats = await db.getCategoryStatistics(category.table_name);
        console.log(`\n📈 Category Statistics:`);
        console.log(`   - Total videos: ${stats.total_videos}`);
        console.log(`   - Pending: ${stats.pending}`);
        console.log(`   - Commented: ${stats.commented}`);
        console.log(`   - Avg views: ${parseInt(stats.avg_views || 0).toLocaleString()}`);
        console.log(`   - Max views: ${parseInt(stats.max_views || 0).toLocaleString()}`);
        console.log(`${'='.repeat(60)}\n`);

        return result;

    } catch (error) {
        console.error(`\n❌ Error populating category "${categoryName}":`, error.message);
        throw error;
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('\n🚀 YouTube Video Population Script');
    console.log('===================================\n');

    if (!process.env.YOUTUBE_API_KEY) {
        console.error('❌ ERROR: YOUTUBE_API_KEY not set in environment variables!\n');
        process.exit(1);
    }

    try {
        // Example: Populate AI & Technology category
        await populateCategory(
            'AI & Technology',
            [
                'artificial intelligence tutorial',
                'machine learning explained',
                'AI technology 2024',
                'deep learning guide'
            ],
            {
                maxResults: 50,
                order: 'relevance',
                adaptiveThreshold: true,
                uploadDays: 730
            }
        );

        // Example: Populate Marketing category
        await populateCategory(
            'Marketing',
            [
                'digital marketing strategy',
                'social media marketing',
                'content marketing tips',
                'marketing automation'
            ],
            {
                maxResults: 50,
                order: 'viewCount',
                adaptiveThreshold: true
            }
        );

        // Example: Populate Fitness category
        await populateCategory(
            'Fitness & Health',
            [
                'fitness workout routine',
                'healthy lifestyle tips',
                'weight loss guide',
                'nutrition advice'
            ],
            {
                maxResults: 50,
                order: 'relevance',
                adaptiveThreshold: true
            }
        );

        console.log('\n🎉 All categories populated successfully!\n');

    } catch (error) {
        console.error('\n❌ Script failed:', error.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { populateCategory };
