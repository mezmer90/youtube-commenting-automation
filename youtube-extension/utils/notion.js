// Notion API Integration
// Enhanced from youtube-summarizer-v8.0-stripe
// Supports Notion API 2025-09-03 with data sources

class NotionIntegration {
  constructor(apiKey, dataSourceId = null) {
    this.apiKey = apiKey;
    this.dataSourceId = dataSourceId;
    this.apiVersion = '2022-06-28'; // Latest stable version
    this.baseUrl = 'https://api.notion.com/v1';
  }

  /**
   * Make authenticated request to Notion API
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

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Notion API error: ${error.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Notion API request failed:', error);
      throw error;
    }
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
      // Prepare page properties
      const properties = {
        'Name': {
          title: [{ text: { content: videoData.title || 'Untitled Video' } }]
        },
        'Video URL': {
          url: videoData.url
        },
        'Created': {
          date: { start: new Date().toISOString() }
        }
      };

      // Add optional properties if available
      if (videoData.channel) {
        properties['Channel'] = {
          rich_text: [{ text: { content: videoData.channel } }]
        };
      }

      if (videoData.duration) {
        properties['Duration'] = {
          rich_text: [{ text: { content: videoData.duration } }]
        };
      }

      if (videoData.viewCount) {
        const views = parseInt(videoData.viewCount.replace(/,/g, ''));
        if (!isNaN(views)) {
          properties['Views'] = { number: views };
        }
      }

      if (videoData.likeCount) {
        const likes = parseInt(videoData.likeCount.replace(/,/g, ''));
        if (!isNaN(likes)) {
          properties['Likes'] = { number: likes };
        }
      }

      properties['Status'] = {
        select: { name: 'Completed' }
      };

      properties['Commented'] = {
        checkbox: true
      };

      // Create content blocks
      const allBlocks = this.createContentBlocks(videoData);

      // Notion has a 100-block limit per request
      const initialBlocks = allBlocks.slice(0, 100);

      // Create page
      const page = await this.makeRequest('/pages', 'POST', {
        parent: {
          type: 'database_id',
          database_id: this.dataSourceId
        },
        properties: properties,
        children: initialBlocks
      });

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
            { text: { content: 'Channel: ', bold: true } },
            { text: { content: videoData.channel } }
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
              { text: { content: `[${chapter.timestamp}] `, bold: true } },
              { text: { content: chapter.title } }
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

      blocks.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: [{ text: { content: videoData.comment } }]
        }
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
      currentParagraph += (currentParagraph ? ' ' : '') + trimmed;
    }

    // Add final paragraph if exists
    if (currentParagraph) {
      blocks.push(this.createParagraphBlock(currentParagraph));
    }

    return blocks;
  }

  /**
   * Create paragraph block with text length limit
   */
  createParagraphBlock(text) {
    // Notion has a 2000 character limit per text block
    const maxLength = 2000;
    const truncated = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: truncated } }]
      }
    };
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
   * Create new database for category
   */
  async createDatabase(parentPageId, categoryName) {
    try {
      const response = await this.makeRequest('/databases', 'POST', {
        parent: { type: 'page_id', page_id: parentPageId },
        title: [{ text: { content: `${categoryName} - Video Summaries` } }],
        properties: {
          'Name': { title: {} },
          'Video URL': { url: {} },
          'Channel': { rich_text: {} },
          'Duration': { rich_text: {} },
          'Views': { number: { format: 'number' } },
          'Likes': { number: { format: 'number' } },
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
