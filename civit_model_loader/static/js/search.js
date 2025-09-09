/**
 * Search functionality and pagination management for the Civitai Model Loader
 */

import { getModelDetails, searchModels } from "./api.js";
import {
  appState,
  getCurrentSearch,
  getNsfwPreference,
  setCurrentPage,
  setCurrentSearch,
} from "./state.js";
import { showLoading, showToast } from "./ui.js";
import { escapeHtml, truncateDescription } from "./utils.js";

/**
 * Search manager class
 */
class SearchManager {
  constructor() {
    this.currentSearchMode = "query"; // Default search mode
    this.setupEventListeners();
  }

  /**
   * Sets up event listeners for search functionality
   */
  setupEventListeners() {
    const searchBtn = document.getElementById("searchBtn");
    const searchQuery = document.getElementById("searchQuery");
    const modelIdInput = document.getElementById("modelIdInput");
    const nsfwFilter = document.getElementById("nsfwFilter");
    const searchModeQuery = document.getElementById("searchModeQuery");
    const searchModeId = document.getElementById("searchModeId");

    if (searchBtn) {
      searchBtn.addEventListener("click", () => this.performSearch());
    }

    if (searchQuery) {
      searchQuery.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.performSearch();
        }
      });
    }

    if (modelIdInput) {
      modelIdInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.performSearch();
        }
      });
    }

    if (nsfwFilter) {
      nsfwFilter.addEventListener("change", (e) => {
        appState.saveNsfwPreference(e.target.checked);
      });
    }

    // Search mode toggle listeners
    if (searchModeQuery) {
      searchModeQuery.addEventListener("change", () => {
        if (searchModeQuery.checked) {
          this.switchSearchMode("query");
        }
      });
    }

    if (searchModeId) {
      searchModeId.addEventListener("change", () => {
        if (searchModeId.checked) {
          this.switchSearchMode("id");
        }
      });
    }
  }

  /**
   * Switches between search modes (query vs ID)
   * @param {string} mode - "query" or "id"
   */
  switchSearchMode(mode) {
    this.currentSearchMode = mode;
    const searchQuery = document.getElementById("searchQuery");
    const modelIdInput = document.getElementById("modelIdInput");
    const filterRow = document.getElementById("filterRow");

    if (mode === "query") {
      // Show query input, hide ID input, show filters
      if (searchQuery) searchQuery.style.display = "block";
      if (modelIdInput) modelIdInput.style.display = "none";
      if (filterRow) filterRow.classList.remove("hidden");
    } else {
      // Show ID input, hide query input, hide filters
      if (searchQuery) searchQuery.style.display = "none";
      if (modelIdInput) modelIdInput.style.display = "block";
      if (filterRow) filterRow.classList.add("hidden");
    }

    // Clear results when switching modes
    this.clearResults();
  }

  /**
   * Performs a new search with form parameters
   */
  async performSearch() {
    if (this.currentSearchMode === "id") {
      await this.performModelIdSearch();
    } else {
      await this.performQuerySearch();
    }
  }

  /**
   * Performs a query-based search
   */
  async performQuerySearch() {
    // Reset to first page for new searches
    setCurrentPage(1);

    const query = document.getElementById("searchQuery")?.value.trim() || "";
    const modelType = document.getElementById("modelType")?.value || "";
    const sortBy =
      document.getElementById("sortBy")?.value || "Most Downloaded";

    const searchRequest = {
      query: query || null,
      sort: sortBy,
      nsfw: getNsfwPreference() ? true : null, // Only send true or null, not false
      limit: 20,
      page: 1, // Always start from page 1 for new searches
      cursor: null, // Always start from beginning for new searches
      searchMode: "query", // Add search mode for tracking
    };

    // Only add types if a model type is selected
    if (modelType) {
      searchRequest.types = [modelType];
    }

    // Clear any stored metadata from previous searches
    appState.setLastSearchMetadata(null);

    // Clean the search request before storing and using it
    const cleanedRequest = this.cleanSearchRequest(searchRequest);
    setCurrentSearch(cleanedRequest);
    await this.performSearchWithRequest(cleanedRequest);
  }

  /**
   * Performs a model ID search
   */
  async performModelIdSearch() {
    const modelIdInput = document.getElementById("modelIdInput");
    const resultsContainer = document.getElementById("searchResults");

    if (!modelIdInput || !resultsContainer) {
      console.error("Required elements not found");
      return;
    }

    const modelId = parseInt(modelIdInput.value.trim());

    // Validate input
    if (!modelId || modelId <= 0) {
      showToast("Please enter a valid model ID", "error");
      return;
    }

    try {
      // Clear pagination since model ID search doesn't use it
      this.clearPagination();

      // Show loading state
      this.showLoading(resultsContainer);

      // Fetch model details
      const modelData = await getModelDetails(modelId);

      if (!modelData) {
        throw new Error("Model not found");
      }

      // Display the model as a single result
      this.displayModelIdResult(modelData, resultsContainer);
      showToast("Model loaded successfully", "success");

      // Store the search for state management
      setCurrentSearch({
        searchMode: "id",
        modelId: modelId,
      });
    } catch (error) {
      console.error("Model ID search error:", error);
      this.showError(resultsContainer, error.message);
      showToast(`Failed to load model: ${error.message}`, "error");
    }
  }

  /**
   * Performs search with a specific request object
   * @param {Object} searchRequest - Search parameters
   */
  async performSearchWithRequest(searchRequest) {
    try {
      showLoading("searchResults");

      // Clean up the search request to remove null types
      const cleanedRequest = this.cleanSearchRequest(searchRequest);

      const results = await searchModels(cleanedRequest);

      // Store metadata globally for cursor-based pagination
      appState.setLastSearchMetadata(results.metadata);

      this.displaySearchResults(results);
      this.setupPagination(results.metadata);
    } catch (error) {
      console.error("Search error:", error);
      showToast("Search failed: " + error.message, "error");
      const container = document.getElementById("searchResults");
      if (container) {
        container.innerHTML = "<p>Search failed. Please try again.</p>";
      }
    }
  }

  /**
   * Cleans up search request to remove problematic null values
   * @param {Object} searchRequest - Search request to clean
   * @returns {Object} - Cleaned search request
   */
  cleanSearchRequest(searchRequest) {
    const cleaned = { ...searchRequest };

    // Remove types field if it's null or empty array
    if (
      cleaned.types === null ||
      (Array.isArray(cleaned.types) && cleaned.types.length === 0)
    ) {
      delete cleaned.types;
    }

    return cleaned;
  }

  /**
   * Displays search results in the UI
   * @param {Object} results - Search results from API
   */
  displaySearchResults(results) {
    const container = document.getElementById("searchResults");
    if (!container) return;

    if (!results.items || results.items.length === 0) {
      container.innerHTML =
        "<p>No models found. Try adjusting your search criteria.</p>";
      return;
    }

    try {
      container.innerHTML = results.items
        .map((model) => this.createModelCard(model))
        .join("");
    } catch (error) {
      console.error("Error displaying search results:", error);
      container.innerHTML =
        "<p>Error displaying search results. Please try again.</p>";
    }
  }

  /**
   * Creates a model card HTML for search results
   * @param {Object} model - Model data
   * @returns {string} - HTML string for model card
   */
  createModelCard(model) {
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

    const truncatedDescription = truncateDescription(model.description);

    return `
      <div class="model-card" onclick="window.showModelDetails(${model.id})">
          ${imageHtml}
          <div class="model-content">
              <h3>${escapeHtml(model.name)}</h3>
              <p>${truncatedDescription}</p>
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

  /**
   * Sets up pagination controls
   * @param {Object} metadata - Search metadata from API
   */
  setupPagination(metadata) {
    const container = document.getElementById("pagination");
    if (!container) return;

    // Check if this is a query search (cursor-based pagination)
    const currentSearch = getCurrentSearch();
    const isQuerySearch = currentSearch && currentSearch.query;

    if (isQuerySearch) {
      // For query searches, use cursor-based pagination
      this.setupCursorPagination(metadata, container);
      return;
    }

    // Regular page-based pagination
    this.setupPagePagination(metadata, container);
  }

  /**
   * Sets up cursor-based pagination for query searches
   * @param {Object} metadata - Search metadata
   * @param {Element} container - Pagination container
   */
  setupCursorPagination(metadata, container) {
    let paginationHtml = "";
    const currentSearch = getCurrentSearch();

    // Previous button (if we have a previous cursor or this isn't the first page)
    const hasPrevious =
      currentSearch.cursor || (metadata && metadata.prevCursor);
    paginationHtml += `<button onclick="window.changeCursor('prev')" ${
      !hasPrevious ? "disabled" : ""
    }>Previous</button>`;

    // Show current position info with query details
    const queryInfo = currentSearch.query || "";
    const typeInfo =
      currentSearch.types && currentSearch.types.length > 0
        ? ` (${currentSearch.types.join(", ")})`
        : "";
    paginationHtml += `<span style="margin: 0 15px; color: #666;">Search results${
      queryInfo ? ` for "${queryInfo}"` : ""
    }${typeInfo}</span>`;

    // Next button (if metadata indicates more results)
    const hasNext = metadata && (metadata.nextCursor || metadata.nextPage);
    paginationHtml += `<button onclick="window.changeCursor('next')" ${
      !hasNext ? "disabled" : ""
    }>Next</button>`;

    container.innerHTML = paginationHtml;
  }

  /**
   * Sets up page-based pagination for non-query searches
   * @param {Object} metadata - Search metadata
   * @param {Element} container - Pagination container
   */
  setupPagePagination(metadata, container) {
    const totalPages = metadata.totalPages || 1;
    const currentPageNum = metadata.currentPage || 1;

    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }

    let paginationHtml = "";

    // Previous button
    paginationHtml += `<button onclick="window.changePage(${
      currentPageNum - 1
    })" ${currentPageNum <= 1 ? "disabled" : ""}>Previous</button>`;

    // Page numbers (show current, 2 before, 2 after)
    const startPage = Math.max(1, currentPageNum - 2);
    const endPage = Math.min(totalPages, currentPageNum + 2);

    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `<button onclick="window.changePage(${i})" ${
        i === currentPageNum ? 'class="active"' : ""
      }>${i}</button>`;
    }

    // Next button
    paginationHtml += `<button onclick="window.changePage(${
      currentPageNum + 1
    })" ${currentPageNum >= totalPages ? "disabled" : ""}>Next</button>`;

    container.innerHTML = paginationHtml;
  }

  /**
   * Changes cursor for cursor-based pagination
   * @param {string} direction - 'next' or 'prev'
   */
  async changeCursor(direction) {
    const currentSearch = getCurrentSearch();
    if (!currentSearch || currentSearch.searchMode === "id") {
      // No pagination for model ID search
      return;
    }

    // For cursor-based pagination, we need to get the nextCursor from the last response
    if (direction === "next") {
      const lastMetadata = appState.getLastSearchMetadata();
      if (lastMetadata && lastMetadata.nextCursor) {
        currentSearch.cursor = lastMetadata.nextCursor;
      } else {
        showToast("No more results available", "warning");
        return;
      }
    } else if (direction === "prev") {
      // For previous, remove the cursor to go back to the beginning
      // In a full implementation, we'd maintain a cursor history stack
      currentSearch.cursor = null;
    }

    // Clean the search request before storing and using it
    const cleanedSearch = this.cleanSearchRequest(currentSearch);
    setCurrentSearch(cleanedSearch);
    await this.performSearchWithRequest(cleanedSearch);
  }

  /**
   * Changes page for page-based pagination
   * @param {number} page - Page number to navigate to
   */
  async changePage(page) {
    const currentSearch = getCurrentSearch();
    if (!currentSearch || currentSearch.searchMode === "id") {
      // No pagination for model ID search
      return;
    }

    // Ensure page is a valid number
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      console.error("Invalid page number:", page);
      return;
    }

    setCurrentPage(pageNum);

    if (currentSearch) {
      // Update the page in the stored search request and perform search
      currentSearch.page = pageNum;
      // Clean the search request before storing and using it
      const cleanedSearch = this.cleanSearchRequest(currentSearch);
      setCurrentSearch(cleanedSearch);
      await this.performSearchWithRequest(cleanedSearch);
    }
  }

  /**
   * Shows loading state in the results container
   * @param {Element} container - Results container element
   */
  showLoading(container) {
    container.innerHTML = `
      <div class="loading">
        🔍 Loading model details...
      </div>
    `;
  }

  /**
   * Shows error state in the results container
   * @param {Element} container - Results container element
   * @param {string} errorMessage - Error message to display
   */
  showError(container, errorMessage) {
    container.innerHTML = `
      <div class="error">
        ❌ Error: ${escapeHtml(errorMessage)}
      </div>
    `;
  }

  /**
   * Displays a single model result from model ID search
   * @param {Object} model - Model data from API
   * @param {Element} container - Results container element
   */
  displayModelIdResult(model, container) {
    try {
      const modelCard = this.createDetailedModelCard(model);
      container.innerHTML = modelCard;
    } catch (error) {
      console.error("Error displaying model result:", error);
      this.showError(container, "Failed to display model details");
    }
  }

  /**
   * Creates a detailed model card HTML for model ID search results
   * @param {Object} model - Model data
   * @returns {string} - HTML string for model card
   */
  createDetailedModelCard(model) {
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

    const truncatedDescription = truncateDescription(model.description);

    // Version information
    const versionsInfo =
      model.modelVersions && model.modelVersions.length > 0
        ? `
        <div class="model-versions-info">
          <h4>Available Versions (${model.modelVersions.length})</h4>
          <div class="versions-list">
            ${model.modelVersions
              .slice(0, 3)
              .map(
                (version) => `
              <div class="version-item">
                <strong>${escapeHtml(version.name)}</strong>
                ${
                  version.files && version.files.length > 0
                    ? `<span class="file-count">(${version.files.length} files)</span>`
                    : ""
                }
              </div>
            `
              )
              .join("")}
            ${
              model.modelVersions.length > 3
                ? `<div class="more-versions">... and ${
                    model.modelVersions.length - 3
                  } more versions</div>`
                : ""
            }
          </div>
        </div>
        `
        : "";

    return `
      <div class="model-card detailed-model-card">
          ${imageHtml}
          <div class="model-content">
              <div class="model-header">
                  <h3>${escapeHtml(model.name)}</h3>
                  <span class="model-id-badge">ID: ${model.id}</span>
              </div>
              <p class="model-description">${truncatedDescription}</p>
              <div class="model-meta">
                  <span class="model-type">${escapeHtml(model.type)}</span>
                  <span>by ${escapeHtml(
                    model.creator?.username || "Unknown"
                  )}</span>
                  ${
                    model.stats
                      ? `
                    <span class="model-stats">
                      👍 ${model.stats.thumbsUpCount || 0} | 
                      ⬇️ ${model.stats.downloadCount || 0}
                    </span>
                  `
                      : ""
                  }
              </div>
              ${versionsInfo}
              <div class="model-actions">
                  <button onclick="window.showModelDetails(${
                    model.id
                  })" class="btn-primary">
                      View Full Details & Download
                  </button>
              </div>
          </div>
      </div>
    `;
  }

  /**
   * Clears pagination
   */
  clearPagination() {
    const pagination = document.getElementById("pagination");
    if (pagination) {
      pagination.innerHTML = "";
    }
  }

  /**
   * Clears search results
   */
  clearResults() {
    const container = document.getElementById("searchResults");
    if (container) {
      container.innerHTML = "";
    }

    this.clearPagination();
    setCurrentSearch(null);
    setCurrentPage(1);
    appState.setLastSearchMetadata(null);
  }

  /**
   * Gets current search form values
   * @returns {Object} - Search form values
   */
  getCurrentFormValues() {
    return {
      query: document.getElementById("searchQuery")?.value.trim() || "",
      modelType: document.getElementById("modelType")?.value || "",
      sortBy: document.getElementById("sortBy")?.value || "Most Downloaded",
      nsfw: getNsfwPreference(),
    };
  }

  /**
   * Sets search form values
   * @param {Object} values - Form values to set
   */
  setFormValues(values) {
    if (values.query !== undefined) {
      const queryInput = document.getElementById("searchQuery");
      if (queryInput) queryInput.value = values.query;
    }

    if (values.modelType !== undefined) {
      const typeSelect = document.getElementById("modelType");
      if (typeSelect) typeSelect.value = values.modelType;
    }

    if (values.sortBy !== undefined) {
      const sortSelect = document.getElementById("sortBy");
      if (sortSelect) sortSelect.value = values.sortBy;
    }

    if (values.nsfw !== undefined) {
      const nsfwCheckbox = document.getElementById("nsfwFilter");
      if (nsfwCheckbox) nsfwCheckbox.checked = values.nsfw;
    }
  }
}

// Create and export search manager instance
export const searchManager = new SearchManager();

// Export functions for global access (backward compatibility)
export function performSearch() {
  return searchManager.performSearch();
}

export function changeCursor(direction) {
  return searchManager.changeCursor(direction);
}

export function changePage(page) {
  return searchManager.changePage(page);
}

export function clearSearchResults() {
  return searchManager.clearResults();
}

// Make functions available globally for onclick handlers
window.changeCursor = changeCursor;
window.changePage = changePage;
