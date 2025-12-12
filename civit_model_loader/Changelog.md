# Changelog

## WIP

- Added auto-sort functionality for image conversion with UI toggle
  - Moved `sort_generated_pics` script into civit_model_loader for availability in Docker images
  - Added `auto_sort` parameter to `ConversionRequest` model (default: true)
  - Integrated sorting script execution in `ConversionManager` before ZIP creation
  - Auto-sort uses balanced binary tree algorithm to organize images by prompt keywords
  - Added checkbox UI control in conversion section (default enabled)
  - Updated frontend JavaScript to send auto_sort parameter with conversion requests
  - ZIP files now preserve sorted folder structure when auto-sort is enabled
  - Sort failures are logged but don't prevent conversion from completing

- Fixed Pydantic namespace conflict warning by renaming `model_id` field to `civitai_model_id`

  - Updated all Pydantic models (`DownloadRequest`, `DownloadInfo`, `DownloadedModelFile`, `FileExistenceStatus`) to use `civitai_model_id` instead of `model_id`
  - Updated backend Python code in `main.py`, `download_manager.py`, and `civitai_client.py` to use new field name
  - Updated frontend JavaScript code in `download.js` and `api.js` to use new field name
  - Resolved UserWarning about field "model_id" having conflict with protected namespace "model_"
  - All API endpoints and data structures now use consistent `civitai_model_id` naming

- Fixed converter permission errors in Docker containers

  - Updated `save_model_hash()` function to accept `cache_dir` parameter and use proper cache directory path
  - Updated `calculate_shorthash()` function to pass cache directory to hash saving operations
  - Updated `convert_image_metadata()` and `convert_invokeai_to_a1111()` functions to properly handle cache directory permissions
  - Added graceful fallback when hash cache cannot be written due to permission restrictions
  - Resolved "Permission denied: './hash_cache.json'" errors during image conversion in Docker containers
  - Conversion now works correctly with writable cache directories (defaults to `/workspace` in containers)

- Fixed conversion download issue where completed conversions wouldn't trigger browser download

  - Added comprehensive debugging logs to conversion completion and download trigger functions
  - Enhanced error handling in `downloadCompletedConversion()` with detailed error reporting
  - Added fallback download mechanism using `window.open()` if programmatic click fails
  - Improved download cleanup with delayed cleanup to ensure download starts properly
  - Added visual feedback with toast notifications during download process
  - Fixed issue where users would see polling to `/api/downloads` (model downloads) instead of conversion downloads
  - Enhanced status display to show download errors in the conversion status area

- Fixed gallery lightbox to display full-size images instead of thumbnails

  - Added new `/api/serve-image` endpoint to serve full-size images from the server filesystem
  - Enhanced `FileInfo` model with `image_url` field for full-size image URLs
  - Updated gallery lightbox to use full-size image URLs when available
  - Added security checks to prevent path traversal attacks and ensure only image files are served
  - Improved user experience with high-quality image viewing in the gallery

- Enhanced download API with improved asynchronous handling and progress tracking

  - Improved timeout handling for large file downloads with increased socket read timeouts (60s)
  - Enhanced progress tracking with download speed, ETA calculations, and timing information
  - Added comprehensive error handling with automatic cleanup of incomplete downloads
  - Added detailed logging for download progress with status updates every 10MB
  - Enhanced CivitaiClient with larger chunk sizes (32KB) for better download performance
  - Updated DownloadInfo model with additional fields: start_time, end_time, download_speed, eta_seconds
  - Improved download manager with better progress callbacks and file verification
  - Added automatic cleanup of partial files on download failure or cancellation
  - Enhanced frontend download queue UI with speed display, ETA, and timing information
  - Added animated progress bars with shimmer effects for active downloads
  - Improved CSS styling for download progress with visual indicators and status colors

- Added asynchronous image conversion API with real-time progress tracking

  - Created new ConversionManager class for handling async image conversion operations
  - Added new API endpoints: `/api/start-conversion`, `/api/conversions/{id}`, `/api/download-conversion/{id}`
  - Added ConversionInfo model with detailed progress tracking (processed_files, current_file, progress percentage)
  - Implemented real-time progress updates with polling-based status checking in frontend
  - Enhanced frontend with conversion progress display showing file counts, current file, and progress bar
  - Added automatic download trigger when conversion completes successfully
  - Improved error handling and cleanup for conversion operations
  - Added CSS styling for conversion progress with animated progress bars
  - Maintained backward compatibility with existing synchronous conversion endpoint
  - Added automatic cleanup of old conversion files to prevent storage bloat

