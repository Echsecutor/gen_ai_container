# Changelog

## WIP

- Fixed 422 Unprocessable Entity error in search endpoint caused by browser CORS Content-Type downgrade

  - Root cause: Browser sends `Content-Type: text/plain;charset=UTF-8` instead of `application/json` to avoid CORS preflight
  - Solution: Modified search endpoint to handle both `application/json` and `text/plain` content types
  - Added CORS middleware to FastAPI application for proper cross-origin request handling
  - Search requests now work correctly from frontend without 422 errors

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
