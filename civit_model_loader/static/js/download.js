/**
 * Download management functionality for the Civitai Model Loader
 */

import {
  cancelDownload as apiCancelDownload,
  checkFileExistence,
  getDownloadStatuses,
  startDownload,
} from "./api.js";
import { addDownloadedModel, appState, getDownloadedModels } from "./state.js";
import { ProgressBar, showToast } from "./ui.js";
import { escapeForOnclick, escapeHtml, formatFileSize } from "./utils.js";

/**
 * Download manager class
 */
class DownloadManager {
  constructor() {
    this.pollInterval = null;
    this.progressBars = new Map();
    this.setupEventListeners();
  }

  /**
   * Sets up event listeners for download functionality
   */
  setupEventListeners() {
    const refreshBtn = document.getElementById("refreshDownloaded");
    if (refreshBtn) {
      refreshBtn.addEventListener(
        "click",
        async () => await this.loadDownloadedModels()
      );
    }
  }

  /**
   * Starts downloading a model
   * @param {number} modelId - Model ID
   * @param {number} versionId - Version ID
   * @param {number} fileId - File ID
   * @param {string} filename - Filename
   * @param {string} imageUrl - Optional preview image URL
   * @param {Array} triggerWords - Optional trigger words array
   */
  async downloadModel(
    modelId,
    versionId,
    fileId,
    filename,
    imageUrl = null,
    triggerWords = []
  ) {
    try {
      const downloadRequest = {
        model_id: modelId,
        version_id: versionId,
        file_id: fileId,
      };

      const result = await startDownload(downloadRequest);
      showToast(`Download started: ${filename}`, "success");

      // Create model info for local storage
      const modelInfo = {
        id: modelId,
        versionId: versionId,
        fileId: fileId,
        filename: filename,
        downloadId: result.download_id,
        imageUrl: imageUrl,
        triggerWords: triggerWords || [],
      };

      // Add to downloaded models (handles deduplication)
      addDownloadedModel(modelInfo);
      await this.displayDownloadedModels();

      // Close modal if open
      const { modalManager } = await import("./ui.js");
      modalManager.closeModal("modelModal");
    } catch (error) {
      console.error("Download error:", error);
      showToast("Download failed: " + error.message, "error");
    }
  }

  /**
   * Loads and displays the download queue
   */
  async loadDownloadQueue() {
    try {
      const downloads = await getDownloadStatuses();
      this.displayDownloadQueue(downloads);
    } catch (error) {
      console.error("Download queue error:", error);
    }
  }

  /**
   * Displays the current download queue
   * @param {Object} downloads - Downloads object from API
   */
  displayDownloadQueue(downloads) {
    const container = document.getElementById("downloadQueue");
    if (!container) return;

    const downloadArray = Object.values(downloads);

    if (downloadArray.length === 0) {
      container.innerHTML = "<p>No active downloads</p>";
      return;
    }

    container.innerHTML = downloadArray
      .map((download) => this.createDownloadItemHtml(download))
      .join("");
  }

  /**
   * Creates HTML for a single download item
   * @param {Object} download - Download data
   * @returns {string} - HTML for download item
   */
  createDownloadItemHtml(download) {
    const downloadedSize = formatFileSize(download.downloaded_size || 0);
    const totalSize = formatFileSize(download.total_size || 0);
    const progressPercent = download.progress || 0;

    const errorHtml = download.error_message
      ? `<p style="color: red;">Error: ${escapeHtml(
          download.error_message
        )}</p>`
      : "";

    const cancelButtonHtml =
      download.status === "downloading" || download.status === "pending"
        ? `<button onclick="window.cancelDownload('${download.id}')">Cancel</button>`
        : "";

    // Enhanced progress information
    let speedHtml = "";
    let etaHtml = "";

    if (download.status === "downloading") {
      if (download.download_speed) {
        const speedMBps = download.download_speed / (1024 * 1024);
        speedHtml = `<span class="download-speed">Speed: ${speedMBps.toFixed(
          1
        )} MB/s</span>`;
      }

      if (download.eta_seconds && download.eta_seconds > 0) {
        const hours = Math.floor(download.eta_seconds / 3600);
        const minutes = Math.floor((download.eta_seconds % 3600) / 60);
        const seconds = download.eta_seconds % 60;

        let etaText = "";
        if (hours > 0) {
          etaText = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          etaText = `${minutes}m ${seconds}s`;
        } else {
          etaText = `${seconds}s`;
        }

        etaHtml = `<span class="download-eta">ETA: ${etaText}</span>`;
      }
    }

    // Progress bar with visual enhancements
    const progressBarClass =
      download.status === "downloading"
        ? "download-progress-bar active"
        : "download-progress-bar";

    // Time information
    let timeHtml = "";
    if (download.start_time) {
      const startDate = new Date(download.start_time);
      timeHtml = `<small class="download-time">Started: ${startDate.toLocaleTimeString()}</small>`;

      if (download.end_time && download.status === "completed") {
        const endDate = new Date(download.end_time);
        const duration = (endDate - startDate) / 1000; // seconds
        timeHtml += `<br><small class="download-time">Completed in: ${duration.toFixed(
          1
        )}s</small>`;
      }
    }

    return `
      <div class="download-item">
          <div class="download-info">
              <h4>${escapeHtml(download.filename)}</h4>
              <p>Status: <span class="download-status status-${
                download.status
              }">${download.status}</span></p>
              <div class="download-progress">
                  <div class="${progressBarClass}" style="width: ${progressPercent}%"></div>
              </div>
              <div class="download-details">
                  <span class="download-progress-text">${progressPercent.toFixed(
                    1
                  )}% - ${downloadedSize} / ${totalSize}</span>
                  ${speedHtml ? `<br>${speedHtml}` : ""}
                  ${etaHtml ? ` • ${etaHtml}` : ""}
              </div>
              ${
                timeHtml ? `<div class="download-timing">${timeHtml}</div>` : ""
              }
              ${errorHtml}
          </div>
          ${cancelButtonHtml}
      </div>
    `;
  }

