# Thumbnail Generation System

## Overview

The thumbnail system provides automatic image thumbnail generation with intelligent in-memory caching for the Civitai Model Loader's file listing functionality.

## Implementation

### Core Module: `thumbnail.py`

- **ThumbnailCache Class**: Main caching system with configurable limits
- **Global Functions**: Convenient interface for thumbnail operations
- **Image Processing**: Uses Pillow for high-quality thumbnail generation

### Key Features

#### Intelligent Caching

- **LRU Eviction**: Least Recently Used items removed when cache fills
- **Memory Management**: Configurable memory limits (default: 50MB)
- **Cache Size Limits**: Configurable item count (default: 100 items)
- **Cache Invalidation**: Based on file modification time for accuracy

#### Image Processing

- **Format Support**: JPG, PNG, BMP, TIFF, WebP, GIF
- **Size**: 150x150 pixels with aspect ratio preservation
- **Quality**: Optimized JPEG encoding (quality=85) for good balance
- **Format Conversion**: Automatic RGBA→RGB conversion for compatibility

#### Performance

- **Base64 Encoding**: Ready for data URL embedding in JSON responses
- **Thread Safety**: Uses RLock for concurrent access
- **Memory Efficient**: Tracks actual memory usage and enforces limits

### API Integration

#### Used by `/api/list-files` endpoint:

- Automatic thumbnail generation for image files
- Seamless integration with file listing
- Graceful degradation when thumbnail generation fails

#### Frontend Integration:

- **Thumbnail Gallery**: Interactive image gallery in Image Conversion section
- **Grid Display**: Responsive thumbnail grid with hover effects
- **Lightbox Modal**: Click-to-view full-size images with navigation
- **Auto-refresh**: Gallery updates when directory path changes
- **Keyboard Navigation**: Arrow keys and Escape key support
- **Mobile-friendly**: Touch-friendly controls and responsive design

#### Response Format:

```json
{
  "files": [
    {
      "filename": "image.png",
      "full_path": "/workspace/output/images/image.png",
      "thumbnail": "data:image/jpeg;base64,/9j/4AAQ..."
    }
  ]
}
```

### Configuration

#### Default Settings:

- **Cache Size**: 100 items maximum
- **Memory Limit**: 50MB maximum
- **Thumbnail Size**: 150x150 pixels
- **Quality**: JPEG quality 85

#### Tunable Parameters:

- All limits configurable via ThumbnailCache constructor
- Global cache accessible via module functions
- Cache statistics available for monitoring

### Error Handling

- **Missing Files**: Returns None for non-existent files
- **Unsupported Formats**: Returns None for non-image files
- **Processing Errors**: Logged warnings, graceful degradation
- **Permission Issues**: Proper error handling and logging

### Usage Patterns

#### Direct Usage:

```python
from thumbnail import get_thumbnail_base64, is_image_file

if is_image_file(file_path):
    thumbnail = get_thumbnail_base64(file_path)
    if thumbnail:
        data_url = f"data:image/jpeg;base64,{thumbnail}"
```

#### Cache Management:

```python
from thumbnail import get_cache_stats, clear_thumbnail_cache

# Monitor cache usage
stats = get_cache_stats()
print(f"Cache size: {stats['cache_size']}/{stats['max_cache_size']}")

# Clear cache if needed
clear_thumbnail_cache()
```

## Dependencies

- **Pillow**: Core image processing library
- **Standard Library**: os, base64, hashlib, threading, time
- **No External Services**: Fully self-contained operation

## Performance Characteristics

- **First Access**: ~50-200ms per image (depends on size)
- **Cache Hits**: ~1-5ms per image
- **Memory Usage**: ~10-50KB per cached thumbnail
- **Thread Safety**: Concurrent access supported
