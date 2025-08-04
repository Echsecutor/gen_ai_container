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

### Frontend (HTML/CSS/JavaScript)

- **Location**: `civit_model_loader/static/`
- **Files**:
  - `index.html` - Main UI structure
  - `styles.css` - Complete styling with responsive design
  - `app.js` - Full client-side functionality

## Key Features Implemented

### API Token Management

- Store/retrieve API token in browser localStorage
- Token validation through test endpoint
- Secure token handling for downloads
- Visual feedback UI: checkmark when token is loaded from localStorage
- Toggle between "Token Loaded" state and input state
- "Change Token" functionality for updating stored tokens

### Model Discovery

- Search Civitai models with filters (type, sort, NSFW)
- Pagination support for search results
- Model detail modal with version/file information

### Download Management

- Asynchronous download queue with progress tracking
- Real-time status updates via polling
- Cancel active downloads
- Model file storage in `${MOUNT_DIR}/models`

### Local Data Persistence

- Downloaded models history in localStorage
- Re-download previously downloaded models
- Export/import configuration as JSON
- NSFW preference storage and restoration across sessions

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

### Utility

- `GET /api/health` - Health check endpoint
- `GET /` - Serve frontend application

## Deployment

### Docker

- `Dockerfile` - Container definition
- `docker-compose.yml` - Complete deployment setup
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

### Production (Docker)

1. Use Docker or docker-compose for production deployment
2. Set appropriate MOUNT_DIR environment variable
3. Ensure volume mounting for persistent model storage

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
