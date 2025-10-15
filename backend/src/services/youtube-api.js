// YouTube Data API v3 Service
const axios = require('axios');

class YouTubeAPIService {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.YOUTUBE_API_KEY;
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    }

    /**
     * Search for videos by keyword with filters
     * @param {string} keyword - Search keyword
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Array of video objects
     */
    async searchVideos(keyword, options = {}) {
        const {
            maxResults = 50,
            order = 'relevance', // relevance, viewCount, date
            publishedAfter = null,
            regionCode = 'US',
            relevanceLanguage = 'en'
        } = options;

        try {
            console.log(`🔍 Searching YouTube for: "${keyword}"`);

            // Step 1: Search for video IDs
            const searchUrl = `${this.baseUrl}/search`;
            const searchParams = {
                part: 'id',
                type: 'video',
                q: keyword,
                order,
                regionCode,
                relevanceLanguage,
                maxResults: Math.min(maxResults, 50),
                key: this.apiKey
            };

            if (publishedAfter) {
                searchParams.publishedAfter = publishedAfter;
            }

            const searchResponse = await axios.get(searchUrl, { params: searchParams });

            if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
                console.log(`⚠️  No videos found for "${keyword}"`);
                return [];
            }

            const videoIds = searchResponse.data.items
                .map(item => item.id && item.id.videoId)
                .filter(Boolean);

            // Step 2: Get detailed video statistics
            const videos = await this.getVideoDetails(videoIds);

            console.log(`✅ Found ${videos.length} videos for "${keyword}"`);
            return videos;

        } catch (error) {
            console.error(`❌ Error searching videos for "${keyword}":`, error.message);
            if (error.response) {
                console.error('API Response:', error.response.data);
            }
            throw error;
        }
    }

    /**
     * Get detailed information for multiple videos
     * @param {Array<string>} videoIds - Array of video IDs
     * @returns {Promise<Array>} Array of video details
     */
    async getVideoDetails(videoIds) {
        if (!videoIds || videoIds.length === 0) {
            return [];
        }

        try {
            const statsUrl = `${this.baseUrl}/videos`;
            const statsParams = {
                part: 'snippet,statistics,contentDetails',
                id: videoIds.join(','),
                key: this.apiKey
            };

            const statsResponse = await axios.get(statsUrl, { params: statsParams });

            return (statsResponse.data.items || []).map(video => {
                const snippet = video.snippet || {};
                const statistics = video.statistics || {};
                const contentDetails = video.contentDetails || {};

                return {
                    video_id: video.id,
                    url: `https://www.youtube.com/watch?v=${video.id}`,
                    title: snippet.title || '',
                    channel_name: snippet.channelTitle || '',
                    channel_id: snippet.channelId || '',
                    channel_url: `https://www.youtube.com/channel/${snippet.channelId}`,
                    view_count: parseInt(statistics.viewCount || 0),
                    likes: parseInt(statistics.likeCount || 0),
                    duration: this.parseDuration(contentDetails.duration),
                    thumbnail_url: snippet.thumbnails?.maxresdefault?.url ||
                                  snippet.thumbnails?.high?.url ||
                                  `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
                    upload_date: snippet.publishedAt,
                    description: snippet.description || '',
                    tags: snippet.tags || []
                };
            });

        } catch (error) {
            console.error('❌ Error fetching video details:', error.message);
            throw error;
        }
    }

    /**
     * Get channel subscriber count
     * @param {string} channelId - YouTube channel ID
     * @returns {Promise<string>} Subscriber count
     */
    async getChannelSubscribers(channelId) {
        try {
            const channelUrl = `${this.baseUrl}/channels`;
            const params = {
                part: 'statistics',
                id: channelId,
                key: this.apiKey
            };

            const response = await axios.get(channelUrl, { params });

            if (response.data.items && response.data.items.length > 0) {
                const subscriberCount = response.data.items[0].statistics.subscriberCount;
                return this.formatNumber(subscriberCount);
            }

            return '0';

        } catch (error) {
            console.error('Error fetching channel subscribers:', error.message);
            return '0';
        }
    }

    /**
     * Get subscriber counts for multiple channels (batch)
     * @param {Array<string>} channelIds - Array of channel IDs
     * @returns {Promise<Object>} Object mapping channelId -> subscriber count
     */
    async getMultipleChannelSubscribers(channelIds) {
        if (!channelIds || channelIds.length === 0) {
            return {};
        }

        try {
            const results = {};

            // YouTube API allows up to 50 IDs per request
            for (let i = 0; i < channelIds.length; i += 50) {
                const batch = channelIds.slice(i, i + 50);

                const channelUrl = `${this.baseUrl}/channels`;
                const params = {
                    part: 'statistics',
                    id: batch.join(','),
                    key: this.apiKey
                };

                const response = await axios.get(channelUrl, { params });

                if (response.data.items) {
                    response.data.items.forEach(channel => {
                        const subscriberCount = channel.statistics.subscriberCount;
                        results[channel.id] = this.formatNumber(subscriberCount);
                    });
                }

                // Rate limiting delay
                if (i + 50 < channelIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            return results;

        } catch (error) {
            console.error('Error fetching multiple channel subscribers:', error.message);
            return {};
        }
    }

    /**
     * Search videos with pagination support (up to 500 results)
     * @param {string} keyword - Search keyword
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Array of video objects
     */
    async searchVideosWithPagination(keyword, options = {}) {
        const {
            maxResults = 500,
            order = 'relevance',
            publishedAfter = null,
            regionCode = 'US',
            relevanceLanguage = 'en'
        } = options;

        try {
            console.log(`🔍 Searching YouTube (with pagination): "${keyword}"`);

            let allVideos = [];
            let pageToken = null;
            const perPage = 50; // YouTube max per request
            const maxPages = Math.ceil(Math.min(maxResults, 500) / perPage);

            for (let page = 0; page < maxPages; page++) {
                const searchUrl = `${this.baseUrl}/search`;
                const searchParams = {
                    part: 'id',
                    type: 'video',
                    q: keyword,
                    order,
                    regionCode,
                    relevanceLanguage,
                    maxResults: perPage,
                    key: this.apiKey
                };

                if (publishedAfter) {
                    searchParams.publishedAfter = publishedAfter;
                }

                if (pageToken) {
                    searchParams.pageToken = pageToken;
                }

                const searchResponse = await axios.get(searchUrl, { params: searchParams });

                if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
                    console.log(`⚠️  No more results at page ${page + 1}`);
                    break;
                }

                const videoIds = searchResponse.data.items
                    .map(item => item.id && item.id.videoId)
                    .filter(Boolean);

                // Get detailed video info
                const videos = await this.getVideoDetails(videoIds);
                allVideos.push(...videos);

                console.log(`   Page ${page + 1}/${maxPages}: ${videos.length} videos (total: ${allVideos.length})`);

                // Check if there's a next page
                pageToken = searchResponse.data.nextPageToken;
                if (!pageToken) {
                    console.log('   No more pages available');
                    break;
                }

                // Rate limiting delay
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`✅ Total videos found: ${allVideos.length}`);
            return allVideos;

        } catch (error) {
            console.error(`❌ Error searching videos (pagination): "${keyword}":`, error.message);
            if (error.response) {
                console.error('API Response:', error.response.data);
            }
            throw error;
        }
    }

    /**
     * Parse ISO 8601 duration to readable format
     * @param {string} duration - ISO 8601 duration (e.g., PT15M51S)
     * @returns {string} Formatted duration (e.g., 15:51)
     */
    parseDuration(duration) {
        if (!duration) return '';

        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return '';

        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        const seconds = parseInt(match[3] || 0);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Format large numbers (e.g., 1234567 -> 1.2M)
     * @param {number|string} num - Number to format
     * @returns {string} Formatted number
     */
    formatNumber(num) {
        const n = parseInt(num);
        if (isNaN(n)) return '0';

        if (n >= 1000000000) {
            return (n / 1000000000).toFixed(1) + 'B';
        }
        if (n >= 1000000) {
            return (n / 1000000).toFixed(1) + 'M';
        }
        if (n >= 1000) {
            return (n / 1000).toFixed(1) + 'K';
        }
        return n.toString();
    }

    /**
     * Filter videos by view count threshold
     * @param {Array} videos - Array of video objects
     * @param {number} minViews - Minimum view count
     * @returns {Array} Filtered videos
     */
    filterByViewCount(videos, minViews) {
        return videos.filter(video => video.view_count >= minViews);
    }

    /**
     * Calculate adaptive view threshold based on median views
     * @param {Array} videos - Array of video objects
     * @param {number} defaultThreshold - Default threshold
     * @returns {number} Calculated threshold
     */
    calculateAdaptiveThreshold(videos, defaultThreshold = 100000) {
        if (videos.length === 0) return defaultThreshold;

        const viewCounts = videos.map(v => v.view_count).sort((a, b) => a - b);
        const median = viewCounts[Math.floor(viewCounts.length / 2)];

        // Use 50% of median or default threshold, whichever is lower
        return Math.min(Math.floor(median * 0.5), defaultThreshold);
    }
}

module.exports = YouTubeAPIService;
