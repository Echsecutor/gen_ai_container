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
 * Sanitizes HTML content, allowing only safe tags and attributes
 * @param {string} html - The HTML to sanitize
 * @returns {string} - The sanitized HTML
 */
export function sanitizeHtml(html) {
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
