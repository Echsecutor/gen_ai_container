// Global state
let currentPage = 1;
let currentSearch = null;
let apiToken = "";
let downloadedModels = [];
let pollInterval = null;

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
  setupEventListeners();
  loadStoredData();
});

function initializeApp() {
  showToast("Application loaded successfully", "success");

  // Start polling for download updates
  startDownloadPolling();
}

function setupEventListeners() {
  // API Token - Input state
  document.getElementById("saveToken").addEventListener("click", saveApiToken);
  document.getElementById("testToken").addEventListener("click", testApiToken);

  // API Token - Loaded state
  document
    .getElementById("changeToken")
    .addEventListener("click", showTokenInput);
  document
    .getElementById("testTokenLoaded")
    .addEventListener("click", testApiToken);

  // Search
  document.getElementById("searchBtn").addEventListener("click", performSearch);
  document
    .getElementById("searchQuery")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") performSearch();
    });

  // NSFW preference
  document
    .getElementById("nsfwFilter")
    .addEventListener("change", saveNsfwPreference);

  // Downloaded models
  document
    .getElementById("refreshDownloaded")
    .addEventListener("click", loadDownloadedModels);
  document
    .getElementById("exportConfig")
    .addEventListener("click", exportConfiguration);
  document.getElementById("importConfigBtn").addEventListener("click", () => {
    document.getElementById("importConfig").click();
  });
  document
    .getElementById("importConfig")
    .addEventListener("change", importConfiguration);

  // Modal
  document.querySelector(".close").addEventListener("click", closeModal);
  window.addEventListener("click", function (e) {
    if (e.target.classList.contains("modal")) {
      closeModal();
    }
  });
}

// Local Storage Functions
function loadStoredData() {
  // Load API token
  const storedToken = localStorage.getItem("civitai_api_token");

  if (storedToken) {
    apiToken = storedToken;
    document.getElementById("apiToken").value = apiToken;
    showTokenLoaded();
  } else {
    showTokenInput();
  }

  // Load NSFW preference
  const storedNsfw = localStorage.getItem("civitai_nsfw_preference");
  if (storedNsfw !== null) {
    document.getElementById("nsfwFilter").checked = JSON.parse(storedNsfw);
  }

  // Load downloaded models history
  const storedModels = localStorage.getItem("civitai_downloaded_models");
  if (storedModels) {
    downloadedModels = JSON.parse(storedModels);
    displayDownloadedModels();
  }
}

// Token UI state management
function showTokenLoaded() {
  const loadedElement = document.getElementById("tokenLoadedState");
  const inputElement = document.getElementById("tokenInputState");

  if (loadedElement && inputElement) {
    loadedElement.style.display = "flex";
    inputElement.style.display = "none";
  }
}

function showTokenInput() {
  const loadedElement = document.getElementById("tokenLoadedState");
  const inputElement = document.getElementById("tokenInputState");

  if (loadedElement && inputElement) {
    loadedElement.style.display = "none";
    inputElement.style.display = "flex";
  }
}

function saveApiToken() {
  const tokenInput = document.getElementById("apiToken");
  apiToken = tokenInput.value.trim();

  if (apiToken) {
    localStorage.setItem("civitai_api_token", apiToken);
    showToast("API token saved successfully", "success");
    showTokenLoaded();
  } else {
    localStorage.removeItem("civitai_api_token");
    showToast("API token removed", "warning");
    showTokenInput();
  }
}

async function testApiToken() {
  // Use stored token if available, otherwise get from input
  let testToken;
  if (apiToken) {
    testToken = apiToken;
  } else {
    const tokenInput = document.getElementById("apiToken");
    testToken = tokenInput.value.trim();
  }

  if (!testToken) {
    showToast("Please enter an API token to test", "error");
    return;
  }

  try {
    // Test with a simple search
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "test",
        limit: 1,
      }),
    });

    if (response.ok) {
      showToast("API token is valid", "success");
    } else {
      showToast("API token test failed", "error");
    }
  } catch (error) {
    console.error("Token test error:", error);
    showToast("Failed to test API token", "error");
  }
}

// Search Functions
async function performSearchWithRequest(searchRequest) {
  try {
    showLoading("searchResults");

    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchRequest),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const results = await response.json();

    // Store metadata globally for cursor-based pagination
    window.lastSearchMetadata = results.metadata;

    displaySearchResults(results);
    setupPagination(results.metadata);
  } catch (error) {
    console.error("Search error:", error);
    showToast("Search failed: " + error.message, "error");
    document.getElementById("searchResults").innerHTML =
      "<p>Search failed. Please try again.</p>";
  }
}

