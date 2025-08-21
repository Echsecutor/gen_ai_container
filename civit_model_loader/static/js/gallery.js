/**
 * Thumbnail Gallery Manager for Image Conversion Section
 * Handles fetching, displaying, and navigating image thumbnails
 */

import { listFiles } from "./api.js";
import { showToast } from "./ui.js";

/**
 * Manages the thumbnail gallery functionality
 */
class GalleryManager {
  constructor() {
    this.files = [];
    this.currentImageIndex = -1;
    this.isLoading = false;
    this.currentDirectory = "/workspace/output/images";

    this.galleryContainer = null;
    this.statusContainer = null;
    this.lightboxModal = null;
    this.lightboxImage = null;
    this.lightboxFilename = null;
    this.lightboxPath = null;
    this.lightboxPrev = null;
    this.lightboxNext = null;

    this.init();
  }

  /**
   * Initialize the gallery manager
   */
  init() {
    this.galleryContainer = document.getElementById("thumbnailGallery");
    this.statusContainer = document.getElementById("galleryStatus");
    this.lightboxModal = document.getElementById("lightboxModal");
    this.lightboxImage = document.getElementById("lightboxImage");
    this.lightboxFilename = document.getElementById("lightboxFilename");
    this.lightboxPath = document.getElementById("lightboxPath");
    this.lightboxPrev = document.getElementById("lightboxPrev");
    this.lightboxNext = document.getElementById("lightboxNext");

    if (!this.galleryContainer || !this.statusContainer) {
      console.warn(
        "Gallery containers not found, gallery functionality disabled"
      );
      return;
    }

    this.setupEventListeners();
    this.loadGallery(); // Load initial gallery
  }

