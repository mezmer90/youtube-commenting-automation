// Enhanced metadata extraction from YouTube DOM
// Extracted from youtube-summarizer-v8.0-stripe

class MetadataExtractor {
  /**
   * Get comprehensive video metadata from DOM
   */
  static async getEnhancedVideoInfo() {
    try {
      // Get video ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const videoId = urlParams.get('v') || 'unknown';

      // Extract all metadata
      const title = this.getVideoTitle();
      const channel = this.getChannelName();
      const channelUrl = this.getChannelUrl();
      const duration = this.getDuration();
      const viewCount = this.getViewCount();
      const likeCount = this.getLikeCount();
      const thumbnail = this.getThumbnail(videoId);
      const description = this.getDescription();
      const uploadDate = this.getUploadDate();
      const subscriberCount = this.getSubscriberCount();

      return {
        videoId,
        url: window.location.href,
        title,
        channel,
        channelUrl,
        duration,
        viewCount,
        likeCount,
        thumbnail,
        description,
        uploadDate,
        subscriberCount
      };
    } catch (error) {
      console.error('Error extracting metadata:', error);
      return this.getFallbackMetadata();
    }
  }

  /**
   * Extract video title
   */
  static getVideoTitle() {
    // Try meta tag first
    const metaTitle = document.querySelector('meta[name="title"]')?.getAttribute('content')?.trim();

    // Try primary info renderer
    const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string');
    const domTitle = titleElement?.textContent?.trim();

    // Try document title
    const docTitle = document.title.replace(' - YouTube', '').trim();

    return domTitle || metaTitle || docTitle || 'Untitled Video';
  }

  /**
   * Extract channel name
   */
  static getChannelName() {
    // Try multiple selectors
    const selectors = [
      'ytd-channel-name yt-formatted-string a',
      'ytd-video-owner-renderer .ytd-channel-name a',
      '#owner-name a',
      '#channel-name a',
      'yt-formatted-string.ytd-channel-name a'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    return 'Unknown Channel';
  }

  /**
   * Extract channel URL
   */
  static getChannelUrl() {
    const selectors = [
      'ytd-channel-name a',
      'ytd-video-owner-renderer a.yt-simple-endpoint',
      '#owner-name a'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.href) {
        return element.href;
      }
    }

    return '';
  }

  /**
   * Extract video duration
   */
  static getDuration() {
    // Try player time display
    const timeDisplay = document.querySelector('.ytp-time-duration');
    if (timeDisplay?.textContent?.trim()) {
      return timeDisplay.textContent.trim();
    }

    // Try video length meta
    const metaDuration = document.querySelector('meta[itemprop="duration"]')?.getAttribute('content');
    if (metaDuration) {
      return this.parseDuration(metaDuration);
    }

    // Try transcript timestamp
    if (window.lastTranscriptTimestamp) {
      return window.lastTranscriptTimestamp;
    }

    return '';
  }

  /**
   * Parse ISO 8601 duration (PT1H2M3S) to readable format
   */
  static parseDuration(isoDuration) {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return isoDuration;

    const hours = match[1] || '0';
    const minutes = match[2] || '0';
    const seconds = match[3] || '0';

    if (hours !== '0') {
      return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.padStart(2, '0')}`;
    }
  }

  /**
   * Extract view count
   */
  static getViewCount() {
    // Try multiple selectors
    const selectors = [
      'ytd-video-view-count-renderer span.view-count',
      '#info span.view-count',
      '#count .ytd-video-view-count-renderer',
      'ytd-video-view-count-renderer .view-count'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.trim();
      if (text) {
        // Extract number from text like "1,234,567 views"
        const match = text.match(/[\d,]+/);
        if (match) {
          return match[0].replace(/,/g, '');
        }
      }
    }

    return '0';
  }

  /**
   * Extract like count
   */
  static getLikeCount() {
    // Try segmented like button
    const likeButton = document.querySelector('like-button-view-model button[aria-label*="like"]');
    if (likeButton) {
      const ariaLabel = likeButton.getAttribute('aria-label');
      const match = ariaLabel?.match(/[\d,]+/);
      if (match) {
        return match[0].replace(/,/g, '');
      }
    }

    // Try legacy like button
    const legacyLike = document.querySelector('yt-formatted-string.ytd-toggle-button-renderer#text[aria-label*="like"]');
    if (legacyLike) {
      const text = legacyLike.textContent?.trim();
      const match = text?.match(/[\d,]+/);
      if (match) {
        return match[0].replace(/,/g, '');
      }
    }

    return '0';
  }

  /**
   * Get thumbnail URL
   */
  static getThumbnail(videoId) {
    // Try meta tag first
    const metaThumbnail = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    if (metaThumbnail) {
      return metaThumbnail;
    }

    // Fallback to default YouTube thumbnail
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  /**
   * Extract video description
   */
  static getDescription() {
    // Try meta description
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
    if (metaDescription) {
      return metaDescription;
    }

    // Try description renderer
    const descElement = document.querySelector('ytd-expander.ytd-video-secondary-info-renderer #description');
    if (descElement?.textContent?.trim()) {
      return descElement.textContent.trim();
    }

    // Try structured data
    const structuredData = document.querySelector('script[type="application/ld+json"]');
    if (structuredData) {
      try {
        const data = JSON.parse(structuredData.textContent);
        if (data.description) {
          return data.description;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    return '';
  }

  /**
   * Extract upload date
   */
  static getUploadDate() {
    // Try meta tag
    const metaDate = document.querySelector('meta[itemprop="uploadDate"]')?.getAttribute('content');
    if (metaDate) {
      return metaDate;
    }

    // Try date text in info section
    const dateElement = document.querySelector('#info-strings yt-formatted-string');
    if (dateElement?.textContent?.trim()) {
      return dateElement.textContent.trim();
    }

    return '';
  }

  /**
   * Extract subscriber count
   */
  static getSubscriberCount() {
    // Try owner renderer
    const subElement = document.querySelector('#owner-sub-count');
    if (subElement?.textContent?.trim()) {
      const text = subElement.textContent.trim();
      // Extract number from text like "1.2M subscribers"
      const match = text.match(/[\d.]+[KMB]?/);
      if (match) {
        return match[0];
      }
    }

    return '';
  }

  /**
   * Fallback metadata if extraction fails
   */
  static getFallbackMetadata() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v') || 'unknown';

    return {
      videoId,
      url: window.location.href,
      title: document.title.replace(' - YouTube', ''),
      channel: 'Unknown Channel',
      channelUrl: '',
      duration: '',
      viewCount: '0',
      likeCount: '0',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      description: '',
      uploadDate: '',
      subscriberCount: ''
    };
  }
}
