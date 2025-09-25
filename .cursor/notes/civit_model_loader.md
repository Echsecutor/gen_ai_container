# Civitai Model Loader Implementation

## Overview

Complete frontend + backend implementation for downloading AI models from Civitai using their REST API v1.

## Architecture

### Backend (Python FastAPI)

- **Location**: `civit_model_loader/`
- **Main Components**:
  - `main.py` - FastAPI application with REST endpoints
  - `models.py` - Pydantic data models for API requests/responses
  - `civitai_client.py` - Civitai API integration client
  - `download_manager.py` - Asynchronous download handling with progress tracking
  - `thumbnail.py` - Image thumbnail generation with intelligent in-memory caching
  - `converter.py` - InvokeAI to Automatic1111 metadata conversion utilities

### Frontend (HTML/CSS/JavaScript)

- **Location**: `civit_model_loader/static/`
- **Files**:
  - `index.html` - Main UI structure (updated for ESM imports)
  - `styles.css` - Complete styling with responsive design
  - `app.js` - Main application orchestrator (modular ESM version)
- **Modular JavaScript Structure**: `civit_model_loader/static/js/`
  - `utils.js` - Utility functions (escapeHtml, sanitizeHtml, formatters, etc.)
  - `ui.js` - UI components (modals, toasts, progress bars, loading states)
  - `state.js` - Global state management and localStorage persistence
  - `api.js` - Backend API client with error handling and retry logic
  - `search.js` - Unified search functionality (query + model ID) with pagination management
  - `models.js` - Model details display and interaction
  - `download.js` - Download operations and queue management
  - `config.js` - Configuration import/export functionality

## Key Features Implemented

### API Token Management

- Store/retrieve API token in browser localStorage
- Token validation through test endpoint
- Secure token handling for downloads
- Visual feedback UI: checkmark when token is loaded from localStorage
- Toggle between "Token Loaded" state and input state
- "Change Token" functionality for updating stored tokens

### Model Discovery

- **Unified Search Interface** with two modes:
  - **Search by Name/Keywords**: Traditional text-based search with filters (type, sort, NSFW)
  - **Search by Model ID**: Direct model lookup using Civitai model ID
- Radio button toggle to switch between search modes
- Dynamic UI that shows/hides filters based on search mode
- Shared results display for both search types
- Pagination support for query search results (not applicable to single model ID results)
- Model detail modal with version/file information
- Enhanced error handling and user feedback for both search modes
- Detailed model cards for ID search results with version information and statistics

### Download Management

- Fully asynchronous download queue with enhanced progress tracking
- Real-time status updates via polling with speed, ETA, and timing information
- Improved timeout handling (60s socket timeouts) for large file downloads
- Enhanced progress callbacks with download speed calculations
- Automatic cleanup of incomplete/failed downloads
- Cancel active downloads with proper file cleanup
- Model file storage in `${MOUNT_DIR}/models`
- Enhanced frontend UI with animated progress bars and detailed status display

### Local Data Persistence

- Downloaded models history in localStorage
- Re-download previously downloaded models
- Export/import configuration as JSON
- NSFW preference storage and restoration across sessions
- **File Existence Verification**: Backend checks if downloaded model files actually exist on disk
  - Real-time file existence status displayed in Downloaded Models section
  - Visual indicators: ✅ for existing files, ❌ for missing files
  - Missing files highlighted with red border and background
  - Tooltip shows full file path for verification

### User Interface

- Responsive design for mobile/desktop
- Toast notifications for user feedback
- Modal dialogs for model details
- Progress bars for download status
- **Image Display System**:
  - Preview images in model cards (search results)
  - Full image galleries in detailed model view
  - Image modal for full-size viewing
  - Error handling for missing/broken images
  - Responsive image grids for different screen sizes
- **Image Conversion Interface**:
  - Directory input field with default `/workspace/output/images` path
  - Asynchronous conversion with real-time progress tracking
  - Download button to trigger async conversion and ZIP download
  - Real-time status feedback with file counts, current file, and progress percentage
  - Automatic filename generation with timestamps
  - Mobile-responsive layout with stacked form elements
  - Animated progress bars during conversion
  - Automatic download when conversion completes

## API Endpoints

### Search & Discovery

