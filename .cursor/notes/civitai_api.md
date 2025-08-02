# Civitai API v1 Documentation

## Overview

Civitai REST API for accessing models, images, creators, and tags. Base URL: `https://civitai.com/api/v1/`

Reference: [Civitai API Documentation](https://developer.civitai.com/docs/api/public-rest)

## Authentication

### API Key Generation

- Generate from User Account Settings on Civitai
- Required for downloading restricted resources

### Authentication Methods

**Authorization Header (Recommended):**

```bash
Authorization: Bearer {api_key}
```

**Query Parameter:**

```bash
?token={api_key}
```

## Key Endpoints

### Models

- `GET /api/v1/models` - List models with filtering
- `GET /api/v1/models/:modelId` - Get specific model details
- `GET /api/v1/model-versions/:modelVersionId` - Get model version details
- `GET /api/v1/model-versions/by-hash/:hash` - Find model by file hash

### Query Parameters for Models

- `limit`: Results per page (0-200, default: 20)
- `page`: Page number for pagination
- `query`: Search query string
- `tag`: Filter by tag
- `username`: Filter by creator
- `types`: Model types (Checkpoint, TextualInversion, etc.)
- `sort`: Newest, Most Downloaded, Most Liked, etc.
- `period`: AllTime, Year, Month, Week, Day
- `nsfw`: true/false/undefined

### Other Endpoints

- `GET /api/v1/creators` - List model creators
- `GET /api/v1/images` - Get model images/gallery
- `GET /api/v1/tags` - List available tags

## Response Format

- JSON with `items[]` array and `metadata` object
- Metadata includes pagination info: `totalItems`, `currentPage`, `pageSize`, `totalPages`, `nextPage`, `prevPage`

## File Download

- Each model version has a `downloadUrl` field
- Requires API key for restricted models
- Files include metadata: hashes, file sizes, scan results

## Hash Support

Supported hash algorithms: AutoV1, AutoV2, SHA256, CRC32, Blake3

## Rate Limiting

- Public API with reasonable rate limits
- Use API key for higher limits and access to restricted content

## Pagination Issues and Solutions

### Query vs Non-Query Search Pagination

**IMPORTANT**: CivitAI API has different pagination rules for different search types:

- **Query searches** (searches with `query` parameter): Must use cursor-based pagination

  - Cannot use `page` parameter
  - Use `cursor` parameter for pagination instead
  - Error: "Cannot use page param with query search. Use cursor-based pagination."

- **Non-query searches** (no `query` parameter): Use standard page-based pagination
  - Use `page` parameter normally
  - No cursor parameter needed

### Implementation Fix

```python
# Fixed implementation in civitai_client.py
if search_request.query:
    params["query"] = search_request.query
    if search_request.cursor:
        params["cursor"] = search_request.cursor
    # Don't include page parameter for query searches
else:
    # Only include page parameter for non-query searches
    params["page"] = search_request.page
```

### Test Results

- API Key: Working with valid API key (stored in test_config.py)
- Query searches: Fixed and working
- Non-query searches: Working with pagination
- Type filtering: Working correctly
