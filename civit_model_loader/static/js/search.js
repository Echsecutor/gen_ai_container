/**
 * Search functionality and pagination management for the Civitai Model Loader
 */

import { searchModels } from "./api.js";
import {
  appState,
  getApiToken,
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
    this.setupEventListeners();
  }

  /**
   * Sets up event listeners for search functionality
   */
  setupEventListeners() {
    const searchBtn = document.getElementById("searchBtn");
    const searchQuery = document.getElementById("searchQuery");
    const nsfwFilter = document.getElementById("nsfwFilter");

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

    if (nsfwFilter) {
      nsfwFilter.addEventListener("change", (e) => {
        appState.saveNsfwPreference(e.target.checked);
      });
    }
  }

  /**
   * Performs a new search with form parameters
   */
  async performSearch() {
    // Reset to first page for new searches
    setCurrentPage(1);

    const query = document.getElementById("searchQuery")?.value.trim() || "";
    const modelType = document.getElementById("modelType")?.value || "";
    const sortBy =
      document.getElementById("sortBy")?.value || "Most Downloaded";

    const searchRequest = {
      query: query || null,
      types: modelType ? [modelType] : null,
      sort: sortBy,
      nsfw: getNsfwPreference() ? true : null, // Only send true or null, not false
      limit: 20,
      page: 1, // Always start from page 1 for new searches
      cursor: null, // Always start from beginning for new searches
      api_token: getApiToken() || null,
    };

    // Clear any stored metadata from previous searches
    appState.setLastSearchMetadata(null);

    setCurrentSearch(searchRequest);
    await this.performSearchWithRequest(searchRequest);
  }

  /**
   * Performs search with a specific request object
   * @param {Object} searchRequest - Search parameters
   */
  async performSearchWithRequest(searchRequest) {
    try {
      showLoading("searchResults");

      const results = await searchModels(searchRequest);

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
    if (!currentSearch) return;

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

    setCurrentSearch(currentSearch);
    await this.performSearchWithRequest(currentSearch);
  }

  /**
   * Changes page for page-based pagination
   * @param {number} page - Page number to navigate to
   */
  async changePage(page) {
    // Ensure page is a valid number
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      console.error("Invalid page number:", page);
      return;
    }

    setCurrentPage(pageNum);
    const currentSearch = getCurrentSearch();

    if (currentSearch) {
      // Update the page in the stored search request and perform search
      currentSearch.page = pageNum;
      setCurrentSearch(currentSearch);
      await this.performSearchWithRequest(currentSearch);
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

    const pagination = document.getElementById("pagination");
    if (pagination) {
      pagination.innerHTML = "";
    }

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