  /**
   * Setup event listeners for gallery functionality
   */
  setupEventListeners() {
    // Refresh gallery button
    const refreshBtn = document.getElementById("refreshGalleryBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.loadGallery());
    }

    // Directory input change
    const directoryInput = document.getElementById("imageDirectory");
    if (directoryInput) {
      directoryInput.addEventListener("input", (e) => {
        this.currentDirectory =
          e.target.value.trim() || "/workspace/output/images";
      });

      // Auto-refresh gallery when directory changes (with debounce)
      let debounceTimer;
      directoryInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.loadGallery();
        }, 500);
      });
    }

    // Lightbox event listeners
    if (this.lightboxModal) {
      // Close lightbox
      const closeBtn = document.querySelector(".lightbox-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => this.closeLightbox());
      }

      // Click outside to close
      this.lightboxModal.addEventListener("click", (e) => {
        if (e.target === this.lightboxModal) {
          this.closeLightbox();
        }
      });

      // Navigation buttons
      if (this.lightboxPrev) {
        this.lightboxPrev.addEventListener("click", () =>
          this.navigateImage(-1)
        );
      }
      if (this.lightboxNext) {
        this.lightboxNext.addEventListener("click", () =>
          this.navigateImage(1)
        );
      }

      // Keyboard navigation
      document.addEventListener("keydown", (e) => {
        if (this.lightboxModal.style.display === "block") {
          switch (e.key) {
            case "Escape":
              this.closeLightbox();
              break;
            case "ArrowLeft":
              this.navigateImage(-1);
              break;
            case "ArrowRight":
              this.navigateImage(1);
              break;
          }
        }
      });
    }
  }

  /**
   * Load the image gallery for the current directory
   */
  async loadGallery() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.setStatus("loading", "Loading images...");

    try {
      const response = await listFiles(this.currentDirectory);
      this.files = response.files || [];

      // Filter to only image files (those with thumbnails)
      const imageFiles = this.files.filter((file) => file.thumbnail);

      if (imageFiles.length === 0) {
        this.setStatus("empty", `No images found in ${this.currentDirectory}`);
        this.clearGallery();
      } else {
        this.setStatus(
          "info",
          `Found ${imageFiles.length} image${
            imageFiles.length === 1 ? "" : "s"
          }`
        );
        this.renderGallery(imageFiles);
      }
    } catch (error) {
      console.error("Failed to load gallery:", error);
      this.setStatus("error", `Failed to load images: ${error.message}`);
      this.clearGallery();
      showToast(`Gallery error: ${error.message}`, "error");
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Render the thumbnail gallery
   * @param {Array} imageFiles - Array of image file objects with thumbnails
   */
  renderGallery(imageFiles) {
    if (!this.galleryContainer) return;

    this.galleryContainer.innerHTML = "";

    imageFiles.forEach((file, index) => {
      const thumbnailItem = this.createThumbnailItem(file, index);
      this.galleryContainer.appendChild(thumbnailItem);
    });
  }

  /**
   * Create a thumbnail item element
   * @param {Object} file - File object with thumbnail
   * @param {number} index - Index in the files array
   * @returns {HTMLElement} - Thumbnail item element
   */
  createThumbnailItem(file, index) {
    const item = document.createElement("div");
    item.className = "thumbnail-item";
    item.setAttribute("data-index", index);

    const imageContainer = document.createElement("div");
    imageContainer.className = "thumbnail-image";

    if (file.thumbnail) {
      const img = document.createElement("img");
      img.src = file.thumbnail;
      img.alt = file.filename;
      img.loading = "lazy";

      // Handle image load errors
      img.onerror = () => {
        imageContainer.innerHTML =
          '<div class="thumbnail-placeholder">Image unavailable</div>';
      };

      imageContainer.appendChild(img);
    } else {
      imageContainer.innerHTML =
        '<div class="thumbnail-placeholder">No preview</div>';
    }

    const info = document.createElement("div");
    info.className = "thumbnail-info";

    const filename = document.createElement("div");
    filename.className = "thumbnail-filename";
    filename.textContent = file.filename;
    filename.title = file.filename;

    const path = document.createElement("div");
    path.className = "thumbnail-path";
    path.textContent = file.full_path;
    path.title = file.full_path;

    info.appendChild(filename);
    info.appendChild(path);

    item.appendChild(imageContainer);
    item.appendChild(info);

    // Add click handler to open lightbox
    item.addEventListener("click", () => this.openLightbox(index));

    return item;
  }

  /**
   * Clear the gallery display
   */
  clearGallery() {
    if (this.galleryContainer) {
      this.galleryContainer.innerHTML = "";
    }
  }

  /**
   * Set gallery status message
   * @param {string} type - Status type (loading, error, empty, info)
   * @param {string} message - Status message
   */
  setStatus(type, message) {
    if (!this.statusContainer) return;

    this.statusContainer.innerHTML = `<div class="${type}">${message}</div>`;
  }

  /**
   * Open the lightbox with the specified image
   * @param {number} index - Index of the image to display
   */
  openLightbox(index) {
    const imageFiles = this.files.filter((file) => file.thumbnail);

    if (index < 0 || index >= imageFiles.length || !this.lightboxModal) return;

    this.currentImageIndex = index;
    const file = imageFiles[index];

    // Set image source (use thumbnail for lightbox)
    if (this.lightboxImage) {
      this.lightboxImage.src = file.thumbnail;
      this.lightboxImage.alt = file.filename;
    }

    // Set file info
    if (this.lightboxFilename) {
      this.lightboxFilename.textContent = file.filename;
    }
    if (this.lightboxPath) {
      this.lightboxPath.textContent = file.full_path;
    }

    // Update navigation button states
    this.updateNavigationButtons(index, imageFiles.length);

    // Show lightbox
    this.lightboxModal.style.display = "block";
    document.body.style.overflow = "hidden"; // Prevent background scrolling
  }

  /**
   * Close the lightbox
   */
  closeLightbox() {
    if (this.lightboxModal) {
      this.lightboxModal.style.display = "none";
      document.body.style.overflow = ""; // Restore scrolling
    }
    this.currentImageIndex = -1;
  }

  /**
   * Navigate to the next or previous image in the lightbox
   * @param {number} direction - Direction to navigate (-1 for previous, 1 for next)
   */
  navigateImage(direction) {
    const imageFiles = this.files.filter((file) => file.thumbnail);
    const newIndex = this.currentImageIndex + direction;

    if (newIndex >= 0 && newIndex < imageFiles.length) {
      this.openLightbox(newIndex);
    }
  }

  /**
   * Update navigation button states
   * @param {number} currentIndex - Current image index
   * @param {number} totalImages - Total number of images
   */
  updateNavigationButtons(currentIndex, totalImages) {
    if (this.lightboxPrev) {
      this.lightboxPrev.disabled = currentIndex === 0;
    }
    if (this.lightboxNext) {
      this.lightboxNext.disabled = currentIndex === totalImages - 1;
    }
  }

  /**
   * Refresh the gallery (public method)
   */
  refresh() {
    this.loadGallery();
  }

  /**
   * Update the directory and refresh the gallery
   * @param {string} directory - New directory path
   */
  setDirectory(directory) {
    this.currentDirectory = directory;
    this.loadGallery();
  }
}

// Create and export gallery manager instance
export const galleryManager = new GalleryManager();

// Export for external use
export { GalleryManager };
