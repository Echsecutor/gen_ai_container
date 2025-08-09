/**
 * Main application entry point - Orchestrates all modules
 * Civitai Model Loader - Modular ESM Version
 */

// Import all modules
import { testApiToken } from "./js/api.js";
import { exportConfig, importConfig } from "./js/config.js";
import {
  cancelDownload,
  downloadModel,
  loadDownloadedModels,
  redownloadModel,
  removeDownloadedModel,
  startDownloadPolling,
} from "./js/download.js";
import { showModelDetails } from "./js/models.js";
import { changeCursor, changePage, performSearch } from "./js/search.js";
import { appState, saveApiToken as stateSaveApiToken } from "./js/state.js";
import { modalManager, openImageModal, showToast, tokenUI } from "./js/ui.js";

/**
 * Application initialization
 */
class App {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initializes the application
   */
  async init() {
    if (this.initialized) return;

    try {
      showToast("Application loaded successfully", "success");

      // Setup event listeners
      this.setupEventListeners();

      // Register modals
      this.setupModals();

      // Start polling for download updates
      startDownloadPolling();

      // Load initial data displays
      await loadDownloadedModels();

      this.initialized = true;
    } catch (error) {
      console.error("Application initialization failed:", error);
      showToast("Failed to initialize application", "error");
    }
  }

  /**
   * Sets up all event listeners
   */
  setupEventListeners() {
    // API Token - Input state
    this.addEventListener("saveToken", "click", this.saveApiToken.bind(this));
    this.addEventListener("testToken", "click", testApiToken);

    // API Token - Loaded state
    this.addEventListener(
      "changeToken",
      "click",
      this.showTokenInput.bind(this)
    );
    this.addEventListener("testTokenLoaded", "click", testApiToken);

    // Search
    this.addEventListener("searchBtn", "click", performSearch);
    this.addEventListener("searchQuery", "keypress", (e) => {
      if (e.key === "Enter") performSearch();
    });

    // NSFW preference
    this.addEventListener(
      "nsfwFilter",
      "change",
      this.saveNsfwPreference.bind(this)
    );

    // Downloaded models
    this.addEventListener("refreshDownloaded", "click", loadDownloadedModels);

    // Configuration
    this.addEventListener("exportConfig", "click", exportConfig);
    this.addEventListener("importConfigBtn", "click", () => {
      document.getElementById("importConfig")?.click();
    });
    this.addEventListener("importConfig", "change", importConfig);

    // Modal close handlers (for backward compatibility)
    const closeBtn = document.querySelector(".close");
    if (closeBtn) {
      closeBtn.addEventListener("click", this.closeModal.bind(this));
    }

    // Global modal click outside handler
    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        this.closeModal();
      }
    });

    // Global cleanup on page unload
    window.addEventListener("beforeunload", () => {
      appState.clearPollInterval();
    });
  }

  /**
   * Helper method to safely add event listeners
   * @param {string} elementId - Element ID
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   */
  addEventListener(elementId, event, handler) {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener(event, handler);
    } else {
      console.warn(`Element with ID '${elementId}' not found`);
    }
  }

  /**
   * Sets up modal management
   */
  setupModals() {
    // Register main model modal
    modalManager.registerModal("modelModal", {
      closeOnOutsideClick: true,
      closeOnEscape: true,
    });
  }

  /**
   * Saves API token from input field
   */
  saveApiToken() {
    const tokenInput = document.getElementById("apiToken");
    if (tokenInput) {
      stateSaveApiToken(tokenInput.value);
    }
  }

  /**
   * Shows token input state
   */
  showTokenInput() {
    tokenUI.showTokenInput();
  }

  /**
   * Saves NSFW preference
   */
  saveNsfwPreference() {
    const nsfwCheckbox = document.getElementById("nsfwFilter");
    if (nsfwCheckbox) {
      appState.saveNsfwPreference(nsfwCheckbox.checked);
    }
  }

  /**
   * Closes any open modal
   */
  closeModal() {
    modalManager.closeAllModals();
  }

  /**
   * Gets application status for debugging
   * @returns {Object} - Application status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      hasApiToken: !!appState.getApiToken(),
      downloadedModelsCount: appState.getDownloadedModels().length,
      currentSearch: appState.getCurrentSearch(),
      pollInterval: appState.getPollInterval(),
    };
  }
}

// Initialize application when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  const app = new App();
  await app.init();

  // Make app instance globally available for debugging
  window.civitaiApp = app;

  // Make some functions globally available for backward compatibility
  window.closeModal = app.closeModal.bind(app);
  window.showModelDetails = showModelDetails;
  window.openImageModal = openImageModal;

  // Download functions
  window.downloadModel = downloadModel;
  window.redownloadModel = redownloadModel;
  window.removeDownloadedModel = removeDownloadedModel;
  window.cancelDownload = cancelDownload;

  // Search functions
  window.changeCursor = changeCursor;
  window.changePage = changePage;

  console.log("Civitai Model Loader initialized successfully");
});

// Export app class for potential external use
export default App;
