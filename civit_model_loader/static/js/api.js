/**
 * API client for communication with the Civitai Model Loader backend
 */

import { getApiToken } from "./state.js";
import { withErrorHandler } from "./utils.js";

/**
 * API client class for handling all backend communication
 */
class ApiClient {
  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  /**
   * Makes a HTTP request with error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<any>} - Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    // Handle different response types
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      return await response.text();
    }
  }

  /**
   * Makes a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} headers - Additional headers
   * @returns {Promise<any>} - Response data
   */
  async get(endpoint, headers = {}) {
    return this.request(endpoint, {
      method: "GET",
      headers,
    });
  }

  /**
   * Makes a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @param {Object} headers - Additional headers
   * @returns {Promise<any>} - Response data
   */
  async post(endpoint, data = null, headers = {}) {
    const options = {
      method: "POST",
      headers,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    return this.request(endpoint, options);
  }

  /**
   * Makes a DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} headers - Additional headers
   * @returns {Promise<any>} - Response data
   */
  async delete(endpoint, headers = {}) {
    return this.request(endpoint, {
      method: "DELETE",
      headers,
    });
  }
}

// Create API client instance
const apiClient = new ApiClient();

/**
 * Search models on Civitai
 * @param {Object} searchRequest - Search parameters
 * @returns {Promise<Object>} - Search results
 */
export const searchModels = withErrorHandler(async (searchRequest) => {
  const requestWithToken = {
    ...searchRequest,
    api_token: getApiToken() || null,
  };

  return await apiClient.post("/api/search", requestWithToken);
}, "Search failed");

/**
 * Get model details by ID
 * @param {number} modelId - Model ID
 * @returns {Promise<Object>} - Model details
 */
export const getModelDetails = withErrorHandler(async (modelId) => {
  const apiToken = getApiToken();
  const url = apiToken
    ? `/api/models/${modelId}?api_token=${encodeURIComponent(apiToken)}`
    : `/api/models/${modelId}`;
  return await apiClient.get(url);
}, "Failed to fetch model details");

/**
 * Get model version details by ID
 * @param {number} versionId - Version ID
 * @returns {Promise<Object>} - Version details
 */
export const getVersionDetails = withErrorHandler(async (versionId) => {
  return await apiClient.get(`/api/model-versions/${versionId}`);
}, "Failed to fetch version details");

/**
 * Start downloading a model
 * @param {Object} downloadRequest - Download parameters
 * @returns {Promise<Object>} - Download response
 */
export const startDownload = withErrorHandler(async (downloadRequest) => {
  const requestWithToken = {
    ...downloadRequest,
    api_token: getApiToken(),
  };

  if (!requestWithToken.api_token) {
    throw new Error("API token is required for downloads");
  }

  return await apiClient.post("/api/download", requestWithToken);
}, "Download failed");

/**
 * Get all download statuses
 * @returns {Promise<Object>} - Download statuses
 */
export const getDownloadStatuses = withErrorHandler(async () => {
  return await apiClient.get("/api/downloads");
}, "Failed to fetch download statuses");

/**
 * Get specific download status
 * @param {string} downloadId - Download ID
 * @returns {Promise<Object>} - Download status
 */
export const getDownloadStatus = withErrorHandler(async (downloadId) => {
  return await apiClient.get(`/api/downloads/${downloadId}`);
}, "Failed to fetch download status");

/**
 * Cancel a download
 * @param {string} downloadId - Download ID
 * @returns {Promise<any>} - Cancellation response
 */
export const cancelDownload = withErrorHandler(async (downloadId) => {
  return await apiClient.delete(`/api/downloads/${downloadId}`);
}, "Failed to cancel download");

/**
 * Test API token validity
 * @param {string} token - Optional token to test (uses stored token if not provided)
 * @returns {Promise<boolean>} - True if token is valid
 */
export const testApiToken = withErrorHandler(async (token = null) => {
  const testToken = token || getApiToken();

  if (!testToken) {
    throw new Error("Please enter an API token to test");
  }

  // Test with a simple search
  const response = await apiClient.post("/api/search", {
    query: "test",
    limit: 1,
    api_token: testToken,
  });

  return !!response; // Return true if request succeeds
}, "API token test failed");

/**
 * Health check endpoint
 * @returns {Promise<Object>} - Health status
 */
export const healthCheck = withErrorHandler(async () => {
  return await apiClient.get("/api/health");
}, "Health check failed");

/**
 * Checks if downloaded model files actually exist on disk
 * @param {Array} files - Array of file objects with model_id, version_id, file_id, filename
 * @returns {Promise<Object>} - Response with file existence status
 */
export const checkFileExistence = withErrorHandler(async (files) => {
  console.log("API: Sending file existence check request:", { files });
  return await apiClient.post("/api/check-files", {
    files: files,
  });
}, "File existence check failed");

/**
 * Download converted images as ZIP file (legacy synchronous method)
 * @param {string} directory - Directory path to scan for PNG images
 * @returns {Promise<Blob>} - ZIP file blob
 */
export const downloadConvertedImages = withErrorHandler(async (directory) => {
  const url = `/api/download-converted-images?directory=${encodeURIComponent(
    directory
  )}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/zip",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Download failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return await response.blob();
}, "Image conversion download failed");

/**
 * Start image conversion asynchronously
 * @param {string} directory - Directory path to scan for PNG images
 * @returns {Promise<Object>} - Conversion response with conversion_id
 */
export const startImageConversion = withErrorHandler(async (directory) => {
  return await apiClient.post("/api/start-conversion", {
    directory: directory,
  });
}, "Failed to start image conversion");

/**
 * Get conversion status
 * @param {string} conversionId - Conversion ID
 * @returns {Promise<Object>} - Conversion status
 */
export const getConversionStatus = withErrorHandler(async (conversionId) => {
  return await apiClient.get(`/api/conversions/${conversionId}`);
}, "Failed to get conversion status");

/**
 * Get all conversion statuses
 * @returns {Promise<Object>} - All conversion statuses
 */
export const getAllConversions = withErrorHandler(async () => {
  return await apiClient.get("/api/conversions");
}, "Failed to get conversions");

/**
 * Cancel a conversion
 * @param {string} conversionId - Conversion ID to cancel
 * @returns {Promise<Object>} - Cancel response
 */
export const cancelConversion = withErrorHandler(async (conversionId) => {
  return await apiClient.delete(`/api/conversions/${conversionId}`);
}, "Failed to cancel conversion");

/**
 * Download completed conversion result
 * @param {string} conversionId - Conversion ID
 * @returns {Promise<Blob>} - ZIP file blob
 */
export const downloadConversionResult = withErrorHandler(
  async (conversionId) => {
    const url = `/api/download-conversion/${conversionId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/zip",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Download failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return await response.blob();
  },
  "Failed to download conversion result"
);

/**
 * List files in a directory with thumbnails for images
 * @param {string} folder - Directory path to list files from
 * @returns {Promise<Object>} - Response with files array containing thumbnails
 */
export const listFiles = withErrorHandler(async (folder) => {
  const url = `/api/list-files?folder=${encodeURIComponent(folder)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `List files failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return await response.json();
}, "Failed to list files");

/**
 * Batch API operations utility
 */
export class BatchApiClient {
  constructor() {
    this.requests = [];
  }

  /**
   * Adds a request to the batch
   * @param {string} name - Request name for identification
   * @param {Function} apiCall - API call function
   * @param {Array} args - Arguments for the API call
   */
  add(name, apiCall, ...args) {
    this.requests.push({ name, apiCall, args });
  }

  /**
   * Executes all batched requests
   * @returns {Promise<Object>} - Results mapped by request name
   */
  async execute() {
    const results = {};
    const promises = this.requests.map(async ({ name, apiCall, args }) => {
      try {
        const result = await apiCall(...args);
        results[name] = { success: true, data: result };
      } catch (error) {
        results[name] = { success: false, error: error.message };
      }
    });

    await Promise.all(promises);
    this.requests = []; // Clear batch after execution
    return results;
  }

  /**
   * Clears all pending requests
   */
  clear() {
    this.requests = [];
  }
}

/**
 * Creates a new batch API client
 * @returns {BatchApiClient} - New batch client instance
 */
export function createBatchClient() {
  return new BatchApiClient();
}

/**
 * Retry wrapper for API calls with exponential backoff
 * @param {Function} apiCall - The API call to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Function} - Wrapped function with retry logic
 */
export function withRetry(apiCall, maxRetries = 3, baseDelay = 1000) {
  return async function (...args) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall(...args);
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  };
}

/**
 * Creates API calls with automatic retry
 */
export const robustApiCalls = {
  searchModels: withRetry(searchModels),
  getModelDetails: withRetry(getModelDetails),
  getDownloadStatuses: withRetry(getDownloadStatuses),
  testApiToken: withRetry(testApiToken),
  checkFileExistence: withRetry(checkFileExistence),
};