  /**
   * Cancels a download
   * @param {string} downloadId - Download ID to cancel
   */
  async cancelDownload(downloadId) {
    try {
      await apiCancelDownload(downloadId);
      showToast("Download cancelled", "warning");
      this.loadDownloadQueue();
    } catch (error) {
      console.error("Cancel download error:", error);
      showToast("Failed to cancel download", "error");
    }
  }

  /**
   * Displays downloaded models from local storage with file existence checking
   */
  async displayDownloadedModels() {
    const container = document.getElementById("downloadedModels");
    if (!container) return;

    const downloadedModels = getDownloadedModels();

    if (downloadedModels.length === 0) {
      container.innerHTML = "<p>No downloaded models</p>";
      return;
    }

    // Show loading state
    container.innerHTML = "<p>Checking file existence...</p>";

    try {
      // Filter out models that don't have required fields
      const validModels = downloadedModels.filter(
        (model) => model.id && model.versionId && model.fileId && model.filename
      );

      if (validModels.length !== downloadedModels.length) {
        console.warn(
          `Filtered out ${
            downloadedModels.length - validModels.length
          } models with missing required fields`
        );
      }

      // Prepare file data for existence check
      const files = validModels.map((model) => ({
        model_id: model.id,
        version_id: model.versionId,
        file_id: model.fileId,
        filename: model.filename,
      }));

      console.log("Checking file existence for:", files);

      // Skip API call if no files to check
      if (files.length === 0) {
        console.log("No files to check for existence");
        container.innerHTML = downloadedModels
          .map((model) => this.createDownloadedModelHtml(model))
          .join("");
        return;
      }

      // Check file existence
      const response = await checkFileExistence(files);
      const fileStatusMap = new Map();

      response.files.forEach((fileStatus) => {
        const key = `${fileStatus.model_id}-${fileStatus.version_id}-${fileStatus.file_id}`;
        fileStatusMap.set(key, fileStatus);
      });

      // Generate HTML with file existence status
      container.innerHTML = downloadedModels
        .map((model) => {
          const key = `${model.id}-${model.versionId}-${model.fileId}`;
          const fileStatus = fileStatusMap.get(key);
          return this.createDownloadedModelHtml(model, fileStatus);
        })
        .join("");
    } catch (error) {
      console.error("Error checking file existence:", error);
      // Fallback to display without file existence status
      container.innerHTML = downloadedModels
        .map((model) => this.createDownloadedModelHtml(model))
        .join("");
      showToast("Failed to check file existence", "error");
    }
  }

