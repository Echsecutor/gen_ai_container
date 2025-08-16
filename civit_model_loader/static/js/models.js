/**
 * Model details and display functionality for the Civitai Model Loader
 */

import { getModelDetails } from "./api.js";
import { modalManager, openImageModal, showLoading } from "./ui.js";
import {
  copyToClipboard,
  escapeForOnclick,
  escapeHtml,
  formatFileSize,
  sanitizeHtml,
} from "./utils.js";

/**
 * Model display manager class
 */
class ModelManager {
  constructor() {
    this.setupModals();
  }

  /**
   * Sets up modal for model details
   */
  setupModals() {
    // Register the model modal with the modal manager
    modalManager.registerModal("modelModal", {
      closeOnOutsideClick: true,
      closeOnEscape: true,
    });
  }

  /**
   * Shows model details in a modal
   * @param {number} modelId - ID of the model to display
   */
  async showModelDetails(modelId) {
    try {
      showLoading("modelDetails", "Loading model details...");
      modalManager.openModal("modelModal");

      const model = await getModelDetails(modelId);
      this.displayModelDetails(model);
    } catch (error) {
      console.error("Model details error:", error);
      const container = document.getElementById("modelDetails");
      if (container) {
        container.innerHTML = "<p>Failed to load model details.</p>";
      }
    }
  }

  /**
   * Displays detailed model information in the modal
   * @param {Object} model - Model data from API
   */
  displayModelDetails(model) {
    const container = document.getElementById("modelDetails");
    if (!container) return;

    // Get the first image from the first model version as preview
    let previewImageUrl = null;
    if (model.modelVersions && model.modelVersions.length > 0) {
      const firstVersion = model.modelVersions[0];
      if (firstVersion.images && firstVersion.images.length > 0) {
        previewImageUrl = firstVersion.images[0].url;
      }
    }

    // Collect all images from all versions
    const allImages = this.collectAllImages(model.modelVersions || []);
    const imagesHtml = this.createImagesSection(allImages, model.name);

    // Collect and display trigger words
    const triggerWordsHtml = this.createTriggerWordsSection(
      model.modelVersions || []
    );

    const versionsHtml = this.createVersionsSection(
      model.modelVersions || [],
      model.id,
      previewImageUrl
    );

    container.innerHTML = `
      <h2>${escapeHtml(model.name)}</h2>
      <p><strong>Type:</strong> ${escapeHtml(model.type)}</p>
      <p><strong>Creator:</strong> ${escapeHtml(
        model.creator?.username || "Unknown"
      )}</p>
      <p><strong>Description:</strong> ${sanitizeHtml(
        model.description || "No description available"
      )}</p>
      ${triggerWordsHtml}
      ${imagesHtml}
      <div class="model-versions">
          <h3>Available Versions</h3>
          ${versionsHtml}
      </div>
    `;
  }

