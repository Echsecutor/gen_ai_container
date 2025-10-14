/**
 * Main application entry point - Orchestrates all modules
 * Civitai Model Loader - Modular ESM Version
 */

// Import all modules
import {
  downloadConversionResult,
  getConversionStatus,
  startImageConversion,
  testApiToken,
} from "./js/api.js";
import "./js/config.js"; // Import to initialize ConfigManager
import {
  cancelDownload,
  downloadModel,
  loadDownloadedModels,
  redownloadModel,
  removeDownloadedModel,
  startDownloadPolling,
} from "./js/download.js";
import "./js/gallery.js"; // Import to initialize GalleryManager
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
    this.addEventListener("testToken", "click", () => testApiToken());

    // API Token - Loaded state
    this.addEventListener(
      "changeToken",
      "click",
      this.showTokenInput.bind(this)
    );
    this.addEventListener("testTokenLoaded", "click", () => testApiToken());

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

    // Image conversion
    this.addEventListener(
      "downloadImagesBtn",
      "click",
      this.downloadConvertedImages.bind(this)
    );

    // Configuration - handled by ConfigManager in config.js

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
   * Downloads converted images as ZIP file using async API with progress tracking
   */
  async downloadConvertedImages() {
    const directoryInput = document.getElementById("imageDirectory");
    const statusDiv = document.getElementById("conversionStatus");

    if (!directoryInput) {
      showToast("Directory input not found", "error");
      return;
    }

    const directory = directoryInput.value.trim();
    if (!directory) {
      showToast("Please enter a directory path", "error");
      return;
    }

    let conversionId = null;
    let pollingInterval = null;
    let isDownloading = false;

    try {
      // Show initial loading status
      if (statusDiv) {
        statusDiv.innerHTML =
          '<div class="loading">Starting image conversion...</div>';
      }

      showToast("Starting image conversion...", "info");

      // Start the conversion
      const result = await startImageConversion(directory);
      conversionId = result.conversion_id;

      showToast("Conversion started! Tracking progress...", "info");

      // Poll for conversion status
      pollingInterval = setInterval(async () => {
        try {
          const status = await getConversionStatus(conversionId);
          console.log(`Conversion ${conversionId} status:`, status);
          this.updateConversionStatus(status, statusDiv);

          if (status.status === "completed" && !isDownloading) {
            console.log(
              `Conversion ${conversionId} completed, stopping polling and starting download`
            );
            isDownloading = true;
            clearInterval(pollingInterval);
            pollingInterval = null;
            await this.downloadCompletedConversion(conversionId);
          } else if (status.status === "failed") {
            console.log(
              `Conversion ${conversionId} failed:`,
              status.error_message
            );
            clearInterval(pollingInterval);
            pollingInterval = null;
            showToast(`Conversion failed: ${status.error_message}`, "error");
            if (statusDiv) {
              statusDiv.innerHTML = `<div class="error">❌ Conversion failed: ${status.error_message}</div>`;
            }
          }
        } catch (error) {
          console.error("Error polling conversion status:", error);
          clearInterval(pollingInterval);
          pollingInterval = null;
          showToast("Error checking conversion status", "error");
        }
      }, 1000); // Poll every second
    } catch (error) {
      console.error("Image conversion failed:", error);
      showToast(`Conversion failed: ${error.message}`, "error");

      if (statusDiv) {
        statusDiv.innerHTML = `<div class="error">❌ ${error.message}</div>`;
      }

      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    }
  }

  /**
   * Updates the conversion status display
   * @param {Object} status - Conversion status object
   * @param {HTMLElement} statusDiv - Status display element
   */
  updateConversionStatus(status, statusDiv) {
    if (!statusDiv) return;

    const progressPercent = status.progress || 0;
    const processedFiles = status.processed_files || 0;
    const totalFiles = status.total_files || 0;
    const currentFile = status.current_file || "";

    let statusHtml = "";

    if (status.status === "processing") {
      statusHtml = `
        <div class="conversion-progress">
          <div class="conversion-info">
            <h4>Converting Images...</h4>
            <p>Processing: ${processedFiles} / ${totalFiles} files</p>
            ${
              currentFile
                ? `<p class="current-file">Current: ${currentFile}</p>`
                : ""
            }
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${progressPercent}%"></div>
          </div>
          <p class="progress-text">${progressPercent.toFixed(1)}% complete</p>
        </div>
      `;
    } else if (status.status === "pending") {
      statusHtml = '<div class="loading">Preparing conversion...</div>';
    }

    statusDiv.innerHTML = statusHtml;
  }

  /**
   * Downloads a completed conversion
   * @param {string} conversionId - Conversion ID
   */
  async downloadCompletedConversion(conversionId) {
    try {
      console.log(`Starting download for conversion ${conversionId}`);
      showToast("Starting download of converted images...", "info");

      const blob = await downloadConversionResult(conversionId);
      console.log(`Downloaded blob size: ${blob.size} bytes`);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;

      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      a.download = `converted_images_${timestamp}.zip`;

      console.log(`Triggering download with filename: ${a.download}`);
      document.body.appendChild(a);

      // Try to trigger the download
      try {
        a.click();
        console.log("Download click triggered successfully");
      } catch (clickError) {
        console.error("Error clicking download link:", clickError);
        // Fallback: try using window.open
        window.open(url, "_blank");
      }

      // Cleanup with a slight delay to ensure download starts
      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(url);
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
        } catch (cleanupError) {
          console.warn("Cleanup error:", cleanupError);
        }
      }, 1000);

      showToast("Images converted and downloaded successfully!", "success");

      const statusDiv = document.getElementById("conversionStatus");
      if (statusDiv) {
        statusDiv.innerHTML =
          '<div class="success">✅ Conversion completed and downloaded successfully</div>';
        // Clear status after 5 seconds
        setTimeout(() => {
          statusDiv.innerHTML = "";
        }, 5000);
      }
    } catch (error) {
      console.error("Download completed conversion failed:", error);
      showToast(`Download failed: ${error.message}`, "error");

      // Also update the status div to show the error
      const statusDiv = document.getElementById("conversionStatus");
      if (statusDiv) {
        statusDiv.innerHTML = `<div class="error">❌ Download failed: ${error.message}</div>`;
      }
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
