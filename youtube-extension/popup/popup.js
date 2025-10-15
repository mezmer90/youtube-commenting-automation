// Popup UI logic

let categories = [];
let currentProgress = 0;
let dailyLimit = CONFIG.DAILY_LIMIT;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  log('Extension popup loaded');

  await loadCategories();
  await updateProgress();
  await loadSelectedCategory();
  setupEventListeners();
  startProgressTimer();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Next Video button
  document.getElementById('nextVideoBtn').addEventListener('click', handleNextVideo);

  // Category selection
  document.getElementById('categorySelect').addEventListener('change', handleCategoryChange);

  // Copy comment button
  document.getElementById('copyCommentBtn').addEventListener('click', handleCopyComment);

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('settingsModal').style.display = 'flex';
    loadPromoSettings();
  });

  // Close settings
  document.getElementById('closeSettings').addEventListener('click', () => {
    document.getElementById('settingsModal').style.display = 'none';
  });

  // Save Notion API key
  document.getElementById('saveNotion').addEventListener('click', handleSaveNotion);

  // Save promo texts
  document.getElementById('savePromos').addEventListener('click', handleSavePromos);

  // Clear storage
  document.getElementById('clearStorage').addEventListener('click', handleClearStorage);
}

/**
 * Load categories from backend
 */
async function loadCategories() {
  try {
    log('Loading categories...');
    const response = await api.getCategories();

    if (response.success) {
      categories = response.categories;
      const select = document.getElementById('categorySelect');
      select.innerHTML = '';

      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `${cat.name} (${cat.total_videos} videos)`;
        select.appendChild(option);
      });

      log(`Loaded ${categories.length} categories`);
    }
  } catch (error) {
    log(`Error loading categories: ${error.message}`, 'error');
    showError('Failed to load categories');
  }
}

/**
 * Load selected category from storage
 */
async function loadSelectedCategory() {
  const categoryId = await StorageManager.getSelectedCategory();
  document.getElementById('categorySelect').value = categoryId;
}

/**
 * Handle category change
 */
async function handleCategoryChange(event) {
  const categoryId = parseInt(event.target.value);
  await StorageManager.setSelectedCategory(categoryId);
  log(`Category changed to: ${categoryId}`);
}

/**
 * Update progress display
 */
async function updateProgress() {
  try {
    // Get local progress
    currentProgress = await StorageManager.getDailyProgress();

    // Update UI
    const percentage = Math.min((currentProgress / dailyLimit) * 100, 100);
    document.getElementById('progressCount').textContent = `${currentProgress}/${dailyLimit}`;
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressPercentage').textContent = `${Math.round(percentage)}%`;

    // Disable button if limit reached
    const btn = document.getElementById('nextVideoBtn');
    if (currentProgress >= dailyLimit) {
      btn.disabled = true;
      btn.textContent = 'Daily Limit Reached';
      setStatus('Limit reached', 'error');
    } else {
      btn.disabled = false;
      btn.textContent = 'Next Video';
      setStatus('Ready', 'ready');
    }

  } catch (error) {
    log(`Error updating progress: ${error.message}`, 'error');
  }
}

/**
 * Start timer to show time until reset
 */
function startProgressTimer() {
  updateTimeUntilReset();
  setInterval(updateTimeUntilReset, 60000); // Update every minute
}

/**
 * Update time until reset display
 */
function updateTimeUntilReset() {
  const now = new Date();
  const istOffset = 330; // IST is UTC+5:30
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + (istOffset * 60000));

  // Calculate time until midnight IST
  const midnight = new Date(istTime);
  midnight.setHours(24, 0, 0, 0);

  const diff = midnight - istTime;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  document.getElementById('timeUntilReset').textContent = `Resets in: ${hours}h ${minutes}m`;
}

/**
 * Handle Next Video button click
 */
async function handleNextVideo() {
  try {
    // Check if already processing
    const isProcessing = await StorageManager.isProcessing();
    if (isProcessing) {
      showError('Already processing a video');
      return;
    }

    // Check daily limit
    if (currentProgress >= dailyLimit) {
      showError('Daily limit reached. Wait for reset.');
      return;
    }

    // Get selected category
    const categoryId = parseInt(document.getElementById('categorySelect').value);
    if (!categoryId) {
      showError('Please select a category');
      return;
    }

    log(`Starting next video process for category ${categoryId}...`);
    setStatus('Processing', 'processing');
    showProcessingUI(true);

    // Send message to background to process next video
    chrome.runtime.sendMessage({
      action: 'processNextVideo',
      categoryId
    }, async (response) => {
      showProcessingUI(false);

      if (response && response.success) {
        log('Video processed successfully!');
        setStatus('Ready', 'ready');
        await updateProgress();

        // Display the generated comment
        if (response.comment && response.commentType) {
          displayGeneratedComment(response.comment, response.commentType);
        }

        showSuccess('Comment generated! Please submit manually on YouTube.');
      } else {
        const errorMsg = response?.error || 'Unknown error';
        log(`Error: ${errorMsg}`, 'error');
        setStatus('Error', 'error');
        showError(errorMsg);
      }
    });

  } catch (error) {
    showProcessingUI(false);
    setStatus('Error', 'error');
    log(`Error: ${error.message}`, 'error');
    showError(error.message);
  }
}

