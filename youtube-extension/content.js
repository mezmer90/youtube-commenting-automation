// Content script - Runs on YouTube video pages

console.log('YouTube Commenter Extension: Content script loaded');

// Inject MetadataExtractor into page context
function injectMetadataExtractor() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('utils/metadata-extractor.js');
  script.onload = function() {
    console.log('MetadataExtractor injected into page');
  };
  (document.head || document.documentElement).appendChild(script);
}

// Inject on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectMetadataExtractor);
} else {
  injectMetadataExtractor();
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request.action);

  // Ping handler - confirms content script is loaded
  if (request.action === 'ping') {
    sendResponse({ success: true, ready: true });
    return true;
  }

  if (request.action === 'extractTranscript') {
    (async () => {
      await handleExtractTranscript(sendResponse);
    })();
    return true; // Async response
  }

  if (request.action === 'fillComment') {
    (async () => {
      await handleFillComment(request.commentText, sendResponse);
    })();
    return true; // Async response
  }

  if (request.action === 'getMetadata') {
    (async () => {
      await handleGetMetadata(sendResponse);
    })();
    return true;
  }

  if (request.action === 'checkTranscript') {
    (async () => {
      await handleCheckTranscript(sendResponse);
    })();
    return true;
  }

  if (request.action === 'checkChapters') {
    (async () => {
      await handleCheckChapters(sendResponse);
    })();
    return true;
  }

  if (request.action === 'checkLoginStatus') {
    (async () => {
      await handleCheckLoginStatus(sendResponse);
    })();
    return true;
  }
});

/**
 * Extract transcript from current video
 */
async function handleExtractTranscript(sendResponse) {
  let responseSent = false;

  try {
    console.log('[CONTENT] Starting transcript extraction...');
    const transcript = await YouTubeUtils.getTranscript();
    console.log('[CONTENT] ✅ Transcript extracted:', transcript?.length || 0, 'characters');
    sendResponse({ success: true, transcript });
    responseSent = true;
  } catch (error) {
    console.error('[CONTENT] ❌ Error extracting transcript:', error);
    console.error('[CONTENT] Error stack:', error.stack);

    if (!responseSent) {
      sendResponse({ success: false, error: error.message });
      responseSent = true;
    }
  } finally {
    if (!responseSent) {
      console.error('[CONTENT] ⚠️ Response was not sent, sending fallback');
      sendResponse({ success: false, error: 'Unknown error in transcript extraction' });
    }
  }
}

/**
 * Fill comment box with generated text
 */
async function handleFillComment(commentText, sendResponse) {
  let responseSent = false;

  try {
    console.log('[CONTENT] Starting comment box fill...');
    console.log('[CONTENT] Comment length:', commentText?.length || 0);
    await YouTubeUtils.fillCommentBox(commentText);
    console.log('[CONTENT] ✅ Comment box filled successfully');
    sendResponse({ success: true });
    responseSent = true;
  } catch (error) {
    console.error('[CONTENT] ❌ Error filling comment:', error);
    console.error('[CONTENT] Error stack:', error.stack);

    if (!responseSent) {
      sendResponse({ success: false, error: error.message });
      responseSent = true;
    }
  } finally {
    if (!responseSent) {
      console.error('[CONTENT] ⚠️ Response was not sent, sending fallback');
      sendResponse({ success: false, error: 'Unknown error in comment fill' });
    }
  }
}

/**
 * Get video metadata
 */
async function handleGetMetadata(sendResponse) {
  let responseSent = false;

  try {
    console.log('[CONTENT] Getting video metadata...');
    const metadata = await YouTubeUtils.getVideoMetadata();
    console.log('[CONTENT] ✅ Metadata extracted:', metadata);
    sendResponse({ success: true, metadata });
    responseSent = true;
  } catch (error) {
    console.error('[CONTENT] ❌ Error getting metadata:', error);
    console.error('[CONTENT] Error stack:', error.stack);

    if (!responseSent) {
      sendResponse({ success: false, error: error.message });
      responseSent = true;
    }
  } finally {
    if (!responseSent) {
      console.error('[CONTENT] ⚠️ Response was not sent, sending fallback');
      sendResponse({ success: false, error: 'Unknown error in metadata extraction' });
    }
  }
}

