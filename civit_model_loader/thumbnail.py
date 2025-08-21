import os
import base64
import logging
from io import BytesIO
from typing import Optional, Dict, Tuple
from PIL import Image, ImageOps
import hashlib
import time
from threading import RLock
import mimetypes

logger = logging.getLogger(__name__)

# Supported image formats for thumbnail generation
SUPPORTED_IMAGE_FORMATS = {'.jpg', '.jpeg', '.png',
                           '.bmp', '.tiff', '.tif', '.webp', '.gif'}


class ThumbnailCache:
    """In-memory cache for image thumbnails with LRU eviction and size limits."""

    def __init__(self, max_cache_size: int = 100, max_memory_mb: int = 50, thumbnail_size: Tuple[int, int] = (150, 150)):
        """
        Initialize the thumbnail cache.

        Args:
            max_cache_size: Maximum number of thumbnails to cache
            max_memory_mb: Maximum memory usage in MB (approximate)
            thumbnail_size: Size of generated thumbnails (width, height)
        """
        self.max_cache_size = max_cache_size
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.thumbnail_size = thumbnail_size
        self._cache: Dict[str, Dict] = {}
        self._access_times: Dict[str, float] = {}
        self._lock = RLock()
        self._current_memory_usage = 0

    def _generate_cache_key(self, file_path: str, mtime: float) -> str:
        """Generate a cache key based on file path and modification time."""
        key_string = f"{file_path}:{mtime}:{self.thumbnail_size[0]}x{self.thumbnail_size[1]}"
        return hashlib.md5(key_string.encode()).hexdigest()

    def _evict_lru(self):
        """Evict least recently used items until cache is within limits."""
        with self._lock:
            # Sort by access time and remove oldest
            while (len(self._cache) > self.max_cache_size or
                   self._current_memory_usage > self.max_memory_bytes):
                if not self._access_times:
                    break

                oldest_key = min(self._access_times.keys(),
                                 key=lambda k: self._access_times[k])
                cache_item = self._cache.get(oldest_key)
                if cache_item:
                    self._current_memory_usage -= cache_item.get('size', 0)

                del self._cache[oldest_key]
                del self._access_times[oldest_key]

                logger.debug(f"Evicted thumbnail from cache: {oldest_key}")

    def _create_thumbnail(self, file_path: str) -> Optional[bytes]:
        """Create a thumbnail for the given image file."""
        try:
            with Image.open(file_path) as img:
                # Convert RGBA to RGB if necessary (for JPEG compatibility)
                if img.mode in ('RGBA', 'LA', 'P'):
                    # Create white background
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split(
                    )[-1] if img.mode in ('RGBA', 'LA') else None)
                    img = background
                elif img.mode not in ('RGB', 'L'):
                    img = img.convert('RGB')

                # Create thumbnail maintaining aspect ratio
                img.thumbnail(self.thumbnail_size, Image.Resampling.LANCZOS)

                # Save to bytes
                output = BytesIO()
                img.save(output, format='JPEG', quality=85, optimize=True)
                return output.getvalue()

        except Exception as e:
            logger.warning(f"Failed to create thumbnail for {file_path}: {e}")
            return None

    def get_thumbnail_base64(self, file_path: str) -> Optional[str]:
        """
        Get a base64-encoded thumbnail for the given image file.

        Args:
            file_path: Path to the image file

        Returns:
            Base64-encoded thumbnail image data or None if failed
        """
        try:
            # Check if file exists and is readable
            if not os.path.isfile(file_path):
                return None

            # Check if it's a supported image format
            ext = os.path.splitext(file_path)[1].lower()
            if ext not in SUPPORTED_IMAGE_FORMATS:
                return None

            # Get file modification time for cache invalidation
            mtime = os.path.getmtime(file_path)
            cache_key = self._generate_cache_key(file_path, mtime)

            with self._lock:
                # Check cache first
                if cache_key in self._cache:
                    self._access_times[cache_key] = time.time()
                    return self._cache[cache_key]['data']

                # Create thumbnail
                thumbnail_bytes = self._create_thumbnail(file_path)
                if thumbnail_bytes is None:
                    return None

                # Encode to base64
                thumbnail_base64 = base64.b64encode(
                    thumbnail_bytes).decode('utf-8')

                # Store in cache
                cache_item = {
                    'data': thumbnail_base64,
                    'size': len(thumbnail_base64),
                    'created': time.time()
                }

                self._cache[cache_key] = cache_item
                self._access_times[cache_key] = time.time()
                self._current_memory_usage += cache_item['size']

                # Evict old items if necessary
                self._evict_lru()

                logger.debug(f"Created and cached thumbnail for {file_path}")
                return thumbnail_base64

        except Exception as e:
            logger.error(f"Error getting thumbnail for {file_path}: {e}")
            return None

    def clear_cache(self):
        """Clear all cached thumbnails."""
        with self._lock:
            self._cache.clear()
            self._access_times.clear()
            self._current_memory_usage = 0
            logger.info("Thumbnail cache cleared")

    def get_cache_stats(self) -> Dict:
        """Get cache statistics."""
        with self._lock:
            return {
                'cache_size': len(self._cache),
                'max_cache_size': self.max_cache_size,
                'memory_usage_mb': self._current_memory_usage / (1024 * 1024),
                'max_memory_mb': self.max_memory_bytes / (1024 * 1024),
                'thumbnail_size': self.thumbnail_size
            }


# Global thumbnail cache instance
_thumbnail_cache = ThumbnailCache()


def get_thumbnail_base64(file_path: str) -> Optional[str]:
    """
    Get a base64-encoded thumbnail for the given image file.

    This is a convenience function that uses the global thumbnail cache.

    Args:
        file_path: Path to the image file

    Returns:
        Base64-encoded thumbnail image data or None if failed/not an image
    """
    return _thumbnail_cache.get_thumbnail_base64(file_path)


def is_image_file(file_path: str) -> bool:
    """
    Check if a file is a supported image format.

    Args:
        file_path: Path to the file

    Returns:
        True if the file is a supported image format
    """
    ext = os.path.splitext(file_path)[1].lower()
    return ext in SUPPORTED_IMAGE_FORMATS


def get_cache_stats() -> Dict:
    """Get thumbnail cache statistics."""
    return _thumbnail_cache.get_cache_stats()


def clear_thumbnail_cache():
    """Clear the thumbnail cache."""
    _thumbnail_cache.clear_cache()