  /**
   * Creates the trigger words section HTML
   * @param {Array} modelVersions - Array of model versions
   * @returns {string} - HTML for trigger words section
   */
  createTriggerWordsSection(modelVersions) {
    // Collect all unique trigger words from all versions
    const allTriggerWords = new Set();

    if (Array.isArray(modelVersions)) {
      modelVersions.forEach((version) => {
        if (version.trainedWords && Array.isArray(version.trainedWords)) {
          version.trainedWords.forEach((word) => {
            if (word && word.trim()) {
              allTriggerWords.add(word.trim());
            }
          });
        }
      });
    }

    if (allTriggerWords.size === 0) {
      return "";
    }

    const triggerWordsArray = Array.from(allTriggerWords);

    return `
      <div class="trigger-words-section">
        <h3>Trigger Words</h3>
        <div class="trigger-words">
          ${triggerWordsArray
            .map(
              (word) =>
                `<span class="trigger-word" onclick="window.copyTriggerWord('${escapeHtml(
                  word
                ).replace(/'/g, "\\'")}')" title="Click to copy: ${escapeHtml(
                  word
                )}">${escapeHtml(word)}</span>`
            )
            .join("")}
        </div>
      </div>
    `;
  }

  /**
   * Collects all images from all model versions
   * @param {Array} modelVersions - Array of model versions
   * @returns {Array} - Array of all images with version info
   */
  collectAllImages(modelVersions) {
    const allImages = [];

    if (Array.isArray(modelVersions)) {
      modelVersions.forEach((version) => {
        if (version.images && version.images.length > 0) {
          version.images.forEach((image) => {
            allImages.push({
              ...image,
              versionName: version.name,
            });
          });
        }
      });
    }

    return allImages;
  }

  /**
   * Creates the images section HTML
   * @param {Array} allImages - Array of all images
   * @param {string} modelName - Name of the model
   * @returns {string} - HTML for images section
   */
  createImagesSection(allImages, modelName) {
    if (allImages.length === 0) return "";

    return `
      <div class="model-images-section">
        <h3>Model Images</h3>
        <div class="model-images-grid">
          ${allImages
            .map((image) => this.createImageItem(image, modelName))
            .join("")}
        </div>
      </div>
    `;
  }

  /**
   * Creates a single image item HTML
   * @param {Object} image - Image data
   * @param {string} modelName - Name of the model
   * @returns {string} - HTML for image item
   */
  createImageItem(image, modelName) {
    return `
      <div class="model-image-item">
        <img src="${escapeHtml(image.url)}" 
             alt="${escapeHtml(modelName)} - ${escapeHtml(image.versionName)}"
             onclick="window.openImageModal('${escapeHtml(
               image.url
             )}', '${escapeHtml(modelName)}')"
             onerror="this.parentElement.style.display='none'">
        <div class="image-info">
          <small>${escapeHtml(image.versionName)}</small>
          ${
            image.width && image.height
              ? `<small>${image.width}×${image.height}</small>`
              : ""
          }
        </div>
      </div>
    `;
  }

  /**
   * Creates the versions section HTML
   * @param {Array} modelVersions - Array of model versions
   * @param {number} modelId - Model ID
   * @param {string} previewImageUrl - Preview image URL
   * @returns {string} - HTML for versions section
   */
  createVersionsSection(modelVersions, modelId, previewImageUrl) {
    return modelVersions
      .map((version) =>
        this.createVersionItem(version, modelId, previewImageUrl)
      )
      .join("");
  }

  /**
   * Creates a single version item HTML
   * @param {Object} version - Version data
   * @param {number} modelId - Model ID
   * @param {string} previewImageUrl - Preview image URL
   * @returns {string} - HTML for version item
   */
  createVersionItem(version, modelId, previewImageUrl) {
    const filesHtml = (version.files || [])
      .map((file) =>
        this.createFileItem(
          file,
          modelId,
          version.id,
          previewImageUrl,
          version.trainedWords || []
        )
      )
      .join("");

    // Create trigger words display for this version
    const versionTriggerWordsHtml = this.createVersionTriggerWords(
      version.trainedWords || []
    );

    return `
      <div class="version-section">
          <h4>${escapeHtml(version.name)}</h4>
          <p>${sanitizeHtml(version.description || "No description")}</p>
          ${versionTriggerWordsHtml}
          <div class="version-files">
              ${filesHtml}
          </div>
      </div>
    `;
  }

  /**
   * Creates trigger words HTML for a specific version
   * @param {Array} trainedWords - Array of trigger words for this version
   * @returns {string} - HTML for version trigger words
   */
  createVersionTriggerWords(trainedWords) {
    if (
      !trainedWords ||
      !Array.isArray(trainedWords) ||
      trainedWords.length === 0
    ) {
      return "";
    }

    const filteredWords = trainedWords.filter((word) => word && word.trim());
    if (filteredWords.length === 0) {
      return "";
    }

    return `
      <div class="version-trigger-words">
        <strong>Trigger Words:</strong>
        <div class="trigger-words-inline">
          ${filteredWords
            .map(
              (word) =>
                `<span class="trigger-word-small" onclick="window.copyTriggerWord('${escapeHtml(
                  word.trim()
                ).replace(/'/g, "\\'")}')" title="Click to copy: ${escapeHtml(
                  word.trim()
                )}">${escapeHtml(word.trim())}</span>`
            )
            .join("")}
        </div>
      </div>
    `;
  }

  /**
   * Creates a single file item HTML with download button
   * @param {Object} file - File data
   * @param {number} modelId - Model ID
   * @param {number} versionId - Version ID
   * @param {string} previewImageUrl - Preview image URL
   * @param {Array} triggerWords - Trigger words for this version
   * @returns {string} - HTML for file item
   */
  createFileItem(file, modelId, versionId, previewImageUrl, triggerWords = []) {
    const fileSize = formatFileSize(file.sizeKB * 1024);
    const safePreviewUrl = escapeHtml(previewImageUrl || "");
    const safeFilename = escapeHtml(file.name);
    const safeTriggerWords = escapeForOnclick(triggerWords || []);

    return `
      <div class="file-item">
          <div class="file-info">
              <strong>${safeFilename}</strong>
              <span class="file-size">${fileSize}</span>
          </div>
          <button onclick="window.downloadModel(${modelId}, ${versionId}, ${file.id}, '${safeFilename}', '${safePreviewUrl}', ${safeTriggerWords})">
              Download
          </button>
      </div>
    `;
  }

  /**
   * Closes the model details modal
   */
  closeModal() {
    modalManager.closeModal("modelModal");
  }

  /**
   * Copies a trigger word to clipboard
   * @param {string} triggerWord - The trigger word to copy
   */
  async copyTriggerWord(triggerWord) {
    await copyToClipboard(triggerWord, `Copied "${triggerWord}" to clipboard!`);
  }

  /**
   * Gets model card HTML for use in other modules
   * @param {Object} model - Model data
   * @param {Function} onCardClick - Callback for card click
   * @returns {string} - HTML for model card
   */
  static createModelCardHtml(model, onCardClick = null) {
    // Get the first image from the first model version as preview
    let previewImageUrl = null;
    if (model.modelVersions && model.modelVersions.length > 0) {
      const firstVersion = model.modelVersions[0];
      if (firstVersion.images && firstVersion.images.length > 0) {
        previewImageUrl = firstVersion.images[0].url;
      }
    }

    const imageHtml = previewImageUrl
      ? `
        <div class="model-image-preview">
            <img src="${escapeHtml(previewImageUrl)}" 
                 alt="${escapeHtml(model.name)}" 
                 onerror="this.parentElement.style.display='none'">
        </div>
        `
      : "";

    const onClickHandler = onCardClick
      ? `onclick="${onCardClick}(${model.id})"`
      : `onclick="window.showModelDetails(${model.id})"`;

    const description = model.description || "No description available";
    const textOnly = description.replace(/<[^>]*>/g, ""); // Strip HTML for length check
    const truncated =
      textOnly.length > 150 ? textOnly.substring(0, 150) + "..." : description;

    return `
      <div class="model-card" ${onClickHandler}>
          ${imageHtml}
          <div class="model-content">
              <h3>${escapeHtml(model.name)}</h3>
              <p>${sanitizeHtml(truncated)}</p>
              <div class="model-meta">
                  <span class="model-type">${escapeHtml(model.type)}</span>
                  <span>by ${escapeHtml(
                    model.creator?.username || "Unknown"
                  )}</span>
              </div>
          </div>
      </div>
    `;
  }
}

// Create and export model manager instance
export const modelManager = new ModelManager();

// Export function for global access (backward compatibility)
export function showModelDetails(modelId) {
  return modelManager.showModelDetails(modelId);
}

export function closeModal() {
  return modelManager.closeModal();
}

export function copyTriggerWord(triggerWord) {
  return modelManager.copyTriggerWord(triggerWord);
}

// Make functions available globally for onclick handlers
window.showModelDetails = showModelDetails;
window.openImageModal = openImageModal;
window.copyTriggerWord = copyTriggerWord;