- `POST /api/search` - Search models with filters
- `GET /api/models/{id}` - Get model details
- `GET /api/model-versions/{id}` - Get version details

### Download Management

- `POST /api/download` - Start model download
- `GET /api/downloads` - Get all download statuses
- `GET /api/downloads/{id}` - Get specific download status
- `DELETE /api/downloads/{id}` - Cancel download

### File Management

- `POST /api/check-files` - Check if downloaded model files exist on disk
- `GET /api/list-files?folder=/path/to/folder` - List files in server-side directory with image thumbnails
  - Default folder: `/workspace/output/images`
  - Returns JSON array with file information: filename, full path, and thumbnails for images
  - Thumbnails are base64-encoded JPEG data URLs (150x150px with aspect ratio preservation)
  - Supports all common image formats: JPG, PNG, BMP, TIFF, WebP, GIF
  - Uses intelligent in-memory caching with LRU eviction and configurable memory limits

### Image Conversion

- `POST /api/start-conversion` - Start asynchronous image conversion
  - Accepts directory path to scan for PNG files
  - Returns conversion_id for tracking progress
  - Queues conversion task in background
- `GET /api/conversions/{id}` - Get conversion status and progress
  - Returns detailed progress info (progress percentage, processed files, current file)
  - Real-time status updates for frontend polling
- `GET /api/conversions` - Get all conversion statuses
- `DELETE /api/conversions/{id}` - Cancel active conversion
- `GET /api/download-conversion/{id}` - Download completed conversion ZIP
- `GET /api/download-converted-images?directory=/path/to/images` - Legacy synchronous conversion
  - Scans directory for PNG files generated by InvokeAI
  - Converts metadata to Automatic1111 format using converter module
  - Returns ZIP file with converted images (suffix: `_a1111.png`)
  - Default directory: `/workspace/output/images`
  - Includes conversion summary file if errors occur
  - Proper error handling and temporary file cleanup

### Utility

- `GET /api/health` - Health check endpoint
- `GET /` - Serve frontend application

## Deployment

### Docker

- `Dockerfile` - Container definition
- `docker-compose.yml` - Complete deployment setup with health checks
  - Service name: `civit-model-loader`
  - Exposed on port 8080:8080
  - Volume mounting: `${MODEL_DIR:-./models}:/workspace/models`
  - Environment variables: `MOUNT_DIR=/workspace`, `PORT=8080`
  - Health check: Curl to `/api/health` endpoint every 30s
  - Auto-restart policy: `unless-stopped`
- `start.sh` - Startup script for development

### Environment Variables

- `MOUNT_DIR` - Model storage directory (default: `/workspace`)
- `PORT` - Service port (default: 8080, also configurable via command line)

### Command Line Arguments

- `--port` - Service port (default: 8080 or PORT environment variable)
  - Example usage: `python main.py --port 3000`
  - Falls back to PORT environment variable or 8080 if not specified

### Volume Mounting

- Models stored in `${MOUNT_DIR}/models`
- Persistent across container restarts
- Compatible with InvokeAI/ComfyUI model discovery

## Dependencies

- **Backend**: FastAPI, uvicorn, requests, pydantic, aiofiles, aiohttp
- **Frontend**: Vanilla JavaScript (no external dependencies)

## Usage

### Local Development

**ALWAYS use the start.sh script for local testing:**

```bash
cd civit_model_loader
./start.sh
```

The start script handles:

- Creating virtual environment (`.venv`)
- Installing dependencies
- Setting up local mount directory (`./dev_mount_dir`)
- Starting the application on port 8080

### Debug Setup with Live Reloading

**For active development with automatic reloading when source files change:**

#### Configuration

- **Dockerfile**: Modified to use `uvicorn` with `--reload` flag
  ```dockerfile
  CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
  ```
- **docker-compose.yml**: Added source code volume mount for live file access
  ```yaml
  volumes:
    - ${MODEL_DIR:-./models}:/workspace/models
    - .:/app # Mount source code for live reloading
  ```

#### How It Works

1. **Source Code Mounting**: Local directory mounted to `/app` in container
2. **File Change Detection**: uvicorn's `--reload` flag monitors Python files
3. **Automatic Restart**: Application restarts when changes detected
4. **Real-time Development**: Edit files locally, see changes immediately

