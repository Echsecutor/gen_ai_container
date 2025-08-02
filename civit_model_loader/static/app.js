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
async function performSearch() {
  const query = document.getElementById("searchQuery").value.trim();
  const modelType = document.getElementById("modelType").value;
  const sortBy = document.getElementById("sortBy").value;
  const includeNsfw = document.getElementById("nsfwFilter").checked;

  const searchRequest = {
    query: query || null,
    types: modelType ? [modelType] : null,
    sort: sortBy,
    nsfw: includeNsfw || null,
    limit: 20,
    page: currentPage,
  };

  currentSearch = searchRequest;

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
    displaySearchResults(results);
    setupPagination(results.metadata);
  } catch (error) {
    console.error("Search error:", error);
    showToast("Search failed: " + error.message, "error");
    document.getElementById("searchResults").innerHTML =
      "<p>Search failed. Please try again.</p>";
  }
}

function displaySearchResults(results) {
  const container = document.getElementById("searchResults");

  if (!results.items || results.items.length === 0) {
    container.innerHTML =
      "<p>No models found. Try adjusting your search criteria.</p>";
    return;
  }

  container.innerHTML = results.items
    .map(
      (model) => `
        <div class="model-card" onclick="showModelDetails(${model.id})">
            <h3>${escapeHtml(model.name)}</h3>
            <p>${escapeHtml(
              model.description || "No description available"
            ).substring(0, 150)}${
        (model.description || "").length > 150 ? "..." : ""
      }</p>
            <div class="model-meta">
                <span class="model-type">${escapeHtml(model.type)}</span>
                <span>by ${escapeHtml(model.creator.username)}</span>
            </div>
        </div>
    `
    )
    .join("");
}

function setupPagination(metadata) {
  const container = document.getElementById("pagination");
  const totalPages = metadata.totalPages;
  const currentPageNum = metadata.currentPage;

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

function changePage(page) {
  currentPage = page;
  if (currentSearch) {
    performSearch();
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

  const versionsHtml = model.modelVersions
    .map(
      (version) => `
        <div class="version-section">
            <h4>${escapeHtml(version.name)}</h4>
            <p>${escapeHtml(version.description || "No description")}</p>
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
        <p><strong>Creator:</strong> ${escapeHtml(model.creator.username)}</p>
        <p><strong>Description:</strong> ${escapeHtml(
          model.description || "No description available"
        )}</p>
        <div class="model-versions">
            <h3>Available Versions</h3>
            ${versionsHtml}
        </div>
    `;
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

// Configuration Export/Import
function exportConfiguration() {
  const config = {
    api_token: apiToken,
    downloaded_models: downloadedModels,
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

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
}

// Clean up when page is unloaded
window.addEventListener("beforeunload", function () {
  stopDownloadPolling();
});
