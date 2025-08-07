/**
 * State management for the Civitai Model Loader application
 * Handles global state and localStorage persistence
 */

import { showToast, tokenUI } from "./ui.js";

/**
 * Application state manager
 */
class AppState {
  constructor() {
    // Global state
    this.currentPage = 1;
    this.currentSearch = null;
    this.apiToken = "";
    this.downloadedModels = [];
    this.pollInterval = null;
    this.lastSearchMetadata = null;

    // Storage keys
    this.STORAGE_KEYS = {
      API_TOKEN: "civitai_api_token",
      DOWNLOADED_MODELS: "civitai_downloaded_models",
      NSFW_PREFERENCE: "civitai_nsfw_preference",
    };

    // Initialize
    this.loadStoredData();
  }

  /**
   * Loads all stored data from localStorage
   */
  loadStoredData() {
    this.loadApiToken();
    this.loadNsfwPreference();
    this.loadDownloadedModels();
  }

  /**
   * Loads API token from localStorage
   */
  loadApiToken() {
    const storedToken = localStorage.getItem(this.STORAGE_KEYS.API_TOKEN);

    if (storedToken) {
      this.apiToken = storedToken;
      const tokenInput = document.getElementById("apiToken");
      if (tokenInput) {
        tokenInput.value = this.apiToken;
      }
      tokenUI.showTokenLoaded();
    } else {
      tokenUI.showTokenInput();
    }
  }

  /**
   * Saves API token to localStorage
   * @param {string} token - The API token to save
   */
  saveApiToken(token) {
    const trimmedToken = token?.trim() || "";

    if (trimmedToken) {
      this.apiToken = trimmedToken;
      localStorage.setItem(this.STORAGE_KEYS.API_TOKEN, trimmedToken);
      showToast("API token saved successfully", "success");
      tokenUI.showTokenLoaded();
    } else {
      this.apiToken = "";
      localStorage.removeItem(this.STORAGE_KEYS.API_TOKEN);
      showToast("API token removed", "warning");
      tokenUI.showTokenInput();
    }
  }

  /**
   * Gets the current API token
   * @returns {string} - The API token
   */
  getApiToken() {
    return this.apiToken;
  }

  /**
   * Loads NSFW preference from localStorage
   */
  loadNsfwPreference() {
    const storedNsfw = localStorage.getItem(this.STORAGE_KEYS.NSFW_PREFERENCE);
    if (storedNsfw !== null) {
      const nsfwCheckbox = document.getElementById("nsfwFilter");
      if (nsfwCheckbox) {
        nsfwCheckbox.checked = JSON.parse(storedNsfw);
      }
    }
  }

  /**
   * Saves NSFW preference to localStorage
   * @param {boolean} preference - NSFW preference
   */
  saveNsfwPreference(preference) {
    localStorage.setItem(
      this.STORAGE_KEYS.NSFW_PREFERENCE,
      JSON.stringify(preference)
    );
  }

  /**
   * Gets current NSFW preference
   * @returns {boolean} - NSFW preference
   */
  getNsfwPreference() {
    const nsfwCheckbox = document.getElementById("nsfwFilter");
    return nsfwCheckbox ? nsfwCheckbox.checked : false;
  }

  /**
   * Loads downloaded models from localStorage
   */
  loadDownloadedModels() {
    const storedModels = localStorage.getItem(
      this.STORAGE_KEYS.DOWNLOADED_MODELS
    );
    if (storedModels) {
      try {
        this.downloadedModels = JSON.parse(storedModels);
      } catch (error) {
        console.error("Error parsing downloaded models:", error);
        this.downloadedModels = [];
      }
    }
  }

  /**
   * Saves downloaded models to localStorage
   */
  saveDownloadedModels() {
    localStorage.setItem(
      this.STORAGE_KEYS.DOWNLOADED_MODELS,
      JSON.stringify(this.downloadedModels)
    );
  }

  /**
   * Adds a downloaded model to the list
   * @param {Object} modelInfo - Model information
   */
  addDownloadedModel(modelInfo) {
    const existingIndex = this.downloadedModels.findIndex(
      (model) =>
        model.id === modelInfo.id &&
        model.versionId === modelInfo.versionId &&
        model.fileId === modelInfo.fileId
    );

    if (existingIndex !== -1) {
      // Update existing entry instead of adding duplicate
      this.downloadedModels[existingIndex] = {
        ...this.downloadedModels[existingIndex],
        ...modelInfo,
        timestamp: new Date().toISOString(),
      };
    } else {
      // Add new entry
      this.downloadedModels.push({
        ...modelInfo,
        timestamp: new Date().toISOString(),
      });
    }

    this.saveDownloadedModels();
  }