/**
 * Check if transcript is available
 */
async function handleCheckTranscript(sendResponse) {
  let responseSent = false;

  try {
    console.log('[CONTENT] Checking transcript availability...');

    // Add timeout to prevent hanging (12 seconds max)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Transcript check timed out after 12 seconds')), 12000);
    });

    const checkPromise = YouTubeUtils.hasTranscript();

    const hasTranscript = await Promise.race([checkPromise, timeoutPromise]);
    console.log('[CONTENT] Transcript available:', hasTranscript);
    sendResponse({ success: true, hasTranscript });
    responseSent = true;
  } catch (error) {
    console.error('[CONTENT] ❌ Error checking transcript:', error);
    console.error('[CONTENT] Error stack:', error.stack);

    if (!responseSent) {
      sendResponse({ success: false, error: error.message, hasTranscript: false });
      responseSent = true;
    }
  } finally {
    // Ensure we always send a response
    if (!responseSent) {
      console.error('[CONTENT] ⚠️ Response was not sent, sending fallback');
      sendResponse({ success: false, error: 'Unknown error occurred', hasTranscript: false });
    }
  }
}

/**
 * Check if video description has chapters (0:00 or 00:00)
 */
async function handleCheckChapters(sendResponse) {
  let responseSent = false;

  try {
    console.log('[CONTENT] Checking for chapters in description...');

    // Add timeout to prevent hanging (12 seconds max)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Chapters check timed out after 12 seconds')), 12000);
    });

    const checkPromise = YouTubeUtils.hasChaptersInDescription();

    const hasChapters = await Promise.race([checkPromise, timeoutPromise]);
    console.log('[CONTENT] Chapters found in description:', hasChapters);
    sendResponse({ success: true, hasChapters });
    responseSent = true;
  } catch (error) {
    console.error('[CONTENT] ❌ Error checking chapters:', error);
    console.error('[CONTENT] Error stack:', error.stack);

    if (!responseSent) {
      sendResponse({ success: false, error: error.message, hasChapters: false });
      responseSent = true;
    }
  } finally {
    // Ensure we always send a response
    if (!responseSent) {
      console.error('[CONTENT] ⚠️ Response was not sent, sending fallback');
      sendResponse({ success: false, error: 'Unknown error occurred', hasChapters: false });
    }
  }
}

/**
 * Check if user is logged in
 */
async function handleCheckLoginStatus(sendResponse) {
  let responseSent = false;

  try {
    console.log('[CONTENT] Checking login status...');
    const isLoggedIn = await YouTubeUtils.isLoggedIn();
    console.log('[CONTENT] Login status:', isLoggedIn);
    sendResponse({ success: true, isLoggedIn });
    responseSent = true;
  } catch (error) {
    console.error('[CONTENT] ❌ Error checking login status:', error);
    console.error('[CONTENT] Error stack:', error.stack);

    if (!responseSent) {
      sendResponse({ success: false, error: error.message, isLoggedIn: false });
      responseSent = true;
    }
  } finally {
    if (!responseSent) {
      console.error('[CONTENT] ⚠️ Response was not sent, sending fallback');
      sendResponse({ success: false, error: 'Unknown error in login check', isLoggedIn: false });
    }
  }
}

// Show visual indicator when extension is active
function showExtensionIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'yt-commenter-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 10px 15px;
    background: #065fd4;
    color: white;
    border-radius: 5px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 12px;
    display: none;
  `;
  indicator.textContent = 'Commenter Extension Active';
  document.body.appendChild(indicator);
}

// Initialize
showExtensionIndicator();
