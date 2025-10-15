// API utility for backend communication

class API {
  constructor(baseURL) {
    this.baseURL = baseURL || CONFIG.API_BASE_URL;
  }

  /**
   * GET request to backend
   */
  async get(endpoint) {
    console.log(`[API] GET request to: ${this.baseURL}${endpoint}`);
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`[API] GET response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('[API] Error response body:', errorData);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          console.error('[API] Could not parse error response');
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(`[API] GET response data:`, data);
      return data;
    } catch (error) {
      console.error(`[API] ❌ GET Error (${endpoint}):`, error);
      console.error('[API] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * POST request to backend
   */
  async post(endpoint, data) {
    console.log(`[API] POST request to: ${this.baseURL}${endpoint}`);
    console.log(`[API] POST body:`, data);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      console.log(`[API] POST response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('[API] Error response body:', errorData);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          console.error('[API] Could not parse error response');
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log(`[API] POST response data:`, responseData);
      return responseData;
    } catch (error) {
      console.error(`[API] ❌ POST Error (${endpoint}):`, error);
      console.error('[API] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get all categories
   */
  async getCategories() {
    return await this.get('/api/categories');
  }

  /**
   * Get next video to process
   */
  async getNextVideo(categoryId) {
    return await this.get(`/api/videos/next?category_id=${categoryId}`);
  }

  /**
   * Process transcript with AI (summary + comment)
   */
  async processVideo(transcript, metadata, commentType = null) {
    return await this.post('/api/ai/process', {
      transcript,
      metadata,
      comment_type: commentType
    });
  }

  /**
   * Update video status after commenting
   */
  async updateVideoStatus(data) {
    return await this.post('/api/videos/update-status', data);
  }

  /**
   * Get daily progress
   */
  async getDailyProgress() {
    return await this.get('/api/progress/daily');
  }

  /**
   * Increment daily progress counter
   */
  async incrementProgress(categoryId, categoryName) {
    return await this.post('/api/progress/increment', {
      category_id: categoryId,
      category_name: categoryName
    });
  }

  /**
   * Get promo texts from settings
   */
  async getPromoTexts() {
    // Note: Backend doesn't have this endpoint yet, using placeholder
    // You can add this endpoint or hardcode promo texts
    return {
      success: true,
      promos: [
        "This summary was generated with VideoSum AI",
        "Generated chapter breakdown using www.videosum.ai",
        "Want to summarize other videos? Search for VideoSum AI on Google",
        "This breakdown was created by VideoSum - AI-powered video analysis"
      ]
    };
  }
}

// Create singleton instance
const api = new API();