- Unified search interface with both text and model ID search capabilities

  - Merged separate search sections into single interface with radio button mode toggle
  - Integrated model ID search functionality directly into main search.js module
  - Eliminated code duplication between query search and model ID search
  - Shared results display container for both search types
  - Added search mode toggle with dynamic UI switching (show/hide filters for different modes)
  - Enhanced search.js with unified SearchManager handling both search modes
  - Removed separate model-id-search.js module to reduce codebase complexity
  - Added detailed model cards for model ID results with version info and statistics
  - Improved CSS with unified styling and smooth transitions between search modes
  - Enhanced error handling and user feedback across both search types

- Refactored test suite to use pytest framework with improved organization and maintainability

  - Migrated all tests from custom test runners to pytest conventions with proper test discovery
  - Added pytest configuration in `pyproject.toml` with async support and test markers
  - Created `conftest.py` with shared fixtures for temporary directories, test images, and mock data
  - Refactored `test_thumbnail.py` with pytest classes, parametrized tests, and proper skip decorators
  - Refactored `test_list_files_endpoint.py` with async test support and integration test markers
  - Refactored `test_converter.py` with comprehensive error handling and conditional test execution
  - Refactored `test_api.py` and `test_client.py` with proper API integration test patterns
  - Added intelligent test skipping when optional dependencies (FastAPI, thumbnail module) are unavailable
  - Removed legacy `test_all.py` runner in favor of pytest's automatic test discovery
  - Updated test documentation with pytest commands, markers, and development workflow
  - Added requirements for `pytest==7.4.3` and `pytest-asyncio==0.21.1` for async test support
  - Organized tests into logical classes and added comprehensive docstrings
  - Added performance markers for slow tests and integration markers for API tests
  - Deduplicated test utilities and improved test isolation with proper fixture cleanup

- Added thumbnail gallery to Image Conversion section for browsing images before conversion

  - Integrated with existing `/api/list-files` endpoint to display thumbnails of images in the conversion directory
  - New thumbnail gallery shows grid view of all images in the specified directory with 150x150px thumbnails
  - Click-to-view lightbox modal with navigation between images using arrow keys or navigation buttons
  - Auto-refresh gallery when directory path changes with debounced input handling
  - Added "Refresh Gallery" button for manual refresh of thumbnail display
  - Responsive grid layout adapts to different screen sizes (200px thumbnails on desktop, 150px on mobile)
  - Gallery status indicators show loading states, error messages, and image counts
  - Keyboard navigation support: Escape to close, Left/Right arrows to navigate between images
  - Smart image handling with fallback for unavailable thumbnails and error states
  - Seamless integration with existing image conversion workflow and UI styling
  - Mobile-friendly lightbox with touch-friendly navigation controls

- Added new `/api/list-files` endpoint for server-side file browsing with image thumbnails

  - New endpoint accepts `folder` query parameter (default: `/workspace/output/images`) to list files in any server-side directory
  - Returns JSON array with file information including filename, full path, and base64-encoded thumbnails for image files
  - Created `thumbnail.py` module with intelligent in-memory caching system for thumbnail generation
  - Thumbnail cache features LRU eviction, memory usage limits (50MB default), and configurable cache size (100 items default)
  - Supports all common image formats: JPG, PNG, BMP, TIFF, WebP, GIF with automatic format detection
  - Thumbnails are 150x150 pixels with aspect ratio preservation and optimized JPEG encoding
  - Cache invalidation based on file modification time ensures thumbnails stay current
  - Added new `FileInfo` and `ListFilesResponse` Pydantic models for structured API responses
  - Comprehensive error handling for missing directories, permission issues, and thumbnail generation failures
  - Files sorted alphabetically for consistent ordering across requests
  - Added comprehensive test suite with 100+ individual test cases covering all functionality
  - Created `test_thumbnail.py` for testing thumbnail generation, caching, and error handling
  - Created `test_list_files_endpoint.py` for testing endpoint functionality and data models
  - Created `test_all.py` comprehensive test runner for complete validation
  - All tests include edge case handling, performance validation, and integration testing

- Fixed autopep8 f-string breaking issues that caused container startup failures

  - Enhanced autopep8 configuration to prevent breaking f-string literals across lines
  - Added E704, E127, E128 to ignore list to prevent string literal formatting issues
  - Fixed broken f-strings in `/api/list-files` endpoint that caused SyntaxError
  - Added `hang_closing = false` setting to prevent improper line breaking
  - Updated both `.autopep8` and `pyproject.toml` configurations for consistency
  - All Python files now pass syntax validation without formatter-induced errors
  - Created `scripts/fix_broken_fstrings.py` automated recovery tool for future incidents
  - Added comprehensive troubleshooting documentation and prevention strategies

