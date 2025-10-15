// YouTube utility functions for transcript extraction and comment posting
// Enhanced with logic from youtube-summarizer-v8.0-stripe

class YouTubeUtils {
  /**
   * Extract video ID from YouTube URL
   */
  static getVideoId(url) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('v');
  }

  /**
   * Extract transcript from YouTube page using YouTube's built-in panel
   * Enhanced version from existing extension
   */
  static async getTranscript() {
    try {
      console.log('Extracting transcript...');

      // Try to open transcript panel
      const transcriptPanel = await this.openTranscriptPanel();

      if (!transcriptPanel) {
        console.log('Could not open transcript panel');
        return null;
      }

      // Wait for transcript segments to load
      await this.wait(2000);

      // Extract transcript segments
      const segments = document.querySelectorAll('ytd-transcript-segment-renderer');

      if (!segments || segments.length === 0) {
        console.log('No transcript segments found');
        return null;
      }

      let transcript = '';
      let lastTimestamp = '';

      segments.forEach(segment => {
        const timeElement = segment.querySelector('.segment-timestamp');
        const textElement = segment.querySelector('.segment-text');

        if (timeElement && textElement) {
          const time = timeElement.textContent.trim();
          const text = textElement.textContent.trim();
          transcript += `[${time}] ${text}\n`;
          lastTimestamp = time;
        }
      });

      // Store the duration based on last timestamp
      if (lastTimestamp) {
        window.lastTranscriptTimestamp = lastTimestamp;
        console.log(`Video duration from transcript: ${lastTimestamp}`);
      }

      console.log(`Transcript extracted: ${segments.length} segments`);
      return transcript;

    } catch (error) {
      console.error('Error extracting transcript:', error);
      return null;
    }
  }

  /**
   * Open transcript panel
   * Enhanced logic from existing extension
   */
  static async openTranscriptPanel() {
    try {
      // Check if transcript panel is already open
      const openPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]');

      if (openPanel && openPanel.getAttribute('visibility') === 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED') {
        return openPanel;
      }

      // First, expand description if needed
      const expandButton = document.querySelector('tp-yt-paper-button#expand');
      if (expandButton && expandButton.textContent.includes('more')) {
        expandButton.click();
        await this.wait(500);
      }

      // Look for transcript button in description
      let transcriptButton = Array.from(document.querySelectorAll('button, yt-button-renderer, tp-yt-paper-button'))
        .find(btn => btn.textContent.toLowerCase().includes('transcript'));

      if (transcriptButton) {
        transcriptButton.click();
        await this.wait(1000);
        return document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]');
      }

      // Try the three-dot menu
      const moreButton = document.querySelector('button[aria-label="More actions"]');
      if (moreButton) {
        moreButton.click();
        await this.wait(500);

        const menuItems = document.querySelectorAll('[role="menuitem"]');
        for (const item of menuItems) {
          if (item.textContent.toLowerCase().includes('transcript')) {
            item.click();
            await this.wait(1000);
            return document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]');
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error opening transcript panel:', error);
      return null;
    }
  }

  /**
   * Check if transcript is available on this video
   * Robust implementation with longer waits and multiple retries
   */
  static async hasTranscript() {
    try {
      console.log('[hasTranscript] Starting check...');

      // STEP 1: Wait for page to be fully loaded (max 8 seconds)
      console.log('[hasTranscript] Waiting for main content to load...');
      let mainContentLoaded = false;
      for (let i = 0; i < 16; i++) {
        const mainContent = document.querySelector('ytd-watch-flexy');
        if (mainContent) {
          console.log(`[hasTranscript] ✅ Main content loaded after ${(i + 1) * 500}ms`);
          mainContentLoaded = true;
          break;
        }
        await this.wait(500);
      }

      if (!mainContentLoaded) {
        console.warn('[hasTranscript] ⚠️ Main content did not load, assuming no transcript');
        return false;
      }

      // STEP 2: Wait additional 2 seconds for description area to fully render
      console.log('[hasTranscript] Waiting for description area to render...');
      await this.wait(2000);

      // STEP 3: Try to expand description (with retries)
      console.log('[hasTranscript] Looking for expand button...');
      for (let attempt = 0; attempt < 3; attempt++) {
        const expandButton = document.querySelector('tp-yt-paper-button#expand');
        if (expandButton && expandButton.textContent.includes('more')) {
          console.log('[hasTranscript] Clicking expand button');
          expandButton.click();
          await this.wait(1000);
          break;
        }
        if (attempt < 2) await this.wait(500);
      }

      // STEP 4: Look for transcript button (with multiple retries)
      console.log('[hasTranscript] Searching for transcript button...');
      for (let attempt = 0; attempt < 5; attempt++) {
        // Method 1: Look for button/element with "transcript" text
        const transcriptButton = Array.from(document.querySelectorAll('button, yt-button-renderer, tp-yt-paper-button, a'))
          .find(btn => btn.textContent.toLowerCase().includes('transcript'));

        if (transcriptButton) {
          console.log(`[hasTranscript] ✅ Found transcript button on attempt ${attempt + 1}`);
          return true;
        }

        // Method 2: Check for transcript panel (might already be open)
        const transcriptPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]');
        if (transcriptPanel) {
          console.log(`[hasTranscript] ✅ Found transcript panel on attempt ${attempt + 1}`);
          return true;
        }

        // Wait before next attempt
        if (attempt < 4) {
          console.log(`[hasTranscript] Attempt ${attempt + 1}/5 - not found yet, waiting...`);
          await this.wait(1000);
        }
      }

      console.log('[hasTranscript] ❌ No transcript found after all attempts');
      return false;

    } catch (error) {
      console.error('[hasTranscript] ❌ Error during transcript check:', error);
      // Fail-safe: if error, assume no transcript
      return false;
    }
  }

  /**
   * Get enhanced video metadata from DOM
   * Uses MetadataExtractor from existing extension
   */
  static async getVideoMetadata() {
    try {
      // Wait for MetadataExtractor to be injected (max 5 seconds)
      for (let i = 0; i < 10; i++) {
        if (window.MetadataExtractor) {
          const metadata = await window.MetadataExtractor.getEnhancedVideoInfo();
          return metadata;
        }
        await this.wait(500);
      }

      // If MetadataExtractor not available, use fallback
      console.warn('MetadataExtractor not available, using fallback');
      return this.getBasicMetadata();
    } catch (error) {
      console.error('Error getting metadata:', error);
      return this.getBasicMetadata();
    }
  }

  /**
   * Basic metadata extraction (fallback)
   */
  static getBasicMetadata() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v') || 'unknown';

    const title = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string')?.textContent?.trim() ||
                  document.title.replace(' - YouTube', '');

    const channel = document.querySelector('ytd-channel-name yt-formatted-string a')?.textContent?.trim() || 'Unknown Channel';

    const viewElement = document.querySelector('ytd-video-view-count-renderer span.view-count');
    const viewText = viewElement?.textContent?.trim() || '0';
    const viewMatch = viewText.match(/[\d,]+/);
    const views = viewMatch ? viewMatch[0].replace(/,/g, '') : '0';

    return {
      videoId,
      url: window.location.href,
      title,
      channel,
      channelUrl: document.querySelector('ytd-channel-name a')?.href || '',
      viewCount: views,
      duration: document.querySelector('.ytp-time-duration')?.textContent?.trim() || '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      description: '',
      uploadDate: '',
      subscriberCount: ''
    };
  }

  /**
   * Open comment box and fill with generated comment
   */
  static async fillCommentBox(commentText) {
    try {
      console.log('Filling comment box...');

      // Scroll to comments section and wait for it to load
      console.log('Scrolling to comments section...');
      const commentsSection = document.querySelector('ytd-comments');
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        await this.wait(2000); // Wait longer for comments to load
      }

      // Wait for comment box to appear (retry mechanism)
      let commentBox = null;
      for (let i = 0; i < 10; i++) {
        commentBox = document.querySelector('#placeholder-area');
        if (commentBox) {
          console.log(`Comment box found on attempt ${i + 1}`);
          break;
        }
        console.log(`Waiting for comment box... attempt ${i + 1}/10`);
        await this.wait(1000);
      }

      if (!commentBox) {
        throw new Error('Comment box not found after 10 attempts');
      }

      // Click on comment box to activate it
      console.log('Clicking comment box...');
      commentBox.click();
      await this.wait(CONFIG.DELAYS.COMMENT_BOX || 2000);

      // Wait for editable div to appear
      let editableDiv = null;
      for (let i = 0; i < 5; i++) {
        editableDiv = document.querySelector('#contenteditable-root');
        if (editableDiv) {
          console.log(`Editable div found on attempt ${i + 1}`);
          break;
        }
        console.log(`Waiting for editable div... attempt ${i + 1}/5`);
        await this.wait(500);
      }

      if (!editableDiv) {
        throw new Error('Comment input field not found');
      }

      // Set the text
      console.log('Setting comment text...');
      editableDiv.textContent = commentText;

      // Trigger input event to enable submit button
      editableDiv.dispatchEvent(new Event('input', { bubbles: true }));

      console.log('Comment text inserted successfully');
      return true;

    } catch (error) {
      console.error('Error filling comment box:', error);
      throw error;
    }
  }

  /**
   * Check if user is logged in to YouTube (with retry for page load)
   */
  static async isLoggedIn(maxAttempts = 10, delayMs = 500) {
    console.log('[YouTubeUtils] ===== CHECKING LOGIN STATUS =====');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[YouTubeUtils] Attempt ${attempt}/${maxAttempts}`);

      const result = this.checkLoginElements();

      if (result === true) {
        console.log(`[YouTubeUtils] ✅ Login confirmed on attempt ${attempt}`);
        return true;
      }

      if (result === false) {
        console.log(`[YouTubeUtils] ❌ Not logged in (found sign-in button) on attempt ${attempt}`);
        return false;
      }

      // result === null means elements not loaded yet, retry
      if (attempt < maxAttempts) {
        console.log(`[YouTubeUtils] Elements not loaded yet, waiting ${delayMs}ms...`);
        await this.wait(delayMs);
      }
    }

    console.log('[YouTubeUtils] ⚠️ Could not determine login status after all attempts');
    return false;
  }

  /**
   * Check for login elements (returns true/false/null)
   * null = elements not loaded yet
   */
  static checkLoginElements() {
    console.log('[YouTubeUtils] Checking for login elements...');

    // First check: is topbar loaded at all?
    const topbar = document.querySelector('ytd-masthead');
    console.log('[YouTubeUtils] Topbar loaded:', topbar !== null);
    if (!topbar) {
      console.log('[YouTubeUtils] Topbar not loaded yet, page still loading');
      return null; // Page not loaded yet
    }

    // Method 1: Check for avatar button (only visible when logged in)
    const avatarButton = document.querySelector('button#avatar-btn');
    console.log('[YouTubeUtils] Method 1 - Avatar button (#avatar-btn):', avatarButton !== null);
    if (avatarButton) {
      console.log('[YouTubeUtils] ✅ Found avatar button, user is logged in');
      return true;
    }

    // Method 2: Check for topbar menu button renderer
    const ytdTopbar = document.querySelector('ytd-topbar-menu-button-renderer#avatar-btn');
    console.log('[YouTubeUtils] Method 2 - Topbar menu button renderer:', ytdTopbar !== null);
    if (ytdTopbar) {
      console.log('[YouTubeUtils] ✅ Found topbar button, user is logged in');
      return true;
    }

    // Method 3: Check for account icon with aria-label
    const accountIcon = document.querySelector('button[aria-label*="Account"]');
    console.log('[YouTubeUtils] Method 3 - Account icon button:', accountIcon !== null);
    if (accountIcon) {
      console.log('[YouTubeUtils] ✅ Found account icon, user is logged in');
      return true;
    }

    // Method 4: Check for user avatar image
    const avatarImgs = document.querySelectorAll('ytd-masthead img');
    console.log('[YouTubeUtils] Method 4 - Avatar images in masthead:', avatarImgs.length);
    for (const img of avatarImgs) {
      if (img.src && img.src.includes('googleusercontent.com')) {
        console.log('[YouTubeUtils] ✅ Found user avatar image, user is logged in');
        return true;
      }
    }

    // Method 5: Check for ytd-topbar-menu-button-renderer (any)
    const anyTopbarButton = document.querySelector('ytd-topbar-menu-button-renderer');
    console.log('[YouTubeUtils] Method 5 - Any topbar button:', anyTopbarButton !== null);
    if (anyTopbarButton) {
      console.log('[YouTubeUtils] ✅ Found topbar button, user is logged in');
      return true;
    }

    // Method 6: Check if "Sign in" button exists (if it does, user is NOT logged in)
    const signInButton = document.querySelector('a[href*="accounts.google.com/ServiceLogin"]');
    const signInLink = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Sign in');
    console.log('[YouTubeUtils] Method 6 - Sign in button/link found:', (signInButton || signInLink) !== null);
    if (signInButton || signInLink) {
      console.log('[YouTubeUtils] ❌ Sign in button found, user is NOT logged in');
      return false;
    }

    // Method 7: Check for ytd-guide-renderer (sidebar, only available when logged in)
    const guideRenderer = document.querySelector('ytd-guide-renderer');
    console.log('[YouTubeUtils] Method 7 - Guide renderer (sidebar):', guideRenderer !== null);
    if (guideRenderer) {
      console.log('[YouTubeUtils] ✅ Found guide renderer, likely logged in');
      return true;
    }

    console.log('[YouTubeUtils] ⚠️ Could not determine login status');
    console.log('[YouTubeUtils] Dumping page state for debugging:');
    console.log('[YouTubeUtils] All buttons:', document.querySelectorAll('button').length);
    console.log('[YouTubeUtils] All images:', document.querySelectorAll('img').length);
    console.log('[YouTubeUtils] All links:', document.querySelectorAll('a').length);

    return null; // Could not determine, need to retry
  }

  /**
   * Check if video description has chapter timestamps (0:00 or 00:00)
   * Similar logic to hasTranscript() with proper waits and retries
   */
  static async hasChaptersInDescription() {
    try {
      console.log('[hasChaptersInDescription] Starting check...');

      // STEP 1: Wait for page to be fully loaded (max 8 seconds)
      console.log('[hasChaptersInDescription] Waiting for main content to load...');
      let mainContentLoaded = false;
      for (let i = 0; i < 16; i++) {
        const mainContent = document.querySelector('ytd-watch-flexy');
        if (mainContent) {
          console.log(`[hasChaptersInDescription] ✅ Main content loaded after ${(i + 1) * 500}ms`);
          mainContentLoaded = true;
          break;
        }
        await this.wait(500);
      }

      if (!mainContentLoaded) {
        console.warn('[hasChaptersInDescription] ⚠️ Main content did not load, assuming no chapters');
        return false;
      }

      // STEP 2: Wait additional 2 seconds for description area to fully render
      console.log('[hasChaptersInDescription] Waiting for description area to render...');
      await this.wait(2000);

      // STEP 3: Try to expand description (with retries)
      console.log('[hasChaptersInDescription] Looking for expand button...');
      for (let attempt = 0; attempt < 3; attempt++) {
        const expandButton = document.querySelector('tp-yt-paper-button#expand');
        if (expandButton && expandButton.textContent.includes('more')) {
          console.log('[hasChaptersInDescription] Clicking expand button');
          expandButton.click();
          await this.wait(1000);
          break;
        }
        if (attempt < 2) await this.wait(500);
      }

      // STEP 4: Check description for "0:00" or "00:00" (with multiple retries)
      console.log('[hasChaptersInDescription] Searching for chapter timestamps...');
      for (let attempt = 0; attempt < 5; attempt++) {
        const descriptionElement = document.querySelector('#expanded, #description');

        if (descriptionElement) {
          const descriptionText = descriptionElement.textContent || '';
          console.log(`[hasChaptersInDescription] Description text length: ${descriptionText.length}`);

          // Check for 0:00 or 00:00
          if (/\b0?0:00\b/.test(descriptionText)) {
            console.log(`[hasChaptersInDescription] ✅ Found chapter timestamps on attempt ${attempt + 1}`);
            return true;
          }
        }

        // Wait before next attempt
        if (attempt < 4) {
          console.log(`[hasChaptersInDescription] Attempt ${attempt + 1}/5 - not found yet, waiting...`);
          await this.wait(1000);
        }
      }

      console.log('[hasChaptersInDescription] ❌ No chapter timestamps found after all attempts');
      return false;

    } catch (error) {
      console.error('[hasChaptersInDescription] ❌ Error during chapter check:', error);
      // Fail-safe: if error, assume no chapters
      return false;
    }
  }

  /**
   * Get random promo text and position
   */
  static getRandomPromo(promoTexts) {
    const randomPromo = promoTexts[Math.floor(Math.random() * promoTexts.length)];
    const randomPosition = CONFIG.PROMO_POSITIONS[Math.floor(Math.random() * CONFIG.PROMO_POSITIONS.length)];
    return { promo: randomPromo, position: randomPosition };
  }

  /**
   * Add promo text to comment
   */
  static addPromoToComment(comment, promo, position) {
    if (position === 'top') {
      return `${promo}\n\n${comment}`;
    } else {
      return `${comment}\n\n${promo}`;
    }
  }

  /**
   * Utility: wait for specified milliseconds
   */
  static wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Scroll page to element
   */
  static scrollToElement(element) {
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}