  /**
   * Creates HTML for a downloaded model item
   * @param {Object} model - Downloaded model data
   * @param {Object} fileStatus - File existence status (optional)
   * @returns {string} - HTML for downloaded model
   */
  createDownloadedModelHtml(model, fileStatus = null) {
    const imageHtml = model.imageUrl
      ? `
        <div class="model-image-preview">
            <img src="${escapeHtml(model.imageUrl)}" 
                 alt="${escapeHtml(model.filename)}" 
                 onerror="this.parentElement.style.display='none'">
        </div>
        `
      : "";

    const downloadDate = new Date(model.timestamp).toLocaleDateString();
    const safeImageUrl = escapeHtml(model.imageUrl || "");
    const safeFilename = escapeHtml(model.filename);
    const safeTriggerWords = escapeForOnclick(model.triggerWords || []);

    // File existence status
    let fileStatusHtml = "";
    if (fileStatus) {
      const statusClass = fileStatus.exists ? "file-exists" : "file-missing";
      const statusText = fileStatus.exists
        ? "✅ File exists"
        : "❌ File missing";
      const statusTitle = fileStatus.exists
        ? `File found at: ${fileStatus.file_path}`
        : `File not found at: ${fileStatus.file_path}`;

      fileStatusHtml = `
        <p class="${statusClass}" title="${escapeHtml(statusTitle)}">
          <strong>Status:</strong> ${statusText}
        </p>
      `;
    }

    // Display trigger words if available
    let triggerWordsHtml = "";
    if (
      model.triggerWords &&
      Array.isArray(model.triggerWords) &&
      model.triggerWords.length > 0
    ) {
      const filteredWords = model.triggerWords.filter(
        (word) => word && word.trim()
      );
      if (filteredWords.length > 0) {
        triggerWordsHtml = `
          <div class="downloaded-model-trigger-words">
            <strong>Trigger Words:</strong>
            <div class="trigger-words-inline">
              ${filteredWords
                .map(
                  (word) =>
                    `<span class="trigger-word-small" onclick="window.copyTriggerWord('${escapeHtml(
                      word.trim()
                    ).replace(
                      /'/g,
                      "\\'"
                    )}')" title="Click to copy: ${escapeHtml(
                      word.trim()
                    )}">${escapeHtml(word.trim())}</span>`
                )
                .join("")}
            </div>
          </div>
        `;
      }
    }

    // Add visual indicator for missing files
    const modelClass =
      fileStatus && !fileStatus.exists
        ? "downloaded-model missing-file"
        : "downloaded-model";

    return `
      <div class="${modelClass}" onclick="window.showDownloadedModelDetails(${model.id})" style="cursor: pointer;">
          ${imageHtml}
          <div class="model-content">
              <h4>${safeFilename}</h4>
              <p><strong>Model ID:</strong> ${model.id}</p>
              <p><strong>Downloaded:</strong> ${downloadDate}</p>
              ${triggerWordsHtml}
              ${fileStatusHtml}
              <div class="model-actions" onclick="event.stopPropagation();">
                  <button onclick="window.redownloadModel(${model.id}, ${model.versionId}, ${model.fileId}, '${safeFilename}', '${safeImageUrl}', ${safeTriggerWords})" class="btn-primary">
                      Re-download
                  </button>
                  <button onclick="window.removeDownloadedModel(${model.id}, ${model.versionId}, ${model.fileId})" class="btn-danger">
                      Remove
                  </button>
              </div>
          </div>
      </div>
    `;
  }

  /**
   * Re-downloads a previously downloaded model
   * @param {number} modelId - Model ID
   * @param {number} versionId - Version ID
   * @param {number} fileId - File ID
   * @param {string} filename - Filename
   * @param {string} imageUrl - Optional preview image URL
   * @param {Array} triggerWords - Optional trigger words array
   */
  async redownloadModel(
    modelId,
    versionId,
    fileId,
    filename,
    imageUrl = null,
    triggerWords = []
  ) {
    return this.downloadModel(
      modelId,
      versionId,
      fileId,
      filename,
      imageUrl,
      triggerWords
    );
  }

  /**
   * Removes a model from the downloaded models list
   * @param {number} modelId - Model ID
   * @param {number} versionId - Version ID
   * @param {number} fileId - File ID
   */
  async removeDownloadedModel(modelId, versionId, fileId) {
    try {
      if (
        confirm(
          `Are you sure you want to remove this model from your downloaded models list? This will not delete the actual file.`
        )
      ) {
        const { appState } = await import("./state.js");
        appState.removeDownloadedModel(modelId, versionId, fileId);

        // Refresh the display
        await this.displayDownloadedModels();

        showToast("Model removed from downloaded models list", "success");
      }
    } catch (error) {
      console.error("Error removing downloaded model:", error);
      showToast("Failed to remove model from list", "error");
    }
  }

  /**
   * Loads downloaded models from storage (refresh function)
   */
  async loadDownloadedModels() {
    await this.displayDownloadedModels();
  }

  /**
   * Starts polling for download updates
   */
  startDownloadPolling() {
    // Poll download queue every 2 seconds
    this.pollInterval = setInterval(() => this.loadDownloadQueue(), 2000);
    appState.setPollInterval(this.pollInterval);
  }

  /**
   * Stops polling for download updates
   */
  stopDownloadPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      appState.clearPollInterval();
    }
  }

  /**
   * Creates a progress bar for a specific download
   * @param {string} downloadId - Download ID
   * @param {string} containerId - Container element ID
   * @returns {ProgressBar} - Progress bar instance
   */
  createProgressBar(downloadId, containerId) {
    const progressBar = new ProgressBar(containerId);
    this.progressBars.set(downloadId, progressBar);
    return progressBar;
  }

  /**
   * Updates progress for a specific download
   * @param {string} downloadId - Download ID
   * @param {number} progress - Progress percentage (0-100)
   */
  updateProgress(downloadId, progress) {
    const progressBar = this.progressBars.get(downloadId);
    if (progressBar) {
      progressBar.updateProgress(progress);
    }
  }

  /**
   * Removes progress bar for a completed/cancelled download
   * @param {string} downloadId - Download ID
   */
  removeProgressBar(downloadId) {
    const progressBar = this.progressBars.get(downloadId);
    if (progressBar) {
      progressBar.remove();
      this.progressBars.delete(downloadId);
    }
  }

  /**
   * Gets download statistics
   * @returns {Object} - Download statistics
   */
  getDownloadStats() {
    const downloadedModels = getDownloadedModels();
    return {
      totalDownloads: downloadedModels.length,
      recentDownloads: downloadedModels.filter(
        (model) =>
          new Date(model.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,
      oldestDownload:
        downloadedModels.length > 0
          ? downloadedModels[downloadedModels.length - 1].timestamp
          : null,
      newestDownload:
        downloadedModels.length > 0 ? downloadedModels[0].timestamp : null,
    };
  }

  /**
   * Batch downloads multiple models
   * @param {Array} modelInfos - Array of model info objects
   */
  async batchDownload(modelInfos) {
    const results = [];

    for (const modelInfo of modelInfos) {
      try {
        await this.downloadModel(
          modelInfo.modelId,
          modelInfo.versionId,
          modelInfo.fileId,
          modelInfo.filename,
          modelInfo.imageUrl
        );
        results.push({ success: true, modelInfo });
      } catch (error) {
        results.push({ success: false, modelInfo, error: error.message });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    showToast(
      `Batch download completed: ${successful} successful, ${failed} failed`,
      failed > 0 ? "warning" : "success"
    );

    return results;
  }

  /**
   * Clears all downloaded models from local storage
   */
  async clearDownloadHistory() {
    if (confirm("Are you sure you want to clear all download history?")) {
      appState.downloadedModels = [];
      appState.saveDownloadedModels();
      await this.displayDownloadedModels();
      showToast("Download history cleared", "warning");
    }
  }

  /**
   * Shows model details for a downloaded model by fetching from API
   * @param {number} modelId - Model ID to fetch details for
   */
  async showDownloadedModelDetails(modelId) {
    try {
      showToast("Fetching model details...", "info");

      // Import the model manager to use its showModelDetails method
      const { modelManager } = await import("./models.js");
      await modelManager.showModelDetails(modelId);
    } catch (error) {
      console.error("Error fetching downloaded model details:", error);
      showToast("Failed to fetch model details: " + error.message, "error");
    }
  }
}

// Create and export download manager instance
export const downloadManager = new DownloadManager();

// Export individual functions for backward compatibility and global access
export function downloadModel(
  modelId,
  versionId,
  fileId,
  filename,
  imageUrl = null,
  triggerWords = []
) {
  return downloadManager.downloadModel(
    modelId,
    versionId,
    fileId,
    filename,
    imageUrl,
    triggerWords
  );
}

export function redownloadModel(
  modelId,
  versionId,
  fileId,
  filename,
  imageUrl = null,
  triggerWords = []
) {
  return downloadManager.redownloadModel(
    modelId,
    versionId,
    fileId,
    filename,
    imageUrl,
    triggerWords
  );
}

export function removeDownloadedModel(modelId, versionId, fileId) {
  return downloadManager.removeDownloadedModel(modelId, versionId, fileId);
}

export async function loadDownloadedModels() {
  return await downloadManager.loadDownloadedModels();
}

export function cancelDownload(downloadId) {
  return downloadManager.cancelDownload(downloadId);
}

export function startDownloadPolling() {
  return downloadManager.startDownloadPolling();
}

export function stopDownloadPolling() {
  return downloadManager.stopDownloadPolling();
}

export function showDownloadedModelDetails(modelId) {
  return downloadManager.showDownloadedModelDetails(modelId);
}

// Make functions available globally for onclick handlers
window.downloadModel = downloadModel;
window.redownloadModel = redownloadModel;
window.removeDownloadedModel = removeDownloadedModel;
window.cancelDownload = cancelDownload;
window.showDownloadedModelDetails = showDownloadedModelDetails;