- Fixed converter permission errors in cloud environments

  - Modified `converter.py` to use `/workspace` directory for config and cache files instead of current working directory
  - Added `cache_dir` parameter to all converter functions with automatic fallback to `/workspace` when available
  - Prevents "Permission denied" errors when running in containers where current directory is read-only
  - Updated `main.py` to explicitly pass `/workspace` as cache directory for image conversion endpoint
  - All converter functions now work correctly in Docker container environment

- Fixed test token button 500 error caused by event object being passed as API token

  - Fixed event handlers for both "Test Token" buttons to call `testApiToken()` without passing the DOM event object
  - Backend was receiving `{'isTrusted': True}` instead of token string, causing Pydantic validation error
  - Wrapped `testApiToken` calls in anonymous functions to prevent event object parameter passing

- Fixed syntax errors in Python files caused by unterminated string literals

  - Fixed broken f-string continuations in `main.py`, `converter.py`, and test files
  - All string literals now properly use line continuation with backslashes
  - Docker container now starts successfully without syntax errors

- Added frontend UI for image conversion feature

  - New "Convert Output Images" section with directory input field and download button
  - Default directory path set to `/workspace/output/images` matching backend endpoint
  - Added `downloadConvertedImages()` API client method for ZIP file downloads
  - Implemented download handler with automatic file naming using timestamps
  - Added loading states, success/error feedback, and toast notifications
  - Responsive CSS styling matching existing design patterns
  - Mobile-friendly layout with stacked form elements on small screens

- Added new API endpoint for downloading converted images as ZIP file

  - `GET /api/download-converted-images?directory=/path/to/images` endpoint scans directory for PNG files
  - Converts all InvokeAI generated images to Automatic1111 format using converter module
  - Returns ZIP file containing converted images with `_a1111.png` suffix
  - Includes conversion summary file if any errors occur during processing
  - Default directory is `/workspace/output/images` (configurable via query parameter)
  - Proper error handling for missing directories, no PNG files, and conversion failures
  - Temporary files are cleaned up automatically after download
  - Added Pillow dependency to requirements.txt for image processing

- Fixed syntax errors in converter.py caused by autopep8 formatter

  - Fixed broken f-string literals that were incorrectly split across multiple lines
  - Added .autopep8 and pyproject.toml configuration files to prevent future formatting issues
  - Configured linter to preserve string literal integrity while maintaining code quality

- Added standalone converter functions for InvokeAI to Automatic1111 metadata conversion

  - Extracted `convert_image_metadata()` function from main converter logic for programmatic use
  - Added `convert_invokeai_to_a1111()` simplified wrapper function that automatically loads configuration and hash cache
  - Both functions return `(success: bool, message: str)` tuple for proper error handling
  - Functions can be imported and used independently of the command-line tool
  - Added comprehensive test script `tests/test_converter.py` with validation against provided test images
  - Functions handle all metadata types: base parameters, model hashes, VAE, LoRA, and inpainting scenarios
  - Proper error handling for missing files, invalid metadata, and configuration issues
  - Refactored main() function to use extracted functions, eliminating code duplication
  - Original command-line functionality preserved while reducing maintenance overhead

- Fixed console errors and JavaScript syntax issues

  - Fixed DOM warning about password field not being in a form by wrapping API token input in a `<form>` element
  - Added favicon.svg to prevent 404 errors for missing favicon.ico
  - Fixed "Uncaught SyntaxError: Unexpected end of input" errors when downloading models with special characters in trigger words
  - Added `escapeForOnclick()` function to properly escape JavaScript values for use in HTML onclick attributes
  - Updated download and model display functions to use robust escaping for trigger words and other dynamic data

- Enhanced HTML sanitization security using DOMPurify

  - Replaced custom `sanitizeHtml()` function with DOMPurify-based implementation for industry-standard XSS protection
  - Added DOMPurify 3.0.7 CDN dependency for secure HTML content sanitization
  - Configured DOMPurify with strict security settings: limited allowed tags/attributes, URL validation, forbidden dangerous elements
  - Added fallback to plain text extraction if DOMPurify fails to load or encounters errors
  - Audited all content insertion points to ensure proper sanitization of web-fetched content from Civitai API
  - All model descriptions, version descriptions, and user-generated content now properly sanitized against XSS attacks

- Fixed duplicate event handlers causing import config dialog to open twice and export config to download twice

  - Removed duplicate event listener setup in `app.js` for configuration buttons
  - Configuration functionality is now handled exclusively by `ConfigManager` in `config.js`
  - Import config file dialog now opens only once when clicking the import button
  - Export config now downloads the file only once when clicking the export button
  - Added proper module import to ensure `ConfigManager` is initialized on page load

