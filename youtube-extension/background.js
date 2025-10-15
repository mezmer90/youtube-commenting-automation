// Background service worker

// Import required utilities for service worker
importScripts('config.js');
importScripts('utils/storage.js');
importScripts('utils/api.js');
importScripts('utils/youtube.js');
importScripts('utils/notion.js');

console.log('YouTube Commenter Extension: Background service worker started');

/**
 * Save video data to Notion
 */
async function saveToNotion(videoData, notionSettings) {
  try {
    // Create Notion integration instance
    const notion = new NotionIntegration(notionSettings.apiKey, notionSettings.databaseId);

    // Save summary to Notion
    const result = await notion.saveSummary(videoData);

    return result;
  } catch (error) {
    console.error('Error saving to Notion:', error);
    return { success: false, error: error.message };
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);

  if (request.action === 'processNextVideo') {
    handleProcessNextVideo(request, sendResponse);
    return true; // Async response
  }

  if (request.action === 'openVideo') {
    handleOpenVideo(request.url, sendResponse);
    return true;
  }
});

/**
 * Process the next video workflow
 */
async function handleProcessNextVideo(request, sendResponse) {
  try {
    const { categoryId } = request;

    // 1. Get next video from backend
    console.log('Fetching next video from backend...');
    const videoResponse = await api.getNextVideo(categoryId);

    if (!videoResponse.success || !videoResponse.video) {
      throw new Error('No pending videos found in this category');
    }

    const video = videoResponse.video;
    console.log('Next video:', video.title);

    // 2. Open video in current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.update(tab.id, { url: video.url });

    // 3. Wait for page to load and content script to be ready
    console.log('Waiting for page to load and content script to initialize...');
    await waitForContentScript(tab.id);

    // 4. Start processing
    const result = await processVideoInTab(tab.id, video, categoryId);

    sendResponse({
      success: true,
      video,
      comment: result.comment,
      commentType: result.commentType
    });

  } catch (error) {
    console.error('Error processing next video:', error);

    // Special case: No transcript - automatically try next video
    if (error.message === 'NO_TRANSCRIPT_SKIP') {
      console.log('🔄 No transcript detected, automatically fetching next video...');

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'No Transcript - Skipping',
        message: 'Video has no transcript. Fetching next video...',
        priority: 1
      });

      // Wait a bit, then try next video
      setTimeout(async () => {
        try {
          await handleProcessNextVideo(request, sendResponse);
        } catch (retryError) {
          console.error('Error retrying next video:', retryError);
          sendResponse({ success: false, error: retryError.message });
        }
      }, 2000);

      return; // Don't send response yet
    }

    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Process video in the current tab
 */
