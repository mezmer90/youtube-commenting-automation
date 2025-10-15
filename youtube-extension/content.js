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
  try {
    console.log('[CONTENT] Starting transcript extraction...');
    const transcript = await YouTubeUtils.getTranscript();
    console.log('[CONTENT] ✅ Transcript extracted:', transcript?.length || 0, 'characters');
    sendResponse({ success: true, transcript });
  } catch (error) {
    console.error('[CONTENT] ❌ Error extracting transcript:', error);
    console.error('[CONTENT] Error stack:', error.stack);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Fill comment box with generated text
 */
async function handleFillComment(commentText, sendResponse) {
  try {
    console.log('[CONTENT] Starting comment box fill...');
    console.log('[CONTENT] Comment length:', commentText?.length || 0);
    await YouTubeUtils.fillCommentBox(commentText);
    console.log('[CONTENT] ✅ Comment box filled successfully');
    sendResponse({ success: true });
  } catch (error) {
    console.error('[CONTENT] ❌ Error filling comment:', error);
    console.error('[CONTENT] Error stack:', error.stack);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Get video metadata
 */
async function handleGetMetadata(sendResponse) {
  try {
    console.log('[CONTENT] Getting video metadata...');
    const metadata = await YouTubeUtils.getVideoMetadata();
    console.log('[CONTENT] ✅ Metadata extracted:', metadata);
    sendResponse({ success: true, metadata });
  } catch (error) {
    console.error('[CONTENT] ❌ Error getting metadata:', error);
    console.error('[CONTENT] Error stack:', error.stack);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Check if transcript is available
 */
async function handleCheckTranscript(sendResponse) {
  try {
    console.log('[CONTENT] Checking transcript availability...');
    const hasTranscript = await YouTubeUtils.hasTranscript();
    console.log('[CONTENT] Transcript available:', hasTranscript);
    sendResponse({ success: true, hasTranscript });
  } catch (error) {
    console.error('[CONTENT] ❌ Error checking transcript:', error);
    console.error('[CONTENT] Error stack:', error.stack);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Check if user is logged in
 */
async function handleCheckLoginStatus(sendResponse) {
  try {
    console.log('[CONTENT] Checking login status...');
    const isLoggedIn = await YouTubeUtils.isLoggedIn();
    console.log('[CONTENT] Login status:', isLoggedIn);
    sendResponse({ success: true, isLoggedIn });
  } catch (error) {
    console.error('[CONTENT] ❌ Error checking login status:', error);
    console.error('[CONTENT] Error stack:', error.stack);
    sendResponse({ success: false, error: error.message });
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
