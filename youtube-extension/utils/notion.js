// Notion API Integration
// Enhanced from youtube-summarizer-v8.0-stripe
// Supports Notion API 2025-09-03 with data sources

class NotionIntegration {
  constructor(apiKey, dataSourceId = null) {
    this.apiKey = apiKey;
    this.dataSourceId = dataSourceId;
    this.apiVersion = '2022-06-28'; // Latest stable version
    this.baseUrl = 'https://api.notion.com/v1';
    this.maxRetries = 3; // Maximum retry attempts
    this.retryDelays = [1000, 2000, 4000]; // Exponential backoff delays in ms
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Determine if error is retryable
   * @param {number} status - HTTP status code
   * @returns {boolean} - True if should retry
   */
  isRetryableError(status) {
    // Retry on rate limiting (429), server errors (500, 502, 503, 504)
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }

  /**
   * Make authenticated request to Notion API with retry logic
   */
  async makeRequest(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Notion-Version': this.apiVersion,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    let lastError = null;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const attemptLabel = attempt === 0 ? 'Initial' : `Retry ${attempt}/${this.maxRetries}`;
        console.log(`[NOTION API] ${attemptLabel} - ${method} ${endpoint}`);

        const response = await fetch(`${this.baseUrl}${endpoint}`, options);

        if (!response.ok) {
          const error = await response.json();
          console.error('[NOTION API] Error response:', error);
          console.error('[NOTION API] Status:', response.status);
          console.error('[NOTION API] Error code:', error.code);
          console.error('[NOTION API] Error message:', error.message);

          // Check if this is a retryable error
          if (attempt < this.maxRetries && this.isRetryableError(response.status)) {
            const delay = this.retryDelays[attempt];
            console.warn(`[NOTION API] ⚠️ Retryable error (${response.status}). Retrying in ${delay}ms...`);
            await this.sleep(delay);
            lastError = error;
            continue; // Retry
          }

          // Non-retryable error or max retries reached - provide detailed error message
          let detailedError = `Notion API error (${response.status}): ${error.message || response.statusText}`;

          if (error.code === 'validation_error') {
            detailedError += '\n\nValidation Error Details:';
            if (error.details) {
              detailedError += '\n' + JSON.stringify(error.details, null, 2);
            }
          }

          throw new Error(detailedError);
        }

        // Success!
        if (attempt > 0) {
          console.log(`[NOTION API] ✅ Succeeded after ${attempt} retry attempts`);
        }
        return await response.json();

      } catch (error) {
        // Network error or other exception
        if (error.message.includes('Notion API error')) {
          // This is our own error from above - don't retry
          throw error;
        }

        console.error(`[NOTION API] Request failed on attempt ${attempt + 1}:`, error.message);
        lastError = error;

        // Retry on network errors if not at max retries
        if (attempt < this.maxRetries) {
          const delay = this.retryDelays[attempt];
          console.warn(`[NOTION API] ⚠️ Network error. Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        // Max retries reached
        throw new Error(`Notion API request failed after ${this.maxRetries + 1} attempts: ${lastError.message}`);
      }
    }

    // Should not reach here, but just in case
    throw new Error(`Notion API request failed: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const response = await this.makeRequest('/users/me');
      return { success: true, user: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List all databases accessible to integration
   */
  async listDatabases() {
    try {
      const response = await this.makeRequest('/search', 'POST', {
        filter: { property: 'object', value: 'database' },
        page_size: 100
      });
      return response.results;
    } catch (error) {
      console.error('Error listing databases:', error);
      return [];
    }
  }

  /**
   * Get database properties
   */
  async getDatabaseProperties(databaseId) {
    try {
      const response = await this.makeRequest(`/databases/${databaseId}`);
      return response.properties;
    } catch (error) {
      console.error('Error getting database properties:', error);
      return null;
    }
  }

  /**
   * Ensure database has required properties for video summaries
   */
  async ensureDatabaseProperties() {
    if (!this.dataSourceId) {
      throw new Error('Data source ID not set');
    }

    try {
      const properties = await this.getDatabaseProperties(this.dataSourceId);

      const requiredProperties = {
        'Name': 'title',
        'Video URL': 'url',
        'Channel': 'rich_text',
        'Duration': 'rich_text',
        'Views': 'number',
        'Likes': 'number',
        'Created': 'date',
        'Status': 'select',
        'Commented': 'checkbox'
      };

      // Check if properties exist, create if missing
      const existingProps = Object.keys(properties || {});
      const missingProps = Object.keys(requiredProperties).filter(prop => !existingProps.includes(prop));

      if (missingProps.length > 0) {
        console.log('Missing properties:', missingProps);
        // Note: Creating properties requires updating database schema
        // This should be done manually or through separate admin API
      }

      return true;
    } catch (error) {
      console.error('Error ensuring database properties:', error);
      return false;
    }
  }

  /**
   * Save video summary to Notion
   */
  async saveSummary(videoData) {
    if (!this.dataSourceId) {
      throw new Error('Data source ID not set. Please configure Notion database.');
    }

    try {
      console.log('[NOTION] Saving video with ALL metadata:', {
        title: videoData.title,
        category: videoData.category,
        channel: videoData.channel,
        views: videoData.viewCount,
        likes: videoData.likeCount
      });

      // Prepare page properties with ALL metadata
      const properties = {
        'Name': {
          title: [{ text: { content: videoData.title || 'Untitled Video' } }]
        },
        'Created': {
          date: { start: new Date().toISOString() }
        },
        'Status': {
          select: { name: 'Completed' }
        },
        'Commented': {
          checkbox: true
        }
      };

      // Add Video URL (REQUIRED - validate it's a proper URL)
      if (videoData.url && this.isValidUrl(videoData.url)) {
        properties['Video URL'] = {
          url: videoData.url
        };
        console.log('[NOTION] ✅ Added Video URL:', videoData.url);
      } else {
        console.error('[NOTION] ❌ Invalid or missing video URL:', videoData.url);
        throw new Error('Video URL is required and must be a valid URL');
      }

      // Add Category (NEW!)
      if (videoData.category) {
        properties['Category'] = {
          rich_text: [{ text: { content: videoData.category } }]
        };
        console.log('[NOTION] ✅ Added Category:', videoData.category);
      }

      // Add Channel
      if (videoData.channel) {
        properties['Channel'] = {
          rich_text: [{ text: { content: videoData.channel } }]
        };
      }

      // Add Channel URL (validate it's a proper URL)
      if (videoData.channelUrl && this.isValidUrl(videoData.channelUrl)) {
        properties['Channel URL'] = {
          url: videoData.channelUrl
        };
      }

      // Add Duration
      if (videoData.duration) {
        properties['Duration'] = {
          rich_text: [{ text: { content: videoData.duration } }]
        };
      }

      // Add Views (as number)
      if (videoData.viewCount) {
        const views = parseInt(String(videoData.viewCount).replace(/,/g, ''));
        if (!isNaN(views)) {
          properties['Views'] = { number: views };
        }
      }

      // Add Likes (as number)
      if (videoData.likeCount) {
        const likes = parseInt(String(videoData.likeCount).replace(/,/g, ''));
        if (!isNaN(likes)) {
          properties['Likes'] = { number: likes };
        }
      }

      // Add Subscriber Count
      if (videoData.subscriberCount) {
        properties['Subscribers'] = {
          rich_text: [{ text: { content: videoData.subscriberCount } }]
        };
      }

      // Add Upload Date
      if (videoData.uploadDate) {
        properties['Upload Date'] = {
          rich_text: [{ text: { content: videoData.uploadDate } }]
        };
      }

      // Add Thumbnail (validate it's a proper URL)
      if (videoData.thumbnail && this.isValidUrl(videoData.thumbnail)) {
        properties['Thumbnail'] = {
          url: videoData.thumbnail
        };
      }

      // Validate we have the minimum required data
      console.log('[NOTION] Validating page data before creation...');
      console.log('[NOTION] Database ID:', this.dataSourceId);
      console.log('[NOTION] Title:', videoData.title);
      console.log('[NOTION] Properties count:', Object.keys(properties).length);

      if (!this.dataSourceId) {
        throw new Error('Database ID is missing. Cannot create page.');
      }

      // Create content blocks
      const allBlocks = this.createContentBlocks(videoData);
      console.log('[NOTION] Created', allBlocks.length, 'content blocks');

      // Notion has a 100-block limit per request
      const initialBlocks = allBlocks.slice(0, 100);

      // Create page with proper parent structure
      console.log('[NOTION] Creating page in Notion database...');
      const page = await this.makeRequest('/pages', 'POST', {
        parent: {
          type: 'database_id',
          database_id: this.dataSourceId
        },
        properties: properties,
        children: initialBlocks
      });

      console.log('[NOTION] ✅ Page created successfully:', page.id);

      // If more than 100 blocks, append in chunks
      if (allBlocks.length > 100) {
        await this.appendBlocksToPage(page.id, allBlocks.slice(100));
      }

      console.log('Successfully saved to Notion:', page.url);
      return { success: true, pageUrl: page.url, pageId: page.id };

    } catch (error) {
      console.error('Error saving to Notion:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Append blocks to existing page (for content over 100 blocks)
   */
  async appendBlocksToPage(pageId, blocks) {
    try {
      // Split into chunks of 100
      for (let i = 0; i < blocks.length; i += 100) {
        const chunk = blocks.slice(i, i + 100);
        await this.makeRequest(`/blocks/${pageId}/children`, 'PATCH', {
          children: chunk
        });

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      return true;
    } catch (error) {
      console.error('Error appending blocks:', error);
      return false;
    }
  }

  /**
   * Create Notion blocks from video data
   */
  createContentBlocks(videoData) {
    const blocks = [];

    // Add video info section
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: 'Video Information' } }]
      }
    });

    // Channel info
    if (videoData.channel) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'Channel: ' },
              annotations: {
                bold: true,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default'
              }
            },
            {
              type: 'text',
              text: { content: videoData.channel },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default'
              }
            }
          ]
        }
      });
    }

    // Video stats
    const statsText = [];
    if (videoData.viewCount) statsText.push(`Views: ${videoData.viewCount}`);
    if (videoData.likeCount) statsText.push(`Likes: ${videoData.likeCount}`);
    if (videoData.duration) statsText.push(`Duration: ${videoData.duration}`);

    if (statsText.length > 0) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: statsText.join(' • ') } }]
        }
      });
    }

    // Add summary section if available
    if (videoData.summary) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Summary' } }]
        }
      });

      // Convert summary text to blocks
      const summaryBlocks = this.textToBlocks(videoData.summary);
      blocks.push(...summaryBlocks);
    }

    // Add chapters if available
    if (videoData.chapters && videoData.chapters.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Chapters' } }]
        }
      });

      videoData.chapters.forEach(chapter => {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: { content: `[${chapter.timestamp}] ` },
                annotations: {
                  bold: true,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default'
                }
              },
              {
                type: 'text',
                text: { content: chapter.title },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: 'default'
                }
              }
            ]
          }
        });
      });
    }

    // Add key takeaways if available
    if (videoData.takeaways && videoData.takeaways.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Key Takeaways' } }]
        }
      });

      videoData.takeaways.forEach(takeaway => {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ text: { content: takeaway } }]
          }
        });
      });
    }

    // Add comment if available
    if (videoData.comment) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Posted Comment' } }]
        }
      });

      // Split long comments into multiple quote blocks (2000 char limit per block)
      const commentChunks = this.splitTextIntoChunks(videoData.comment, 2000);
      commentChunks.forEach(chunk => {
        blocks.push({
          object: 'block',
          type: 'quote',
          quote: {
            rich_text: [{ text: { content: chunk } }]
          }
        });
      });
    }

    // Add transcript link if available
    if (videoData.transcript) {
      blocks.push({
        object: 'block',
        type: 'divider',
        divider: {}
      });

      blocks.push({
        object: 'block',
        type: 'toggle',
        toggle: {
          rich_text: [{ text: { content: 'Full Transcript' } }],
          children: this.textToBlocks(videoData.transcript).slice(0, 90) // Limit nested blocks
        }
      });
    }

    return blocks;
  }

  /**
   * Convert markdown/plain text to Notion blocks
   */
  textToBlocks(text) {
    if (!text) return [];

    const blocks = [];
    const lines = text.split('\n');
    let currentParagraph = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        if (currentParagraph) {
          blocks.push(this.createParagraphBlock(currentParagraph));
          currentParagraph = '';
        }
        continue;
      }

      // Handle headings
      if (trimmed.startsWith('# ')) {
        if (currentParagraph) {
          blocks.push(this.createParagraphBlock(currentParagraph));
          currentParagraph = '';
        }
        blocks.push({
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [{ text: { content: trimmed.substring(2) } }]
          }
        });
        continue;
      }

      if (trimmed.startsWith('## ')) {
        if (currentParagraph) {
          blocks.push(this.createParagraphBlock(currentParagraph));
          currentParagraph = '';
        }
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: trimmed.substring(3) } }]
          }
        });
        continue;
      }

      if (trimmed.startsWith('### ')) {
        if (currentParagraph) {
          blocks.push(this.createParagraphBlock(currentParagraph));
          currentParagraph = '';
        }
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ text: { content: trimmed.substring(4) } }]
          }
        });
        continue;
      }

      // Handle bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (currentParagraph) {
          blocks.push(this.createParagraphBlock(currentParagraph));
          currentParagraph = '';
        }
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ text: { content: trimmed.substring(2) } }]
          }
        });
        continue;
      }

      // Handle numbered lists
      if (trimmed.match(/^\d+\.\s/)) {
        if (currentParagraph) {
          blocks.push(this.createParagraphBlock(currentParagraph));
          currentParagraph = '';
        }
        const text = trimmed.replace(/^\d+\.\s/, '');
        blocks.push({
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [{ text: { content: text } }]
          }
        });
        continue;
      }

      // Accumulate regular lines into paragraph
      const newContent = (currentParagraph ? ' ' : '') + trimmed;

      // Check if adding this line would exceed the limit
      if (currentParagraph.length + newContent.length > 1900) {
        // Flush current paragraph and start new one
        blocks.push(this.createParagraphBlock(currentParagraph));
        currentParagraph = trimmed;
      } else {
        currentParagraph += newContent;
      }
    }

    // Add final paragraph if exists
    if (currentParagraph) {
      blocks.push(this.createParagraphBlock(currentParagraph));
    }

    return blocks;
  }

  /**
   * Create paragraph block(s) with text length limit
   * If text exceeds 2000 chars, returns multiple paragraph blocks
   */
  createParagraphBlock(text) {
    // Notion has a 2000 character limit per text block
    const maxLength = 2000;

    // If text fits in one block, return single block
    if (text.length <= maxLength) {
      return {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: text } }]
        }
      };
    }

    // Text is too long - this shouldn't happen if textToBlocks is working correctly
    // but as a safety measure, return the first 2000 chars with ellipsis
    console.warn('[NOTION] Single paragraph exceeds 2000 chars, truncating:', text.length);
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: text.substring(0, maxLength - 3) + '...' } }]
      }
    };
  }

  /**
   * Split long text into chunks respecting Notion's character limit
   * @param {string} text - Text to split
   * @param {number} maxLength - Maximum characters per chunk (default 2000)
   * @returns {Array<string>} Array of text chunks
   */
  splitTextIntoChunks(text, maxLength = 2000) {
    if (!text || text.length <= maxLength) {
      return [text];
    }

    const chunks = [];
    let remainingText = text;

    while (remainingText.length > 0) {
      if (remainingText.length <= maxLength) {
        chunks.push(remainingText);
        break;
      }

      // Try to split at a natural break point (paragraph, sentence, or word)
      let splitIndex = maxLength;

      // Look for paragraph break
      const lastParagraph = remainingText.lastIndexOf('\n\n', maxLength);
      if (lastParagraph > maxLength * 0.5) {
        splitIndex = lastParagraph + 2;
      } else {
        // Look for sentence break
        const lastSentence = Math.max(
          remainingText.lastIndexOf('. ', maxLength),
          remainingText.lastIndexOf('! ', maxLength),
          remainingText.lastIndexOf('? ', maxLength)
        );
        if (lastSentence > maxLength * 0.5) {
          splitIndex = lastSentence + 2;
        } else {
          // Look for word break
          const lastSpace = remainingText.lastIndexOf(' ', maxLength);
          if (lastSpace > maxLength * 0.5) {
            splitIndex = lastSpace + 1;
          }
        }
      }

      chunks.push(remainingText.substring(0, splitIndex).trim());
      remainingText = remainingText.substring(splitIndex).trim();
    }

    return chunks;
  }

  /**
   * Update page properties
   */
  async updatePage(pageId, properties) {
    try {
      const response = await this.makeRequest(`/pages/${pageId}`, 'PATCH', {
        properties: properties
      });
      return { success: true, page: response };
    } catch (error) {
      console.error('Error updating page:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search for existing page by video URL
   */
  async findPageByVideoUrl(videoUrl) {
    try {
      const response = await this.makeRequest('/search', 'POST', {
        filter: {
          property: 'object',
          value: 'page'
        },
        query: videoUrl
      });

      // Check if any results match the video URL
      for (const page of response.results) {
        const urlProp = page.properties['Video URL'];
        if (urlProp?.url === videoUrl) {
          return page;
        }
      }

      return null;
    } catch (error) {
      console.error('Error searching for page:', error);
      return null;
    }
  }

  /**
   * Validate if string is a valid URL
   * @param {string} urlString - URL to validate
   * @returns {boolean} - True if valid URL
   */
  isValidUrl(urlString) {
    try {
      const url = new URL(urlString);
      // Check if it's http or https protocol
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  /**
   * Create new database for category
   */
  async createDatabase(parentPageId, categoryName) {
    try {
      const response = await this.makeRequest('/databases', 'POST', {
        parent: { type: 'page_id', page_id: parentPageId },
        title: [{ text: { content: `${categoryName} - Video Summaries` } }],
        icon: { type: 'emoji', emoji: '🎥' },
        properties: {
          'Name': { title: {} },
          'Video URL': { url: {} },
          'Category': { rich_text: {} },
          'Channel': { rich_text: {} },
          'Channel URL': { url: {} },
          'Duration': { rich_text: {} },
          'Views': { number: { format: 'number' } },
          'Likes': { number: { format: 'number' } },
          'Subscribers': { rich_text: {} },
          'Upload Date': { rich_text: {} },
          'Thumbnail': { url: {} },
          'Created': { date: {} },
          'Status': {
            select: {
              options: [
                { name: 'Pending', color: 'gray' },
                { name: 'Processing', color: 'yellow' },
                { name: 'Completed', color: 'green' },
                { name: 'Failed', color: 'red' }
              ]
            }
          },
          'Commented': { checkbox: {} }
        }
      });

      console.log('Database created:', response.url);
      return { success: true, database: response };
    } catch (error) {
      console.error('Error creating database:', error);
      return { success: false, error: error.message };
    }
  }
}
