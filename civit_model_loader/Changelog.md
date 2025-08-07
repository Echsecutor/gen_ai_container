# Changelog

## WIP

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
