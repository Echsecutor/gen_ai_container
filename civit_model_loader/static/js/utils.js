/**
 * Utility functions for the Civitai Model Loader application
 */

/**
 * Escapes HTML characters to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} - The escaped text
 */
export function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Escapes a JavaScript value for safe use in HTML onclick attributes
 * @param {any} value - The value to escape (will be JSON.stringified)
 * @returns {string} - The escaped value ready for use in HTML attributes
 */
export function escapeForOnclick(value) {
  if (value === null || value === undefined) return "null";

  try {
    // Convert to JSON string first
    const jsonString = JSON.stringify(value);

    // Escape for use in HTML attributes
    return jsonString
      .replace(/\\/g, "\\\\") // Escape backslashes
      .replace(/'/g, "\\'") // Escape single quotes
      .replace(/"/g, "&quot;") // Escape double quotes for HTML
      .replace(/\n/g, "\\n") // Escape newlines
      .replace(/\r/g, "\\r") // Escape carriage returns
      .replace(/\t/g, "\\t"); // Escape tabs
  } catch (error) {
    console.warn("Failed to escape value for onclick:", error);
    return "null";
  }
}

/**
 * Sanitizes HTML content using DOMPurify, allowing only safe tags and attributes
 * @param {string} html - The HTML to sanitize
 * @returns {string} - The sanitized HTML
 */
export function sanitizeHtml(html) {
  if (!html) return "";

  // Check if DOMPurify is available
  if (typeof DOMPurify === "undefined") {
    console.warn(
      "DOMPurify not available, falling back to basic text extraction"
    );
    // Fallback: return only text content if DOMPurify isn't loaded
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return escapeHtml(temp.textContent || temp.innerText || "");
  }

  // DOMPurify configuration for Civitai content
  const config = {
    // Allow these HTML tags
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "span",
      "div",
      "a",
      "img",
    ],
    // Allow these attributes
    ALLOWED_ATTR: [
      "href",
      "target",
      "src",
      "alt",
      "width",
      "height",
      "style",
      "class",
      "id",
    ],
    // Allow only safe URLs for links and images
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // Don't allow any SVG content
    USE_PROFILES: { html: true },
    // Forbid tags that could be used for XSS
    FORBID_TAGS: [
      "script",
      "object",
      "embed",
      "form",
      "input",
      "textarea",
      "button",
    ],
    // Forbid dangerous attributes
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
    ],
    // Keep whitespace and line breaks
    KEEP_CONTENT: true,
    // Sanitize style attributes
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // Remove any data-* attributes that could be used for DOM clobbering
    ALLOW_DATA_ATTR: false,
  };

  try {
    return DOMPurify.sanitize(html, config);
  } catch (error) {
    console.error("DOMPurify sanitization failed:", error);
    // Fallback to basic text extraction on error
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return escapeHtml(temp.textContent || temp.innerText || "");
  }
}

/**
 * Formats file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
export function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
}

/**
 * Truncates text description intelligently, preserving HTML formatting
 * @param {string} description - The description to truncate
 * @param {number} maxLength - Maximum length for truncation
 * @returns {string} - Truncated and sanitized description
 */
export function truncateDescription(description, maxLength = 150) {
  if (!description) return "No description available";

  const textOnly = description.replace(/<[^>]*>/g, ""); // Strip HTML for length check
  const truncated =
    textOnly.length > maxLength
      ? textOnly.substring(0, maxLength) + "..."
      : description;

  return sanitizeHtml(truncated);
}

/**
 * Creates a debounced version of a function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The delay in milliseconds
 * @returns {Function} - The debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Copies text to clipboard and shows user feedback
 * @param {string} text - Text to copy to clipboard
 * @param {string} successMessage - Message to show on success
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function copyToClipboard(
  text,
  successMessage = "Copied to clipboard!"
) {
  try {
    // Use the modern Clipboard API if available
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    // Show success feedback
    const { showToast } = await import("./ui.js");
    showToast(successMessage, "success");
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    const { showToast } = await import("./ui.js");
    showToast("Failed to copy to clipboard", "error");
    return false;
  }
}

/**
 * Safe async error handler wrapper
 * @param {Function} asyncFn - The async function to wrap
 * @param {string} errorMessage - Default error message
 * @returns {Function} - Wrapped function with error handling
 */
export function withErrorHandler(asyncFn, errorMessage = "An error occurred") {
  return async function (...args) {
    try {
      return await asyncFn.apply(this, args);
    } catch (error) {
      console.error(errorMessage, error);
      // Import UI module dynamically to avoid circular deps
      const { showToast } = await import("./ui.js");
      showToast(`${errorMessage}: ${error.message}`, "error");
      throw error;
    }
  };
}

/**
 * Deep clones an object
 * @param {Object} obj - Object to clone
 * @returns {Object} - Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (typeof obj === "object") {
    const clonedObj = {};
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * Validates if a string is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a delay for async operations
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after delay
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
