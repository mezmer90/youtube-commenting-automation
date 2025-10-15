// Configuration file for the YouTube Commenter Extension

const CONFIG = {
  // Backend API URL
  API_BASE_URL: 'https://youtube-commenting-automation-production.up.railway.app',

  // Daily video limit
  DAILY_LIMIT: 100,

  // Timezone for daily reset (GMT+5:30 IST)
  TIMEZONE: 'Asia/Kolkata',
  TIMEZONE_OFFSET: 330, // Minutes offset from UTC

  // Comment types
  COMMENT_TYPES: ['summary', 'chapters', 'takeaways'],

  // Promo text positions
  PROMO_POSITIONS: ['top', 'bottom'],

  // Delays (in milliseconds)
  DELAYS: {
    PAGE_LOAD: 3000,        // Wait for YouTube page to load
    TRANSCRIPT_LOAD: 2000,  // Wait for transcript to load
    COMMENT_BOX: 1000,      // Wait for comment box to appear
    PROCESSING: 5000        // Wait during AI processing
  },

  // Storage keys
  STORAGE_KEYS: {
    SELECTED_CATEGORY: 'selectedCategory',
    DAILY_PROGRESS: 'dailyProgress',
    LAST_RESET_DATE: 'lastResetDate',
    CURRENT_VIDEO: 'currentVideo',
    NOTION_DATABASES: 'notionDatabases',
    IS_PROCESSING: 'isProcessing'
  },

  // Status values
  STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed'
  }
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
