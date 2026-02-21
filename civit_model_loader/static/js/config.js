/**
 * Configuration management for the Civitai Model Loader
 * Handles import/export of settings and preferences
 */

import {
  exportConfiguration,
  importConfiguration,
  markClean,
} from "./state.js";
import { showToast } from "./ui.js";

/**
 * Configuration manager class
 */
class ConfigManager {
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Sets up event listeners for configuration functionality
   */
  setupEventListeners() {
    const exportBtn = document.getElementById("exportConfig");
    const importBtn = document.getElementById("importConfigBtn");
    const importInput = document.getElementById("importConfig");

    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportConfig());
    }

    if (importBtn) {
      importBtn.addEventListener("click", () => {
        if (importInput) importInput.click();
      });
    }

    if (importInput) {
      importInput.addEventListener("change", (event) =>
        this.importConfig(event)
      );
    }
  }

  /**
   * Exports current configuration as JSON file
   */
  exportConfig() {
    try {
      const config = exportConfiguration();
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `civitai_config_${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
      markClean();
      showToast("Configuration exported successfully", "success");
    } catch (error) {
      console.error("Export error:", error);
      showToast("Failed to export configuration", "error");
    }
  }

  /**
   * Imports configuration from uploaded JSON file
   * @param {Event} event - File input change event
   */
  importConfig(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        this.validateConfig(config);
        importConfiguration(config);
        showToast("Configuration imported successfully", "success");

        // Refresh UI to reflect imported settings
        this.refreshUIAfterImport();
      } catch (error) {
        console.error("Import error:", error);
        showToast("Failed to import configuration: " + error.message, "error");
      }
    };

    reader.readAsText(file);
    event.target.value = ""; // Reset file input
  }

  /**
   * Validates configuration object structure
   * @param {Object} config - Configuration to validate
   * @throws {Error} - If configuration is invalid
   */
  validateConfig(config) {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration format");
    }

    // Validate API token if present
    if (
      config.api_token !== undefined &&
      typeof config.api_token !== "string"
    ) {
      throw new Error("Invalid API token format");
    }

    // Validate downloaded models if present
    if (config.downloaded_models !== undefined) {
      if (!Array.isArray(config.downloaded_models)) {
        throw new Error("Downloaded models must be an array");
      }

      config.downloaded_models.forEach((model, index) => {
        if (!model.id || !model.versionId || !model.fileId || !model.filename) {
          throw new Error(`Invalid model data at index ${index}`);
        }
      });
    }

    // Validate NSFW preference if present
    if (
      config.nsfw_preference !== undefined &&
      typeof config.nsfw_preference !== "boolean"
    ) {
      throw new Error("NSFW preference must be a boolean");
    }
  }

  /**
   * Refreshes UI elements after configuration import
   */
  async refreshUIAfterImport() {
    try {
      // Refresh downloaded models display
      const { downloadManager } = await import("./download.js");
      await downloadManager.displayDownloadedModels();

      // Refresh token UI state
      const { tokenUI } = await import("./ui.js");
      const { getApiToken } = await import("./state.js");

      if (getApiToken()) {
        tokenUI.showTokenLoaded();
      } else {
        tokenUI.showTokenInput();
      }
    } catch (error) {
      console.error("Error refreshing UI after import:", error);
    }
  }

  /**
   * Creates a backup of current configuration
   * @returns {Object} - Current configuration backup
   */
  createBackup() {
    return exportConfiguration();
  }

  /**
   * Restores configuration from backup
   * @param {Object} backup - Configuration backup to restore
   */
  restoreFromBackup(backup) {
    try {
      this.validateConfig(backup);
      importConfiguration(backup);
      this.refreshUIAfterImport();
      showToast("Configuration restored from backup", "success");
    } catch (error) {
      console.error("Restore error:", error);
      showToast("Failed to restore configuration: " + error.message, "error");
    }
  }

  /**
   * Resets configuration to defaults
   */
  async resetToDefaults() {
    if (
      confirm(
        "Are you sure you want to reset all settings to defaults? This cannot be undone."
      )
    ) {
      try {
        const { appState } = await import("./state.js");
        appState.clearAllData();
        this.refreshUIAfterImport();
      } catch (error) {
        console.error("Reset error:", error);
        showToast("Failed to reset configuration", "error");
      }
    }
  }

  /**
   * Gets configuration summary for display
   * @returns {Object} - Configuration summary
   */
  getConfigSummary() {
    const config = exportConfiguration();
    return {
      hasApiToken: !!config.api_token,
      downloadedModelsCount: config.downloaded_models?.length || 0,
      nsfwEnabled: config.nsfw_preference || false,
      configSize: JSON.stringify(config).length,
    };
  }

  /**
   * Validates imported file before processing
   * @param {File} file - File to validate
   * @returns {boolean} - True if file is valid
   */
  validateImportFile(file) {
    // Check file type
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      showToast("Please select a JSON file", "error");
      return false;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showToast("File is too large. Maximum size is 10MB", "error");
      return false;
    }

    return true;
  }

  /**
   * Creates a configuration template for users
   * @returns {Object} - Configuration template
   */
  createTemplate() {
    return {
      api_token: "",
      downloaded_models: [],
      nsfw_preference: false,
      _template: true,
      _version: "1.0",
      _description: "Civitai Model Loader configuration template",
    };
  }

  /**
   * Exports configuration template
   */
  exportTemplate() {
    try {
      const template = this.createTemplate();
      const blob = new Blob([JSON.stringify(template, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "civitai_config_template.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
      showToast("Configuration template exported", "success");
    } catch (error) {
      console.error("Template export error:", error);
      showToast("Failed to export template", "error");
    }
  }

  /**
   * Migrates old configuration format to new format
   * @param {Object} oldConfig - Old configuration format
   * @returns {Object} - Migrated configuration
   */
  migrateConfig(oldConfig) {
    // Handle any legacy configuration formats here
    const migratedConfig = { ...oldConfig };

    // Example: Convert old field names to new ones
    if (oldConfig.civitai_token) {
      migratedConfig.api_token = oldConfig.civitai_token;
      delete migratedConfig.civitai_token;
    }

    return migratedConfig;
  }
}

// Create and export config manager instance
export const configManager = new ConfigManager();

// Export individual functions for backward compatibility
export function exportConfig() {
  return configManager.exportConfig();
}

export function importConfig(event) {
  return configManager.importConfig(event);
}

export async function resetToDefaults() {
  return await configManager.resetToDefaults();
}

export function getConfigSummary() {
  return configManager.getConfigSummary();
}
