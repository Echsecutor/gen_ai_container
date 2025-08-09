# Changelog

## WIP

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
