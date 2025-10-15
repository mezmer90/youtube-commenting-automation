// Chrome storage utility

class StorageManager {
  /**
   * Get data from chrome.storage.local
   */
  static async get(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Set data in chrome.storage.local
   */
  static async set(data) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Remove data from chrome.storage.local
   */
  static async remove(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Clear all storage
   */
  static async clear() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get daily progress (with automatic reset check)
   */
  static async getDailyProgress() {
    const { dailyProgress, lastResetDate } = await this.get(['dailyProgress', 'lastResetDate']);

    const today = this.getTodayDate();

    // Check if we need to reset
    if (!lastResetDate || lastResetDate !== today) {
      await this.resetDailyProgress();
      return 0;
    }

    return dailyProgress || 0;
  }

  /**
   * Increment daily progress
   */
  static async incrementDailyProgress() {
    const current = await this.getDailyProgress();
    const newProgress = current + 1;

    await this.set({
      dailyProgress: newProgress,
      lastResetDate: this.getTodayDate()
    });

    return newProgress;
  }

  /**
   * Reset daily progress
   */
  static async resetDailyProgress() {
    await this.set({
      dailyProgress: 0,
      lastResetDate: this.getTodayDate()
    });
  }

  /**
   * Get today's date in IST timezone (YYYY-MM-DD)
   */
  static getTodayDate() {
    const now = new Date();
    const istOffset = 330; // IST is UTC+5:30
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utc + (istOffset * 60000));

    const year = istTime.getFullYear();
    const month = String(istTime.getMonth() + 1).padStart(2, '0');
    const day = String(istTime.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Get selected category
   */
  static async getSelectedCategory() {
    const { selectedCategory } = await this.get(['selectedCategory']);
    return selectedCategory || 1; // Default to category 1 (AI & Technology)
  }

  /**
   * Set selected category
   */
  static async setSelectedCategory(categoryId) {
    await this.set({ selectedCategory: categoryId });
  }

  /**
   * Get Notion database mapping for categories
   */
  static async getNotionDatabases() {
    const { notionDatabases } = await this.get(['notionDatabases']);
    return notionDatabases || {};
  }

  /**
   * Set Notion database for a category
   */
  static async setNotionDatabase(categoryId, databaseId, databaseName) {
    const databases = await this.getNotionDatabases();
    databases[categoryId] = { databaseId, databaseName };
    await this.set({ notionDatabases: databases });
  }

  /**
   * Check if currently processing
   */
  static async isProcessing() {
    const { isProcessing } = await this.get(['isProcessing']);
    return isProcessing || false;
  }

  /**
   * Set processing state
   */
  static async setProcessing(state) {
    await this.set({ isProcessing: state });
  }

  /**
   * Get Notion settings (API key and current database)
   */
  static async getNotionSettings() {
    const { notionApiKey, selectedCategory } = await this.get(['notionApiKey', 'selectedCategory']);
    const databases = await this.getNotionDatabases();

    const categoryId = selectedCategory || 1;
    const database = databases[categoryId];

    if (!notionApiKey) {
      return null;
    }

    return {
      apiKey: notionApiKey,
      databaseId: database?.databaseId || null,
      databaseName: database?.databaseName || null
    };
  }

  /**
   * Set Notion API key
   */
  static async setNotionApiKey(apiKey) {
    await this.set({ notionApiKey: apiKey });
  }

  /**
   * Remove Notion API key
   */
  static async removeNotionApiKey() {
    await this.remove(['notionApiKey']);
  }
}