#### Usage

```bash
cd civit_model_loader
docker-compose up --build
```

**Benefits:**

- ✅ No manual container restarts needed
- ✅ Instant feedback on code changes
- ✅ Efficient debugging workflow
- ✅ Production-ready when deployed without volume mount

### Production (Docker)

**Using Docker Compose (recommended for testing and production):**

```bash
cd civit_model_loader
docker-compose up --build
```

**Manual Docker deployment:**

1. Use Docker or docker-compose for production deployment
2. Set appropriate MOUNT_DIR environment variable
3. Ensure volume mounting for persistent model storage

**Configuration:**

- Set `MODEL_DIR` environment variable to specify host model directory (defaults to `./models`)
- Container exposes port 8080 with health monitoring
- Models persist in mounted volume across container restarts

### General Usage

1. Start service using start.sh (local) or Docker (production)
2. Access web interface at `http://localhost:8080`
3. Configure Civitai API token
4. Search and download models
5. Models available in mounted volume for AI tools

## Testing

### Test Scripts Location

- `tests/` - Contains comprehensive test scripts for debugging and validation
  - `test_api.py` - Direct CivitAI API testing
  - `test_client.py` - CivitaiClient implementation testing
  - `test_fastapi_endpoint.py` - FastAPI endpoint testing

### Known Issues Fixed

- **Pagination Error**: Fixed 400 error when using query searches with page parameter

  - CivitAI API requires cursor-based pagination for query searches
  - Updated `civitai_client.py` to handle pagination differences correctly
  - See `civitai_api.md` for detailed implementation notes

- **API Token Not Sent to Backend**: Fixed API token not being passed to CivitAI API

  - Added `api_token` field to `SearchRequest` model in `models.py`
  - Updated backend to pass token to `CivitaiClient` constructor
  - Frontend now properly sends token in request body

- **Token UI State Not Persisting**: Fixed checkmark disappearing on page reload

  - Enhanced token loading logic in `loadStoredData()` function
  - Improved UI state management for token loaded vs input states
  - Added proper DOM element checking and error handling

- **Missing loadDownloadedModels Function**: Fixed "Uncaught ReferenceError: loadDownloadedModels is not defined"

  - Added missing `loadDownloadedModels()` function that calls `displayDownloadedModels()`
  - Function is attached to "Refresh" button in Downloaded Models section
  - Enables users to refresh the displayed list of downloaded models

- **NSFW Preference Storage**: Added persistent storage for NSFW filter setting
  - NSFW checkbox state now saves automatically to localStorage when changed
  - Preference restored on page reload/next visit
  - Included in export/import configuration functionality
  - Uses `civitai_nsfw_preference` localStorage key

### API Token Testing

- All search scenarios working correctly
- Both authenticated and non-authenticated requests supported

### Security Configuration

- **API Keys**: Sensitive tokens moved to `tests/test_config.py` (gitignored)
  - Test files import from `test_config.CIVITAI_API_KEY`
  - Graceful fallback with warning if config file missing
  - No sensitive data in tracked git files
- **Configuration**: `test_config.py` added to `.gitignore` to prevent token commits

## Image Display Implementation

### Technical Details

- **Data Source**: Images retrieved from `model.modelVersions[].images[].url` via CivitAI API
- **Preview Logic**: Shows first image from first model version in search cards
- **Gallery Logic**: Displays all images from all model versions in detailed view as thumbnails
- **Error Handling**: Uses `onerror` attribute to hide broken image containers
- **Modal System**: Dynamic modal creation with click-to-view functionality
- **Responsive Design**: Grid layouts adapt to screen size with mobile optimization

### UI Improvements

- **Enlarged Modal**: Increased modal size to 1200px max-width for better content display
- **Thumbnail Gallery**: Images display as 120px thumbnails instead of full-size (150px grid)
- **Lightbox Experience**: Click thumbnails to view full-size images in overlay modal
- **Visual Indicators**: Hover effects with magnifying glass icon and border highlights
- **Mobile Responsive**: Smaller thumbnails (100px) and optimized spacing on mobile devices
- **Modal Interaction**: Full modal closing support (X button, outside click, Escape key)