/**
 * Show/hide processing UI
 */
function showProcessingUI(show) {
  const status = document.getElementById('processingStatus');
  const btn = document.getElementById('nextVideoBtn');

  if (show) {
    status.style.display = 'block';
    btn.disabled = true;
  } else {
    status.style.display = 'none';
    btn.disabled = false;
  }
}

/**
 * Set status indicator
 */
function setStatus(text, type = 'ready') {
  const statusText = document.getElementById('statusText');
  const statusDot = document.querySelector('.status-dot');

  statusText.textContent = text;
  statusDot.className = 'status-dot';

  if (type === 'processing') {
    statusDot.classList.add('processing');
  } else if (type === 'error') {
    statusDot.classList.add('error');
  }
}

/**
 * Log message to activity log
 */
function log(message, type = 'info') {
  const logOutput = document.getElementById('logOutput');
  const entry = document.createElement('div');
  entry.className = 'log-entry';

  const timestamp = new Date().toLocaleTimeString();
  entry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;

  logOutput.appendChild(entry);
  logOutput.scrollTop = logOutput.scrollHeight;

  console.log(`[${type.toUpperCase()}]`, message);
}

/**
 * Show success notification
 */
function showSuccess(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon48.png',
    title: 'Success',
    message: message,
    priority: 2
  });
}

/**
 * Show error notification
 */
function showError(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon48.png',
    title: 'Error',
    message: message,
    priority: 2
  });
}

/**
 * Handle Save Notion API Key
 */
async function handleSaveNotion() {
  const apiKey = document.getElementById('notionApiKey').value.trim();
  if (!apiKey) {
    alert('Please enter a Notion API key');
    return;
  }

  await StorageManager.set({ notionApiKey: apiKey });
  alert('Notion API key saved!');
  log('Notion API key saved');
}

/**
 * Handle Clear Storage
 */
async function handleClearStorage() {
  if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    await StorageManager.clear();
    alert('All data cleared!');
    log('Storage cleared');
    location.reload();
  }
}

/**
 * Display generated comment in popup
 */
function displayGeneratedComment(comment, commentType) {
  const commentDisplay = document.getElementById('commentDisplay');
  const generatedComment = document.getElementById('generatedComment');
  const commentTypeSpan = document.getElementById('commentType');
  const commentLengthSpan = document.getElementById('commentLength');

  generatedComment.value = comment;
  commentTypeSpan.textContent = `Type: ${commentType}`;
  commentLengthSpan.textContent = `${comment.length} characters`;

  commentDisplay.style.display = 'block';

  // Store in temporary storage for persistence
  StorageManager.set({ lastGeneratedComment: comment, lastCommentType: commentType });
}

/**
 * Handle copy comment button
 */
async function handleCopyComment() {
  const comment = document.getElementById('generatedComment').value;

  try {
    await navigator.clipboard.writeText(comment);
    const btn = document.getElementById('copyCommentBtn');
    btn.textContent = 'Copied!';
    btn.style.background = '#4caf50';

    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.style.background = '';
    }, 2000);

    log('Comment copied to clipboard');
  } catch (error) {
    log('Failed to copy comment: ' + error.message, 'error');
    showError('Failed to copy to clipboard');
  }
}

/**
 * Load promo settings into modal
 */
async function loadPromoSettings() {
  const settings = await StorageManager.get(['promoTexts', 'promoEnabled', 'promoAllowNone']);

  const defaultPromos = [
    "This summary was generated with VideoSum AI",
    "Generated chapter breakdown using www.videosum.ai",
    "Want to summarize other videos? Search for VideoSum AI on Google",
    "This breakdown was created by VideoSum - AI-powered video analysis"
  ];

  const promoTexts = settings.promoTexts || defaultPromos;
  document.getElementById('promoTexts').value = promoTexts.join('\n');
  document.getElementById('promoEnabled').checked = settings.promoEnabled !== false; // Default true
  document.getElementById('promoAllowNone').checked = settings.promoAllowNone !== false; // Default true
}

/**
 * Handle save promo texts
 */
async function handleSavePromos() {
  const promoTextarea = document.getElementById('promoTexts').value;
  const promoEnabled = document.getElementById('promoEnabled').checked;
  const promoAllowNone = document.getElementById('promoAllowNone').checked;

  // Split by newlines and filter empty lines
  const promoTexts = promoTextarea
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (promoTexts.length === 0 && promoEnabled) {
    alert('Please enter at least one promo text');
    return;
  }

  await StorageManager.set({
    promoTexts,
    promoEnabled,
    promoAllowNone
  });

  alert('Promo settings saved!');
  log('Promo settings saved');
}