  /**
   * Gets downloaded models sorted by timestamp (newest first)
   * @returns {Array} - Array of downloaded models
   */
  getDownloadedModels() {
    return [...this.downloadedModels].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  /**
   * Removes a downloaded model from the list
   * @param {string} modelId - Model ID
   * @param {string} versionId - Version ID
   * @param {string} fileId - File ID
   */
  removeDownloadedModel(modelId, versionId, fileId) {
    this.downloadedModels = this.downloadedModels.filter(
      (model) =>
        !(
          model.id === modelId &&
          model.versionId === versionId &&
          model.fileId === fileId
        )
    );
    this.saveDownloadedModels();
  }

  /**
   * Sets current search parameters
   * @param {Object} searchParams - Search parameters
   */
  setCurrentSearch(searchParams) {
    this.currentSearch = searchParams;
  }

  /**
   * Gets current search parameters
   * @returns {Object|null} - Current search parameters
   */
  getCurrentSearch() {
    return this.currentSearch;
  }

  /**
   * Sets current page number
   * @param {number} page - Page number
   */
  setCurrentPage(page) {
    this.currentPage = page;
  }

  /**
   * Gets current page number
   * @returns {number} - Current page number
   */
  getCurrentPage() {
    return this.currentPage;
  }

  /**
   * Sets last search metadata for pagination
   * @param {Object} metadata - Search metadata
   */
  setLastSearchMetadata(metadata) {
    this.lastSearchMetadata = metadata;
  }

  /**
   * Gets last search metadata
   * @returns {Object|null} - Last search metadata
   */
  getLastSearchMetadata() {
    return this.lastSearchMetadata;
  }

  /**
   * Exports all configuration data
   * @returns {Object} - Configuration object
   */
  exportConfiguration() {
    return {
      api_token: this.apiToken,
      downloaded_models: this.downloadedModels,
      nsfw_preference: this.getNsfwPreference(),
    };
  }

  /**
   * Imports configuration data
   * @param {Object} config - Configuration object
   */
  importConfiguration(config) {
    if (config.api_token) {
      this.saveApiToken(config.api_token);
      const tokenInput = document.getElementById("apiToken");
      if (tokenInput) {
        tokenInput.value = config.api_token;
      }
    }

    if (config.downloaded_models) {
      this.downloadedModels = config.downloaded_models;
      this.saveDownloadedModels();
    }

    if (config.nsfw_preference !== undefined) {
      const nsfwCheckbox = document.getElementById("nsfwFilter");
      if (nsfwCheckbox) {
        nsfwCheckbox.checked = config.nsfw_preference;
      }
      this.saveNsfwPreference(config.nsfw_preference);
    }
  }

  /**
   * Clears all stored data
   */
  clearAllData() {
    Object.values(this.STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    this.apiToken = "";
    this.downloadedModels = [];
    this.currentSearch = null;
    this.currentPage = 1;
    this.lastSearchMetadata = null;

    showToast("All data cleared", "warning");
  }

  /**
   * Sets polling interval ID
   * @param {number} intervalId - Interval ID
   */
  setPollInterval(intervalId) {
    this.pollInterval = intervalId;
  }

  /**
   * Clears polling interval
   */
  clearPollInterval() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Gets polling interval ID
   * @returns {number|null} - Polling interval ID
   */
  getPollInterval() {
    return this.pollInterval;
  }
}

// Create and export singleton instance
export const appState = new AppState();

// Export individual functions for backward compatibility
export function saveApiToken(token) {
  return appState.saveApiToken(token);
}

export function getApiToken() {
  return appState.getApiToken();
}

export function saveNsfwPreference(preference) {
  return appState.saveNsfwPreference(preference);
}

export function getNsfwPreference() {
  return appState.getNsfwPreference();
}

export function addDownloadedModel(modelInfo) {
  return appState.addDownloadedModel(modelInfo);
}

export function getDownloadedModels() {
  return appState.getDownloadedModels();
}

export function setCurrentSearch(searchParams) {
  return appState.setCurrentSearch(searchParams);
}

export function getCurrentSearch() {
  return appState.getCurrentSearch();
}

export function setCurrentPage(page) {
  return appState.setCurrentPage(page);
}

export function getCurrentPage() {
  return appState.getCurrentPage();
}

export function exportConfiguration() {
  return appState.exportConfiguration();
}

export function importConfiguration(config) {
  return appState.importConfiguration(config);
}