async function processVideoInTab(tabId, video, categoryId) {
  try {
    console.log('=== STARTING VIDEO PROCESSING ===');
    console.log('Video:', video.title);
    console.log('Video ID:', video.video_id);
    console.log('Category ID:', categoryId);
    console.log('Tab ID:', tabId);

    // Set processing state
    await StorageManager.setProcessing(true);

    // 1. Check if logged in
    console.log('[STEP 1/8] Checking YouTube login status...');
    let loginCheck;
    try {
      loginCheck = await sendMessageWithRetry(tabId, { action: 'checkLoginStatus' }, 3, 10000);
      console.log('Login check response:', loginCheck);
      console.log('Login check - success:', loginCheck?.success);
      console.log('Login check - isLoggedIn:', loginCheck?.isLoggedIn);
    } catch (error) {
      console.error('Error sending checkLoginStatus message:', error);
      throw new Error('Failed to communicate with YouTube page. Try refreshing the page.');
    }

    if (!loginCheck || !loginCheck.success) {
      console.error('❌ Login check failed. Full response:', JSON.stringify(loginCheck));
      throw new Error('Failed to check login status');
    }

    if (!loginCheck.isLoggedIn) {
      console.error('❌ User is not logged in to YouTube');
      console.error('Please ensure you are logged in to YouTube.com');
      throw new Error('Please log in to YouTube first');
    }
    console.log('✅ User is logged in');

    // 2. Check if transcript is available (with longer timeout due to page load waits)
    console.log('[STEP 2/8] Checking if transcript is available...');
    let transcriptCheck;
    try {
      // Increased timeout to 25 seconds to account for:
      // - 8 seconds waiting for main content
      // - 2 seconds waiting for description
      // - 5 attempts x 1 second = 5 seconds for transcript button search
      // - Buffer for slow connections
      transcriptCheck = await sendMessageWithRetry(tabId, { action: 'checkTranscript' }, 2, 25000);
      console.log('Transcript check response:', transcriptCheck);
    } catch (error) {
      console.error('Error checking transcript:', error);
      // If transcript check times out or fails, treat as no transcript and skip
      console.warn('⚠️ Transcript check failed/timed out, treating as no transcript');
      transcriptCheck = { success: true, hasTranscript: false };
    }

    if (!transcriptCheck.success || !transcriptCheck.hasTranscript) {
      console.warn('❌ No transcript available, marking and skipping video');

      // Mark video with "No Transcript" status
      try {
        await api.updateVideoStatus({
          video_id: video.video_id,
          category_id: categoryId,
          summary_text: 'No Transcript Available',
          comment_text: 'No Transcript Available',
          comment_type: 'skipped',
          summary_status: 'completed',
          commented_status: 'completed'
        });
        console.log('✅ Video marked as "No Transcript"');
      } catch (error) {
        console.error('Error marking video:', error);
      }

      // Clear processing state
      await StorageManager.setProcessing(false);

      // Throw error to indicate no transcript (will be caught and displayed)
      throw new Error('NO_TRANSCRIPT_SKIP');
    }
    console.log('✅ Transcript is available');

    // 3. Extract transcript
    console.log('[STEP 3/8] Extracting transcript...');
    let transcriptResponse;
    try {
      transcriptResponse = await sendMessageWithRetry(tabId, { action: 'extractTranscript' }, 3, 20000);
      console.log('Transcript extraction response:', transcriptResponse);
    } catch (error) {
      console.error('Error extracting transcript:', error);
      throw new Error('Failed to extract transcript: ' + error.message);
    }

    if (!transcriptResponse.success || !transcriptResponse.transcript || transcriptResponse.transcript.length === 0) {
      // Transcript extraction failed or returned empty/null
      console.warn('❌ Transcript extraction failed or returned null/empty');

      // Mark video with "No Transcript" status (same as hasTranscript check)
      try {
        await api.updateVideoStatus({
          video_id: video.video_id,
          category_id: categoryId,
          summary_text: 'Transcript Extraction Failed',
          comment_text: 'Transcript Extraction Failed',
          comment_type: 'skipped',
          summary_status: 'completed',
          commented_status: 'completed'
        });
        console.log('✅ Video marked as "Transcript Extraction Failed"');
      } catch (error) {
        console.error('Error marking video:', error);
      }

      // Clear processing state
      await StorageManager.setProcessing(false);

      // Throw special error to trigger auto-skip
      throw new Error('NO_TRANSCRIPT_SKIP');
    }

    const transcript = transcriptResponse.transcript;
    console.log(`✅ Transcript extracted: ${transcript.length} characters`);
    console.log('Transcript preview (first 200 chars):', transcript.substring(0, 200));

    // 4. Get video metadata
    console.log('[STEP 4/8] Getting video metadata...');
    let metadataResponse;
    try {
      metadataResponse = await sendMessageWithRetry(tabId, { action: 'getMetadata' }, 2, 10000);
      console.log('Metadata response:', metadataResponse);
    } catch (error) {
      console.error('Error getting metadata:', error);
      console.warn('Using fallback metadata');
      metadataResponse = { success: false };
    }

    const metadata = metadataResponse.success ? metadataResponse.metadata : { title: video.title, channel: video.channel_name };
    console.log('✅ Metadata:', metadata);

    // 4.5. Check for chapters in description (smart comment type selection)
    console.log('[STEP 4.5/8] Checking for chapters in video description...');
    let commentType = null;
    try {
      const chaptersCheckResponse = await sendMessageWithRetry(tabId, { action: 'checkChapters' }, 2, 25000);
      console.log('Chapters check response:', chaptersCheckResponse);

      if (chaptersCheckResponse.success && chaptersCheckResponse.hasChapters) {
        // Video already has chapters → force chapters type
        commentType = 'chapters';
        console.log('✅ Video has chapters in description → Using comment_type: chapters');
      } else {
        // No chapters → randomize between summary and takeaways (50/50)
        const types = ['summary', 'takeaways'];
        commentType = types[Math.floor(Math.random() * types.length)];
        console.log(`✅ No chapters in description → Randomized comment_type: ${commentType}`);
      }
    } catch (error) {
      console.error('Error checking for chapters:', error);
      // Fallback: randomize between summary and takeaways
      const types = ['summary', 'takeaways'];
      commentType = types[Math.floor(Math.random() * types.length)];
      console.warn(`⚠️ Chapter check failed, using fallback randomization: ${commentType}`);
    }

    // 5. Process with AI (with smart comment type)
    console.log('[STEP 5/8] Processing with AI...');
    console.log('Sending to backend:', {
      transcriptLength: transcript.length,
      metadata: metadata,
      commentType: commentType
    });

    let aiResponse;
    try {
      aiResponse = await api.processVideo(transcript, metadata, commentType);
      console.log('AI response:', aiResponse);
    } catch (error) {
      console.error('Error calling AI API:', error);
      throw new Error('AI processing failed: ' + error.message);
    }

    if (!aiResponse.success) {
      throw new Error('AI processing failed: ' + (aiResponse.error || 'Unknown error'));
    }

    const { summary, comment, comment_type } = aiResponse;
    console.log(`✅ AI generated ${comment_type} comment`);
    console.log('Summary length:', summary?.length || 0);
    console.log('Comment preview:', comment?.substring(0, 100) || 'N/A');

    // 6. Get promo text from storage
    console.log('[STEP 6/8] Getting promo settings...');
    let finalComment = comment;
    let promo = '';
    let position = 'none';

    try {
      const promoSettings = await StorageManager.get(['promoTexts', 'promoEnabled', 'promoAllowNone']);
      console.log('Promo settings:', promoSettings);

      const promoEnabled = promoSettings.promoEnabled !== false; // Default true
      const promoAllowNone = promoSettings.promoAllowNone === true; // Default false (always add promo)

      if (promoEnabled) {
        const defaultPromos = [
          "This summary was generated with VideoSum AI",
          "Generated chapter breakdown using www.videosum.ai",
          "Want to summarize other videos? Search for VideoSum AI on Google",
          "This breakdown was created by VideoSum - AI-powered video analysis"
        ];

        const promoTexts = promoSettings.promoTexts || defaultPromos;

        // Randomly decide: add promo or skip (if promoAllowNone is enabled)
        const shouldAddPromo = promoAllowNone ? Math.random() > 0.3 : true; // Default: always add promo (100%)

        if (shouldAddPromo) {
          promo = promoTexts[Math.floor(Math.random() * promoTexts.length)];
          position = Math.random() > 0.5 ? 'top' : 'bottom';

          // 7. Add promo to comment
          console.log('[STEP 7/8] Adding promo to comment...');
          finalComment = position === 'top'
            ? `${promo}\n\n${comment}`
            : `${comment}\n\n${promo}`;
          console.log('✅ Promo added:', promo, 'Position:', position);
        } else {
          console.log('✅ Skipping promo this time (random)');
          position = 'none';
        }
      } else {
        console.log('✅ Promo disabled in settings');
      }
    } catch (error) {
      console.error('Error getting promo settings:', error);
      // Continue without promo on error
      finalComment = comment;
    }

    console.log('✅ Final comment length:', finalComment.length);
    console.log('Final comment preview:', finalComment.substring(0, 150));

    // 8. Fill comment box
    console.log('[STEP 8/8] Filling comment box...');
    let commentFilled = false;
    let fillError = null;

    try {
      const commentResponse = await sendMessageWithRetry(tabId, {
        action: 'fillComment',
        commentText: finalComment
      }, 2, 15000);
      console.log('Fill comment response:', commentResponse);

      if (commentResponse.success) {
        console.log('✅ Comment box filled successfully');
        commentFilled = true;
      } else {
        fillError = commentResponse.error || 'Unknown error';
        console.warn('⚠️ Failed to fill comment box:', fillError);
      }
    } catch (error) {
      fillError = error.message;
      console.error('⚠️ Error filling comment box:', error);
    }

    // Continue even if filling failed - user can copy from popup
    if (!commentFilled) {
      console.log('📋 Comment not filled automatically, but user can copy from popup');
    }

    // 9. Notify user to submit manually
    console.log('[NOTIFICATION] Showing comment ready notification');
    const notificationMessage = commentFilled
      ? 'Please review and submit the comment manually on YouTube.'
      : 'Comment could not be auto-filled. Please copy it from the extension popup and paste it on YouTube.';

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: commentFilled ? 'Comment Ready!' : 'Comment Generated',
      message: notificationMessage,
      priority: 2
    });

    // 10. Save to Notion (if configured)
    console.log('[NOTION] Checking Notion configuration...');
    let notionPageId = null;
    try {
      const notionSettings = await StorageManager.getNotionSettings();
      console.log('Notion settings:', notionSettings);

      if (notionSettings?.apiKey && notionSettings?.databaseId) {
        console.log('[NOTION] Saving to Notion...');
        const notionResult = await saveToNotion({
          ...metadata,
          summary: summary,
          comment: finalComment,
          transcript: transcript
        }, notionSettings);

        console.log('[NOTION] Save result:', notionResult);
        if (notionResult.success) {
          notionPageId = notionResult.pageId;
          console.log('✅ Saved to Notion:', notionResult.pageUrl);
        } else {
          console.warn('⚠️ Notion save unsuccessful:', notionResult.error);
        }
      } else {
        console.log('[NOTION] Not configured, skipping');
      }
    } catch (notionError) {
      console.error('❌ Notion save failed (non-blocking):', notionError);
      console.error('Notion error stack:', notionError.stack);
      // Don't fail the whole process if Notion fails
    }

    // 11. Update video status in database
    console.log('[DATABASE] Updating video status...');
    try {
      const statusUpdate = {
        video_id: video.video_id,
        category_id: categoryId,
        summary_text: summary,
        comment_text: finalComment,
        comment_type: comment_type,
        promo_text: promo,
        promo_position: position,
        notion_page_id: notionPageId,
        summary_status: 'completed',
        commented_status: 'completed'
      };
      console.log('Status update payload:', statusUpdate);

      const updateResult = await api.updateVideoStatus(statusUpdate);
      console.log('Status update result:', updateResult);
      console.log('✅ Video status updated');
    } catch (error) {
      console.error('❌ Error updating video status:', error);
      throw new Error('Failed to update video status: ' + error.message);
    }

    // 12. Increment progress
    console.log('[PROGRESS] Incrementing progress counters...');
    try {
      // Get category name from video object
      const categoryName = video.category_name || 'Unknown';
      await api.incrementProgress(categoryId, categoryName);
      console.log('✅ Backend progress incremented');
    } catch (error) {
      console.error('Error incrementing backend progress:', error);
    }

    try {
      await StorageManager.incrementDailyProgress();
      console.log('✅ Local progress incremented');
    } catch (error) {
      console.error('Error incrementing local progress:', error);
    }

    // Clear processing state
    await StorageManager.setProcessing(false);

    console.log('=== ✅ VIDEO PROCESSING COMPLETE ===');

    // Return comment data
    return {
      comment: finalComment,
      commentType: comment_type
    };

  } catch (error) {
    await StorageManager.setProcessing(false);
    console.error('=== ❌ VIDEO PROCESSING FAILED ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Processing Error',
      message: error.message,
      priority: 2
    });
    throw error;
  }
}