### HTML Sanitization for Model Descriptions

- **Security-focused HTML sanitization**: Added `sanitizeHtml()` function to safely render HTML content in model descriptions
- **Allowed HTML tags**: Supports safe formatting tags (p, br, strong, b, em, i, u, h1-h6, ul, ol, li, blockquote, code, pre, span, div, a, img)
- **Attribute filtering**: Only allows safe attributes like href (http/https only), src (http/https/data: only), style (basic CSS), alt, width, height
- **XSS protection**: Removes dangerous HTML elements and attributes while preserving safe formatting
- **Applied to all description areas**: Search results (with smart truncation), version descriptions, and modal descriptions
- **Smart truncation**: For search results, strips HTML tags for length calculation, then applies sanitization to preserve formatting

### UI Bug Fixes

- **Pagination Button Visibility**: Fixed white-on-white pagination buttons by adding proper text color (#4a5568) to ensure visibility against white background
- **Pagination Search Error**: Fixed "Unprocessable Entity" error when clicking Next/Previous buttons by:
  - Adding missing `api_token` field to search requests
  - Refactoring pagination logic to use stored search request (`currentSearch`) instead of rebuilding from form fields
  - Created `performSearchWithRequest()` function to avoid form field mismatches during pagination
  - Fixed pagination for query searches by detecting cursor-based vs page-based pagination and implementing cursor-based navigation
  - Added `setupCursorPagination()` function with Next/Previous buttons for query searches
  - Implemented cursor storage and navigation logic for query result pagination
- **Checkpoint Pagination Issues**: Fixed page-based pagination problems:
  - Reset `currentPage = 1` for new searches to prevent starting from wrong page numbers
  - Fixed search request to always start from page 1 for new searches (not previous page)
  - Improved pagination consistency between new searches and page navigation
  - Added debugging logs to track pagination request/response data
- **Frontend Data Robustness**: Fixed multiple frontend crashes from malformed API data:
  - Added optional chaining (`model.creator?.username`) for safe property access
  - Fallback to "Unknown" when creator or username is undefined
  - Added null checking for `model.modelVersions` arrays in model details display
  - Added try-catch error handling around search results rendering
  - Safe array access with `(model.modelVersions || [])` to prevent undefined errors
  - Applied fixes to both search results display and model details modal
- **Combined Search Pagination**: Fixed pagination issues when combining text search with type filters:
  - Enhanced debugging for combined searches (text + type filter)
  - Improved cursor navigation with better user feedback and error handling
  - Clear metadata and cursor state when starting new searches to prevent conflicts
  - Better pagination info display showing both query and type filter information
- **Downloaded Models Layout**: Fixed header overflow and layout inconsistencies:
  - Changed grid layout from `auto-fill, minmax(250px, 1fr)` to `repeat(3, 1fr)` for consistent 3-column layout
  - Added proper text wrapping for long filenames using `word-wrap: break-word`, `word-break: break-all`, and `overflow-wrap: break-word`
  - Headers now break at any character to prevent overflow instead of only breaking at hyphens
  - Layout now matches Search Models section with fixed 3-column grid
- **Downloaded Models Images**: Added image previews to downloaded model cards:
  - Enhanced `downloadModel()` function to accept and store `imageUrl` parameter
  - Modified `modelInfo` data structure to include `imageUrl` field for persistence
  - Updated download button calls in model details to pass preview image URL (first image from first version)
  - Enhanced `displayDownloadedModels()` function to show image previews similar to search results
  - Added CSS styling for downloaded model cards matching search model card design
  - Images include hover effects, error handling, and responsive design
  - Downloaded models now have visual consistency with search results
- **Downloaded Models Deduplication**: Prevented duplicate entries when re-downloading models:
  - Modified `downloadModel()` function to check for existing entries using `modelId + versionId + fileId` combination
  - Re-downloading an existing model now updates the existing entry instead of creating duplicates
  - Updated timestamp reflects the most recent download attempt
  - Each unique model file appears only once in the downloaded models list

### JavaScript Syntax Fixes

- **Async/Await Syntax Error**: Fixed JavaScript syntax error in `config.js`:

  - `resetToDefaults()` method was using `await` without being declared as `async`
  - Added `async` keyword to method declaration on line 177
  - Updated exported `resetToDefaults()` function to be `async` and properly await the method call
  - Resolved "Uncaught SyntaxError: Unexpected reserved word" error at config.js:181:30

- **Search Endpoint 422 Error**: Fixed API error when frontend sends search requests with `"types": null`:

  - Updated `SearchRequest` model to handle `null` values for `types` field properly
  - Modified frontend to omit `types` field entirely when no model type is selected instead of sending `null`
  - Added `cleanSearchRequest()` method to remove `null` or empty `types` values from all search requests
  - Applied cleaning to initial searches, pagination, and cursor-based navigation
  - Added `extra = "ignore"` configuration to `SearchRequest` to handle extra fields gracefully
  - Resolved "422 Unprocessable Entity" error when searching with null types

- **File Existence Check 422 Error**: Fixed API error when checking file existence after importing configuration:

  - Added validation to filter out models with missing required fields before API call
  - Added graceful handling of empty files array in both frontend and backend
  - Added debugging logs to track file existence check requests
  - Backend now returns empty response instead of error for empty files array
  - Resolved "422 Unprocessable Entity" error when importing configuration with invalid model data

- **Downloaded Models Management**: Added remove functionality for downloaded models list:
  - Added "Remove" button next to "Re-download" button in downloaded models display
  - Implemented `removeDownloadedModel()` function with confirmation dialog
  - Added button styling with primary/danger variants for better UX
  - Responsive layout for mobile devices (buttons stack vertically)
  - Removes model from localStorage but doesn't delete actual file from disk
  - Provides user feedback with toast notifications

### Performance and Threading Fixes

- **UI Responsiveness During Downloads**: Fixed blocking UI during active downloads
  - **Root Cause**: Synchronous file I/O and HTTP operations in async context were blocking FastAPI event loop
  - **Solution**: Replaced synchronous operations with true async I/O:
    - Added `aiohttp` dependency for async HTTP streaming
    - Added `download_file_async()` method to CivitaiClient using aiohttp and aiofiles
    - Updated download_manager to use async file operations instead of synchronous ones
    - Added periodic `await asyncio.sleep()` calls to yield control during downloads
  - **Result**: Download progress now updates in real-time while UI remains responsive
  - **Technical Details**:
    - Uses `aiohttp.ClientSession` for non-blocking HTTP requests
    - Uses `aiofiles.open()` for non-blocking file I/O
    - Progress callback updates download status without blocking event loop
    - Downloads now truly run in background tasks without affecting API responsiveness

## Frontend Refactoring to Modular ESM Structure

### Architecture Transformation (December 2024)

- **Problem**: The original `app.js` had grown to 1060+ lines with significant code duplication and tight coupling
- **Solution**: Complete refactoring into modular ESM (ES6 modules) structure with functional separation

### Modular Structure Benefits

- **Separation of Concerns**: Each module has a single responsibility (state, UI, API, search, etc.)
- **Code Deduplication**: Eliminated duplicate modal handlers, error handling, and UI patterns
- **Maintainability**: Smaller, focused modules are easier to understand and modify
- **Testability**: Individual modules can be tested in isolation
- **Performance**: Tree-shaking enables smaller bundle sizes in production
- **Developer Experience**: Better IDE support with explicit imports/exports

### Module Dependencies

```
app.js (main orchestrator)
├── ui.js (modal manager, toasts, progress bars)
├── state.js (global state, localStorage)
├── api.js (backend communication)
├── search.js (search functionality, pagination)
├── models.js (model details, display)
├── download.js (download management)
├── config.js (import/export)
└── utils.js (shared utilities)
```

### Backward Compatibility

- Global function access preserved for onclick handlers (`window.showModelDetails`, etc.)
- Existing HTML structure unchanged (only script tag updated to `type="module"`)
- All original functionality maintained while improving code organization
- State management centralized but accessible through both module exports and global app instance

### Key Improvements

- **Error Handling**: Centralized with `withErrorHandler` wrapper function
- **Modal Management**: Unified modal system with registration and lifecycle management
- **State Persistence**: Consolidated localStorage operations in state module
- **API Client**: Robust retry logic and batch operations support
- **UI Components**: Reusable progress bars, loading states, and notification system