async function performSearch() {
  // Reset to first page for new searches
  currentPage = 1;

  const query = document.getElementById("searchQuery").value.trim();
  const modelType = document.getElementById("modelType").value;
  const sortBy = document.getElementById("sortBy").value;
  const includeNsfw = document.getElementById("nsfwFilter").checked;

  const searchRequest = {
    query: query || null,
    types: modelType ? [modelType] : null,
    sort: sortBy,
    nsfw: includeNsfw ? true : null, // Only send true or null, not false
    limit: 20,
    page: 1, // Always start from page 1 for new searches
    cursor: null, // Always start from beginning for new searches
    api_token: apiToken || null,
  };

  // Clear any stored metadata from previous searches
  window.lastSearchMetadata = null;

  currentSearch = searchRequest;
  await performSearchWithRequest(searchRequest);
}

function displaySearchResults(results) {
  const container = document.getElementById("searchResults");

  if (!results.items || results.items.length === 0) {
    container.innerHTML =
      "<p>No models found. Try adjusting your search criteria.</p>";
    return;
  }

  try {
    container.innerHTML = results.items
      .map((model) => {
        // Get the first image from the first model version as preview
        let previewImageUrl = null;
        if (model.modelVersions && model.modelVersions.length > 0) {
          const firstVersion = model.modelVersions[0];
          if (firstVersion.images && firstVersion.images.length > 0) {
            previewImageUrl = firstVersion.images[0].url;
          }
        }

        return `
        <div class="model-card" onclick="showModelDetails(${model.id})">
            ${
              previewImageUrl
                ? `
            <div class="model-image-preview">
                <img src="${escapeHtml(previewImageUrl)}" 
                     alt="${escapeHtml(model.name)}" 
                     onerror="this.parentElement.style.display='none'">
            </div>
            `
                : ""
            }
            <div class="model-content">
                <h3>${escapeHtml(model.name)}</h3>
                <p>${(() => {
                  const desc = model.description || "No description available";
                  const textOnly = desc.replace(/<[^>]*>/g, ""); // Strip HTML for length check
                  const truncated =
                    textOnly.length > 150
                      ? textOnly.substring(0, 150) + "..."
                      : desc;
                  return sanitizeHtml(truncated);
                })()}</p>
                <div class="model-meta">
                    <span class="model-type">${escapeHtml(model.type)}</span>
                    <span>by ${escapeHtml(
                      model.creator?.username || "Unknown"
                    )}</span>
                </div>
            </div>
        </div>
      `;
      })
      .join("");
  } catch (error) {
    console.error("Error displaying search results:", error);
    container.innerHTML =
      "<p>Error displaying search results. Please try again.</p>";
  }
}

function setupPagination(metadata) {
  const container = document.getElementById("pagination");

  // Check if this is a query search (cursor-based pagination)
  // Query searches don't have currentPage/totalPages, they use cursor
  const isQuerySearch = currentSearch && currentSearch.query;

  if (isQuerySearch) {
    // For query searches, use cursor-based pagination
    setupCursorPagination(metadata, container);
    return;
  }

  const totalPages = metadata.totalPages || 1;
  const currentPageNum = metadata.currentPage || 1;

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let paginationHtml = "";

  // Previous button
  paginationHtml += `<button onclick="changePage(${currentPageNum - 1})" ${
    currentPageNum <= 1 ? "disabled" : ""
  }>Previous</button>`;

  // Page numbers (show current, 2 before, 2 after)
  const startPage = Math.max(1, currentPageNum - 2);
  const endPage = Math.min(totalPages, currentPageNum + 2);

  for (let i = startPage; i <= endPage; i++) {
    paginationHtml += `<button onclick="changePage(${i})" ${
      i === currentPageNum ? 'class="active"' : ""
    }>${i}</button>`;
  }

  // Next button
  paginationHtml += `<button onclick="changePage(${currentPageNum + 1})" ${
    currentPageNum >= totalPages ? "disabled" : ""
  }>Next</button>`;

  container.innerHTML = paginationHtml;
}

