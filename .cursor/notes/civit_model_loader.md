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

### User Interface

- Responsive design for mobile/desktop
- Toast notifications for user feedback
- Modal dialogs for model details
- Progress bars for download status

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
- `PORT` - Service port (default: 8080)

### Volume Mounting

- Models stored in `${MOUNT_DIR}/models`
- Persistent across container restarts
- Compatible with InvokeAI/ComfyUI model discovery

## Dependencies

- **Backend**: FastAPI, uvicorn, requests, pydantic, aiofiles
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

### API Token Testing

- All search scenarios working correctly
- Both authenticated and non-authenticated requests supported

### Security Configuration

- **API Keys**: Sensitive tokens moved to `tests/test_config.py` (gitignored)
  - Test files import from `test_config.CIVITAI_API_KEY`
  - Graceful fallback with warning if config file missing
  - No sensitive data in tracked git files
- **Configuration**: `test_config.py` added to `.gitignore` to prevent token commits