- Moved export/import config buttons to dedicated configuration section at top of page

  - Created new "Configuration" section above API Configuration section
  - Relocated export and import config buttons from Downloaded Models section to new top-level configuration area
  - Improved UI organization by grouping configuration controls together
  - Simplified Downloaded Models section to focus on model management with only refresh button

- Added trigger words (trainedWords) display and storage functionality

  - Updated Pydantic models to include `trainedWords` field in `CivitaiModelVersion`
  - Enhanced model details modal to display trigger words section with styled trigger word badges
  - Added version-specific trigger words display in each model version section
  - Modified download process to store trigger words in localStorage for downloaded models
  - Added trigger words display to downloaded models section
  - Enhanced CSS styling for trigger words with hover effects and responsive design
  - Trigger words are collected from all model versions and deduplicated for main display
  - Updated API token handling to ensure model details endpoint receives authentication for restricted content
  - **Added click-to-copy functionality for trigger words**: All trigger word bubbles are now clickable and copy the trigger word to clipboard with user feedback
    - Modern Clipboard API support with fallback for older browsers
    - Visual feedback with transform animations and shadow effects on hover/click
    - Toast notifications confirm successful copy with the copied trigger word
    - Works across all trigger word displays: search results, model details, and downloaded models

- Added model details modal functionality for downloaded models

  - Added click handlers to downloaded model cards to fetch and display full model details
  - Enhanced downloaded model cards with cursor pointer styling to indicate clickability
  - Updated backend model details endpoint to accept API token via query parameters or headers
  - Improved API client to pass API token when fetching model details
  - Added event propagation handling to prevent conflicts between card clicks and action buttons
  - Reuses existing model details modal system for consistent user experience

- Fixed 422 Unprocessable Entity error in all POST endpoints caused by browser CORS Content-Type downgrade

  - Root cause: Browser sends `Content-Type: text/plain;charset=UTF-8` instead of `application/json` to avoid CORS preflight
  - Solution: Applied CORS content-type handling to all POST endpoints: `/api/search`, `/api/download`, and `/api/check-files`
  - All endpoints now handle both `application/json` and `text/plain` content types
  - All frontend API calls work correctly without 422 errors when browser sends `Content-Type: text/plain;charset=UTF-8`
  - Added CORS middleware to FastAPI application for proper cross-origin request handling
  - Added consistent logging for all request types to help with debugging

- Fixed 422 Unprocessable Entity error in search endpoint when frontend sends `"types": null`

  - Updated `SearchRequest` model to handle `null` values for `types` field properly
  - Modified frontend to omit `types` field entirely when no model type is selected instead of sending `null`
  - Added `cleanSearchRequest()` method to remove `null` or empty `types` values from all search requests
  - Applied cleaning to initial searches, pagination, and cursor-based navigation
  - Added `extra = "ignore"` configuration to `SearchRequest` to handle extra fields gracefully
  - Added debugging logs to track search request processing

- Fixed JavaScript syntax error in `config.js` where `resetToDefaults()` method was using `await` without being declared as `async`

  - Added `async` keyword to `resetToDefaults()` method declaration
  - Updated exported `resetToDefaults()` function to be `async` and properly await the method call

- Fixed 422 Unprocessable Entity error when checking file existence after importing configuration

  - Added validation to filter out models with missing required fields before API call
  - Added graceful handling of empty files array in both frontend and backend
  - Added debugging logs to track file existence check requests
  - Backend now returns empty response instead of error for empty files array

- Added remove button functionality for downloaded models list
  - Added "Remove" button next to "Re-download" button in downloaded models
  - Implemented `removeDownloadedModel()` function with confirmation dialog
  - Added button styling with primary/danger variants
  - Responsive layout for mobile devices
  - Removes model from localStorage but doesn't delete actual file

## 2025-10-14 - Fix Image Conversion Download Polling Issue

### Fixed
- **Frontend: Image conversion download polling continues after completion**
  - Added `isDownloading` flag to prevent multiple simultaneous downloads
  - Modified polling logic to check `!isDownloading` before triggering download
  - Set `isDownloading = true` immediately when starting download to block subsequent attempts
  - Set `pollingInterval = null` after `clearInterval()` for defensive cleanup
  - Applied fix to failed and error handlers as well for consistency
  
### Technical Details
The issue occurred because `clearInterval()` only prevents future ticks from being scheduled, but does not stop async functions that are already executing. When the conversion completed, multiple polling ticks could:
1. Each see `status.status === "completed"`
2. Each call `clearInterval()` (ineffective for already-running ticks)
3. Each call `downloadCompletedConversion()` 
4. Result in multiple binary blob downloads that blocked browser file save

The fix uses an `isDownloading` flag as a mutex to ensure only the first completion handler proceeds with the download.

### Files Modified
- `civit_model_loader/static/app.js:195-247` - Added flag and updated polling logic