function setupCursorPagination(metadata, container) {
  let paginationHtml = "";

  // Previous button (if we have a previous cursor or this isn't the first page)
  const hasPrevious = currentSearch.cursor || (metadata && metadata.prevCursor);
  paginationHtml += `<button onclick="changeCursor('prev')" ${
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
  paginationHtml += `<button onclick="changeCursor('next')" ${
    !hasNext ? "disabled" : ""
  }>Next</button>`;

  container.innerHTML = paginationHtml;
}

function changeCursor(direction) {
  if (!currentSearch) return;

  // For cursor-based pagination, we need to get the nextCursor from the last response
  if (direction === "next") {
    const lastMetadata = window.lastSearchMetadata;
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

  performSearchWithRequest(currentSearch);
}

function changePage(page) {
  // Ensure page is a valid number
  const pageNum = parseInt(page);
  if (isNaN(pageNum) || pageNum < 1) {
    console.error("Invalid page number:", page);
    return;
  }

  currentPage = pageNum;
  if (currentSearch) {
    // Update the page in the stored search request and perform search
    currentSearch.page = pageNum;
    performSearchWithRequest(currentSearch);
  }
}

// Model Details
async function showModelDetails(modelId) {
  try {
    showLoading("modelDetails");
    document.getElementById("modelModal").style.display = "block";

    const response = await fetch(`/api/models/${modelId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch model details: ${response.statusText}`);
    }

    const model = await response.json();
    displayModelDetails(model);
  } catch (error) {
    console.error("Model details error:", error);
    showToast("Failed to load model details", "error");
    document.getElementById("modelDetails").innerHTML =
      "<p>Failed to load model details.</p>";
  }
}

function displayModelDetails(model) {
  const container = document.getElementById("modelDetails");

  // Collect all images from all versions
  const allImages = [];
  if (model.modelVersions && Array.isArray(model.modelVersions)) {
    model.modelVersions.forEach((version) => {
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

  const imagesHtml =
    allImages.length > 0
      ? `
    <div class="model-images-section">
      <h3>Model Images</h3>
      <div class="model-images-grid">
        ${allImages
          .map(
            (image) => `
          <div class="model-image-item">
            <img src="${escapeHtml(image.url)}" 
                 alt="${escapeHtml(model.name)} - ${escapeHtml(
              image.versionName
            )}"
                 onclick="openImageModal('${escapeHtml(
                   image.url
                 )}', '${escapeHtml(model.name)}')"
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
        `
          )
          .join("")}
      </div>
    </div>
  `
      : "";

  const versionsHtml = (model.modelVersions || [])
    .map(
      (version) => `
        <div class="version-section">
            <h4>${escapeHtml(version.name)}</h4>
            <p>${sanitizeHtml(version.description || "No description")}</p>
            <div class="version-files">
                ${version.files
                  .map(
                    (file) => `
                    <div class="file-item">
                        <div class="file-info">
                            <strong>${escapeHtml(file.name)}</strong>
                            <span class="file-size">${formatFileSize(
                              file.sizeKB * 1024
                            )}</span>
                        </div>
                        <button onclick="downloadModel(${model.id}, ${
                      version.id
                    }, ${file.id}, '${escapeHtml(file.name)}')">
                            Download
                        </button>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>
    `
    )
    .join("");

  container.innerHTML = `
        <h2>${escapeHtml(model.name)}</h2>
        <p><strong>Type:</strong> ${escapeHtml(model.type)}</p>
        <p><strong>Creator:</strong> ${escapeHtml(
          model.creator?.username || "Unknown"
        )}</p>
        <p><strong>Description:</strong> ${sanitizeHtml(
          model.description || "No description available"
        )}</p>
        ${imagesHtml}
        <div class="model-versions">
            <h3>Available Versions</h3>
            ${versionsHtml}
        </div>
    `;
}

// Image Modal Functions
function openImageModal(imageUrl, modelName) {
  const modal = document.getElementById("imageModal") || createImageModal();
  const modalImage = modal.querySelector("#modalImage");
  const modalCaption = modal.querySelector("#modalCaption");

  modalImage.src = imageUrl;
  modalCaption.textContent = modelName;
  modal.style.display = "block";
}

function createImageModal() {
  const modal = document.createElement("div");
  modal.id = "imageModal";
  modal.className = "image-modal";
  modal.innerHTML = `
    <div class="image-modal-content">
      <span class="image-modal-close" onclick="closeImageModal()">&times;</span>
      <img id="modalImage" class="modal-image">
      <div id="modalCaption" class="modal-caption"></div>
    </div>
  `;

  // Close modal when clicking outside the image
  modal.onclick = function (event) {
    if (event.target === modal) {
      closeImageModal();
    }
  };

  document.body.appendChild(modal);
  return modal;
}

function closeImageModal() {
  const modal = document.getElementById("imageModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Download Functions
async function downloadModel(modelId, versionId, fileId, filename) {
  if (!apiToken) {
    showToast("Please save your API token first", "error");
    return;
  }

  try {
    const response = await fetch("/api/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: modelId,
        version_id: versionId,
        file_id: fileId,
        api_token: apiToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const result = await response.json();
    showToast(`Download started: ${filename}`, "success");

    // Add to downloaded models history
    const modelInfo = {
      id: modelId,
      versionId: versionId,
      fileId: fileId,
      filename: filename,
      downloadId: result.download_id,
      timestamp: new Date().toISOString(),
    };

    downloadedModels.push(modelInfo);
    localStorage.setItem(
      "civitai_downloaded_models",
      JSON.stringify(downloadedModels)
    );
    displayDownloadedModels();

    // Close modal
    closeModal();
  } catch (error) {
    console.error("Download error:", error);
    showToast("Download failed: " + error.message, "error");
  }
}

async function loadDownloadQueue() {
  try {
    const response = await fetch("/api/downloads");
    if (!response.ok) {
      throw new Error(`Failed to fetch downloads: ${response.statusText}`);
    }

    const downloads = await response.json();
    displayDownloadQueue(downloads);
  } catch (error) {
    console.error("Download queue error:", error);
  }
}

function displayDownloadQueue(downloads) {
  const container = document.getElementById("downloadQueue");

  const downloadArray = Object.values(downloads);

  if (downloadArray.length === 0) {
    container.innerHTML = "<p>No active downloads</p>";
    return;
  }

  container.innerHTML = downloadArray
    .map(
      (download) => `
        <div class="download-item">
            <div class="download-info">
                <h4>${escapeHtml(download.filename)}</h4>
                <p>Status: <span class="download-status status-${
                  download.status
                }">${download.status}</span></p>
                <div class="download-progress">
                    <div class="download-progress-bar" style="width: ${
                      download.progress
                    }%"></div>
                </div>
                <p>${download.progress.toFixed(1)}% - ${formatFileSize(
        download.downloaded_size || 0
      )} / ${formatFileSize(download.total_size || 0)}</p>
                ${
                  download.error_message
                    ? `<p style="color: red;">Error: ${escapeHtml(
                        download.error_message
                      )}</p>`
                    : ""
                }
            </div>
            ${
              download.status === "downloading" || download.status === "pending"
                ? `<button onclick="cancelDownload('${download.id}')">Cancel</button>`
                : ""
            }
        </div>
    `
    )
    .join("");
}

async function cancelDownload(downloadId) {
  try {
    const response = await fetch(`/api/downloads/${downloadId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      showToast("Download cancelled", "warning");
      loadDownloadQueue();
    } else {
      throw new Error("Failed to cancel download");
    }
  } catch (error) {
    console.error("Cancel download error:", error);
    showToast("Failed to cancel download", "error");
  }
}

function displayDownloadedModels() {
  const container = document.getElementById("downloadedModels");

  if (downloadedModels.length === 0) {
    container.innerHTML = "<p>No downloaded models</p>";
    return;
  }

  // Sort by timestamp (newest first)
  const sortedModels = [...downloadedModels].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  container.innerHTML = sortedModels
    .map(
      (model) => `
        <div class="downloaded-model">
            <h4>${escapeHtml(model.filename)}</h4>
            <p><strong>Model ID:</strong> ${model.id}</p>
            <p><strong>Downloaded:</strong> ${new Date(
              model.timestamp
            ).toLocaleDateString()}</p>
            <button onclick="redownloadModel(${model.id}, ${model.versionId}, ${
        model.fileId
      }, '${escapeHtml(model.filename)}')">
                Re-download
            </button>
        </div>
    `
    )
    .join("");
}

function redownloadModel(modelId, versionId, fileId, filename) {
  downloadModel(modelId, versionId, fileId, filename);
}

function loadDownloadedModels() {
  displayDownloadedModels();
}

function saveNsfwPreference() {
  const nsfwCheckbox = document.getElementById("nsfwFilter");
  localStorage.setItem(
    "civitai_nsfw_preference",
    JSON.stringify(nsfwCheckbox.checked)
  );
}

// Configuration Export/Import
function exportConfiguration() {
  const nsfwCheckbox = document.getElementById("nsfwFilter");
  const config = {
    api_token: apiToken,
    downloaded_models: downloadedModels,
    nsfw_preference: nsfwCheckbox.checked,
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `civitai_config_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
  showToast("Configuration exported successfully", "success");
}

function importConfiguration(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const config = JSON.parse(e.target.result);

      if (config.api_token) {
        apiToken = config.api_token;
        document.getElementById("apiToken").value = apiToken;
        localStorage.setItem("civitai_api_token", apiToken);
      }

      if (config.downloaded_models) {
        downloadedModels = config.downloaded_models;
        localStorage.setItem(
          "civitai_downloaded_models",
          JSON.stringify(downloadedModels)
        );
        displayDownloadedModels();
      }

      if (config.nsfw_preference !== undefined) {
        document.getElementById("nsfwFilter").checked = config.nsfw_preference;
        localStorage.setItem(
          "civitai_nsfw_preference",
          JSON.stringify(config.nsfw_preference)
        );
      }

      showToast("Configuration imported successfully", "success");
    } catch (error) {
      console.error("Import error:", error);
      showToast("Failed to import configuration", "error");
    }
  };

  reader.readAsText(file);
  event.target.value = ""; // Reset file input
}

// Utility Functions
function startDownloadPolling() {
  // Poll download queue every 2 seconds
  pollInterval = setInterval(loadDownloadQueue, 2000);
}

function stopDownloadPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function showLoading(containerId) {
  document.getElementById(containerId).innerHTML = "<p>Loading...</p>";
}

function closeModal() {
  document.getElementById("modelModal").style.display = "none";
}

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function sanitizeHtml(html) {
  if (!html) return "";

  // Create a temporary DOM element to parse the HTML
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // Define allowed tags and their allowed attributes
  const allowedTags = {
    p: [],
    br: [],
    strong: [],
    b: [],
    em: [],
    i: [],
    u: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    ul: [],
    ol: [],
    li: [],
    blockquote: [],
    code: [],
    pre: [],
    span: ["style"],
    div: ["style"],
    a: ["href", "target"],
    img: ["src", "alt", "width", "height"],
  };

  // Recursively sanitize elements
  function sanitizeElement(element) {
    const tagName = element.tagName.toLowerCase();

    // If tag is not allowed, replace with its text content
    if (!allowedTags.hasOwnProperty(tagName)) {
      return document.createTextNode(element.textContent || "");
    }

    // Create a new clean element
    const cleanElement = document.createElement(tagName);

    // Copy allowed attributes
    const allowedAttrs = allowedTags[tagName];
    for (let attr of element.attributes) {
      if (allowedAttrs.includes(attr.name.toLowerCase())) {
        // Additional validation for specific attributes
        if (attr.name.toLowerCase() === "href") {
          // Only allow http/https links
          if (attr.value.match(/^https?:\/\//)) {
            cleanElement.setAttribute(attr.name, attr.value);
          }
        } else if (attr.name.toLowerCase() === "src") {
          // Only allow http/https/data images
          if (attr.value.match(/^(https?:\/\/|data:image\/)/)) {
            cleanElement.setAttribute(attr.name, attr.value);
          }
        } else if (attr.name.toLowerCase() === "style") {
          // Basic style sanitization - only allow safe CSS properties
          const safeStyle = attr.value.replace(/[^a-zA-Z0-9\s:;.\-#%()]/g, "");
          if (safeStyle) {
            cleanElement.setAttribute(attr.name, safeStyle);
          }
        } else {
          cleanElement.setAttribute(attr.name, attr.value);
        }
      }
    }

    // Recursively process child nodes
    for (let child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        cleanElement.appendChild(document.createTextNode(child.textContent));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const sanitizedChild = sanitizeElement(child);
        cleanElement.appendChild(sanitizedChild);
      }
    }

    return cleanElement;
  }

  // Process all child elements
  const result = document.createElement("div");
  for (let child of temp.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      result.appendChild(document.createTextNode(child.textContent));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const sanitizedChild = sanitizeElement(child);
      result.appendChild(sanitizedChild);
    }
  }

  return result.innerHTML;
}

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
}

// Modal closing functionality
function closeModelModal() {
  const modal = document.getElementById("modelModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Set up modal event listeners when page loads
function setupModalEventListeners() {
  const modal = document.getElementById("modelModal");
  const closeBtn = modal.querySelector(".close");

  // Close button click
  if (closeBtn) {
    closeBtn.onclick = function () {
      closeModelModal();
    };
  }

  // Click outside modal content
  modal.onclick = function (event) {
    if (event.target === modal) {
      closeModelModal();
    }
  };

  // Escape key to close modal
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.style.display === "block") {
      closeModelModal();
    }
  });
}

// Clean up when page is unloaded
window.addEventListener("beforeunload", function () {
  stopDownloadPolling();
});

// Initialize modal event listeners when page loads
window.addEventListener("DOMContentLoaded", function () {
  setupModalEventListeners();
});