/**
 * Open video URL in current/new tab
 */
async function handleOpenVideo(url, sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.update(tab.id, { url });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error opening video:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Utility: wait for specified milliseconds
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send message to content script with retry logic and timeout
 * @param {number} tabId - The tab ID
 * @param {object} message - The message to send
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @param {number} timeout - Timeout per attempt in ms (default: 10000)
 * @returns {Promise} Response from content script
 */
async function sendMessageWithRetry(tabId, message, maxRetries = 3, timeout = 10000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[sendMessage] Attempt ${attempt}/${maxRetries} - Action: ${message.action}`);

      // Create a promise that times out
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Message timeout after ${timeout}ms`)), timeout);
      });

      // Race between message send and timeout
      const messagePromise = chrome.tabs.sendMessage(tabId, message);
      const response = await Promise.race([messagePromise, timeoutPromise]);

      console.log(`[sendMessage] ✅ Success on attempt ${attempt} - Action: ${message.action}`);
      return response;

    } catch (error) {
      console.warn(`[sendMessage] ⚠️ Attempt ${attempt}/${maxRetries} failed - Action: ${message.action}`, error.message);

      if (attempt === maxRetries) {
        console.error(`[sendMessage] ❌ All ${maxRetries} attempts failed - Action: ${message.action}`);
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Wait before retrying (exponential backoff)
      const waitTime = 1000 * attempt;
      console.log(`[sendMessage] Waiting ${waitTime}ms before retry...`);
      await wait(waitTime);
    }
  }
}

/**
 * Wait for content script to be ready
 * Retries sending a ping message until content script responds
 */
async function waitForContentScript(tabId, maxAttempts = 30, delayMs = 500) {
  console.log('[waitForContentScript] Waiting for content script to load...');

  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Use a shorter timeout for ping checks
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Ping timeout')), 2000);
      });

      const pingPromise = chrome.tabs.sendMessage(tabId, { action: 'ping' });
      await Promise.race([pingPromise, timeoutPromise]);

      console.log(`[waitForContentScript] ✅ Content script ready on attempt ${i + 1}`);

      // Wait extra time for page to stabilize after content script loads
      await wait(1000);
      return true;

    } catch (error) {
      console.log(`[waitForContentScript] Attempt ${i + 1}/${maxAttempts}...`);
      await wait(delayMs);
    }
  }

  throw new Error('Content script did not load in time');
}
