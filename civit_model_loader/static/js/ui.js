/**
 * UI components and interaction management for the Civitai Model Loader
 */

import { escapeHtml } from "./utils.js";

/**
 * Shows a toast notification to the user
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (info, success, warning, error)
 */
export function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) {
    console.warn("Toast element not found");
    return;
  }

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/**
 * Shows loading state in a container
 * @param {string} containerId - ID of the container element
 * @param {string} message - Optional loading message
 */
export function showLoading(containerId, message = "Loading...") {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<p>${escapeHtml(message)}</p>`;
  }
}

/**
 * Modal management class for handling different types of modals
 */
class ModalManager {
  constructor() {
    this.modals = new Map();
    this.setupGlobalEventListeners();
  }

  /**
   * Registers a modal for management
   * @param {string} modalId - ID of the modal element
   * @param {Object} options - Modal configuration options
   */
  registerModal(modalId, options = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.warn(`Modal with ID ${modalId} not found`);
      return;
    }

    const config = {
      closeOnOutsideClick: true,
      closeOnEscape: true,
      onOpen: null,
      onClose: null,
      ...options,
    };

    this.modals.set(modalId, { element: modal, config });
    this.setupModalEventListeners(modalId);
  }

  /**
   * Opens a modal
   * @param {string} modalId - ID of the modal to open
   */
  openModal(modalId) {
    const modalData = this.modals.get(modalId);
    if (!modalData) {
      console.warn(`Modal ${modalId} not registered`);
      return;
    }

    modalData.element.style.display = "block";
    document.body.style.overflow = "hidden"; // Prevent background scrolling

    if (modalData.config.onOpen) {
      modalData.config.onOpen();
    }
  }

  /**
   * Closes a modal
   * @param {string} modalId - ID of the modal to close
   */
  closeModal(modalId) {
    const modalData = this.modals.get(modalId);
    if (!modalData) {
      console.warn(`Modal ${modalId} not registered`);
      return;
    }

    modalData.element.style.display = "none";
    document.body.style.overflow = ""; // Restore scrolling

    if (modalData.config.onClose) {
      modalData.config.onClose();
    }
  }

  /**
   * Closes all open modals
   */
  closeAllModals() {
    this.modals.forEach((modalData, modalId) => {
      if (modalData.element.style.display === "block") {
        this.closeModal(modalId);
      }
    });
  }

  /**
   * Sets up event listeners for a specific modal
   * @param {string} modalId - ID of the modal
   */
  setupModalEventListeners(modalId) {
    const modalData = this.modals.get(modalId);
    if (!modalData) return;

    const modal = modalData.element;
    const config = modalData.config;

    // Close button click
    const closeBtn = modal.querySelector(".close");
    if (closeBtn) {
      closeBtn.onclick = () => this.closeModal(modalId);
    }

    // Click outside modal content
    if (config.closeOnOutsideClick) {
      modal.onclick = (event) => {
        if (event.target === modal) {
          this.closeModal(modalId);
        }
      };
    }
  }

  /**
   * Sets up global event listeners for modal management
   */
  setupGlobalEventListeners() {
    // Escape key to close modals
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        // Find the topmost modal that accepts escape closing
        for (let [modalId, modalData] of this.modals) {
          if (
            modalData.element.style.display === "block" &&
            modalData.config.closeOnEscape
          ) {
            this.closeModal(modalId);
            break; // Only close the topmost modal
          }
        }
      }
    });
  }
}

// Create global modal manager instance
export const modalManager = new ModalManager();

/**
 * Image modal functionality for displaying full-size images
 */
export class ImageModal {
  constructor() {
    this.modal = null;
    this.createModal();
  }

  /**
   * Creates the image modal DOM structure
   */
  createModal() {
    // Remove existing modal if it exists
    const existingModal = document.getElementById("imageModal");
    if (existingModal) {
      existingModal.remove();
    }

    this.modal = document.createElement("div");
    this.modal.id = "imageModal";
    this.modal.className = "image-modal";
    this.modal.innerHTML = `
      <div class="image-modal-content">
        <span class="image-modal-close">&times;</span>
        <img id="modalImage" class="modal-image">
        <div id="modalCaption" class="modal-caption"></div>
      </div>
    `;

    // Event listeners
    this.modal.onclick = (event) => {
      if (event.target === this.modal) {
        this.close();
      }
    };

    const closeBtn = this.modal.querySelector(".image-modal-close");
    if (closeBtn) {
      closeBtn.onclick = () => this.close();
    }

    document.body.appendChild(this.modal);
  }

  /**
   * Opens the image modal with specified image
   * @param {string} imageUrl - URL of the image to display
   * @param {string} caption - Caption for the image
   */
  open(imageUrl, caption = "") {
    const modalImage = this.modal.querySelector("#modalImage");
    const modalCaption = this.modal.querySelector("#modalCaption");

    if (modalImage) modalImage.src = imageUrl;
    if (modalCaption) modalCaption.textContent = caption;

    this.modal.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  /**
   * Closes the image modal
   */
  close() {
    if (this.modal) {
      this.modal.style.display = "none";
      document.body.style.overflow = "";
    }
  }
}

// Create global image modal instance
export const imageModal = new ImageModal();

/**
 * Token UI state management
 */
export class TokenUI {
  constructor() {
    this.tokenLoadedElement = null;
    this.tokenInputElement = null;
    this.init();
  }

  init() {
    this.tokenLoadedElement = document.getElementById("tokenLoadedState");
    this.tokenInputElement = document.getElementById("tokenInputState");
  }

  /**
   * Shows the token loaded state (with checkmark)
   */
  showTokenLoaded() {
    if (this.tokenLoadedElement && this.tokenInputElement) {
      this.tokenLoadedElement.style.display = "flex";
      this.tokenInputElement.style.display = "none";
    }
  }

  /**
   * Shows the token input state (input field)
   */
  showTokenInput() {
    if (this.tokenLoadedElement && this.tokenInputElement) {
      this.tokenLoadedElement.style.display = "none";
      this.tokenInputElement.style.display = "flex";
    }
  }
}

/**
 * Progress bar management
 */
export class ProgressBar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.progressBar = null;
    this.createProgressBar();
  }

  createProgressBar() {
    if (!this.container) return;

    this.progressBar = document.createElement("div");
    this.progressBar.className = "download-progress";
    this.progressBar.innerHTML = `
      <div class="download-progress-bar" style="width: 0%"></div>
    `;

    this.container.appendChild(this.progressBar);
  }

  /**
   * Updates the progress bar
   * @param {number} percentage - Progress percentage (0-100)
   */
  updateProgress(percentage) {
    if (!this.progressBar) return;

    const bar = this.progressBar.querySelector(".download-progress-bar");
    if (bar) {
      bar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }
  }

  /**
   * Removes the progress bar
   */
  remove() {
    if (this.progressBar && this.progressBar.parentNode) {
      this.progressBar.parentNode.removeChild(this.progressBar);
    }
  }
}

/**
 * Generic loading state manager
 */
export class LoadingManager {
  constructor() {
    this.loadingStates = new Map();
  }

  /**
   * Sets loading state for a container
   * @param {string} containerId - ID of the container
   * @param {boolean} isLoading - Whether to show loading state
   * @param {string} message - Loading message
   */
  setLoading(containerId, isLoading, message = "Loading...") {
    if (isLoading) {
      this.loadingStates.set(containerId, true);
      showLoading(containerId, message);
    } else {
      this.loadingStates.delete(containerId);
    }
  }

  /**
   * Checks if a container is in loading state
   * @param {string} containerId - ID of the container
   * @returns {boolean} - True if loading
   */
  isLoading(containerId) {
    return this.loadingStates.has(containerId);
  }

  /**
   * Clears all loading states
   */
  clearAll() {
    this.loadingStates.clear();
  }
}

// Global instances
export const tokenUI = new TokenUI();
export const loadingManager = new LoadingManager();

/**
 * Utility function to open image modal (for backward compatibility)
 * @param {string} imageUrl - URL of the image
 * @param {string} modelName - Name for the caption
 */
export function openImageModal(imageUrl, modelName) {
  imageModal.open(imageUrl, modelName);
}

/**
 * Utility function to close image modal (for backward compatibility)
 */
export function closeImageModal() {
  imageModal.close();
}
