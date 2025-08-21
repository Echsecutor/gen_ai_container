"""
Tests for the thumbnail generation module.
Tests the ThumbnailCache class and related functions using pytest.
"""

import os
import time
import tempfile
import pytest
from pathlib import Path
from PIL import Image

from conftest import (
    skip_if_no_thumbnail,
    create_test_image,
    IMAGE_FILE_TEST_CASES,
    THUMBNAIL_AVAILABLE
)

if THUMBNAIL_AVAILABLE:
    from thumbnail import (
        ThumbnailCache,
        get_thumbnail_base64,
        is_image_file,
        get_cache_stats,
        clear_thumbnail_cache,
    )


@skip_if_no_thumbnail()
class TestImageFileDetection:
    """Test image file detection functionality."""

    @pytest.mark.parametrize("filename,expected", IMAGE_FILE_TEST_CASES)
    def test_is_image_file(self, filename, expected):
        """Test is_image_file function with various file extensions."""
        assert is_image_file(filename) == expected


@skip_if_no_thumbnail()
class TestThumbnailCache:
    """Test thumbnail cache functionality."""

    def test_cache_initialization(self):
        """Test cache initialization with custom parameters."""
        cache = ThumbnailCache(
            max_cache_size=5,
            max_memory_mb=10,
            thumbnail_size=(100, 100)
        )
        stats = cache.get_cache_stats()

        assert stats['max_cache_size'] == 5
        assert stats['max_memory_mb'] == 10
        assert stats['thumbnail_size'] == (100, 100)
        assert stats['cache_size'] == 0
        assert stats['memory_usage_mb'] == 0

    def test_thumbnail_generation(self, thumbnail_cache, test_image_path):
        """Test basic thumbnail generation."""
        thumbnail = thumbnail_cache.get_thumbnail_base64(test_image_path)

        assert thumbnail is not None
        assert isinstance(thumbnail, str)
        assert len(thumbnail) > 0

    def test_cache_stats_after_generation(self, thumbnail_cache, test_image_path):
        """Test cache statistics after generating thumbnails."""
        thumbnail_cache.get_thumbnail_base64(test_image_path)
        stats = thumbnail_cache.get_cache_stats()

        assert stats['cache_size'] == 1
        assert stats['memory_usage_mb'] > 0

    def test_cache_hits(self, thumbnail_cache, test_image_path):
        """Test that repeated requests use cache (should be faster)."""
        # First request (cache miss)
        start_time = time.time()
        thumbnail1 = thumbnail_cache.get_thumbnail_base64(test_image_path)
        first_duration = time.time() - start_time

        # Second request (cache hit)
        start_time = time.time()
        thumbnail2 = thumbnail_cache.get_thumbnail_base64(test_image_path)
        second_duration = time.time() - start_time

        assert thumbnail1 == thumbnail2
        # Cache hit should be significantly faster (allow some variance)
        assert second_duration < first_duration * 0.5 or second_duration < 0.001

    def test_cache_eviction(self, temp_dir):
        """Test LRU eviction when cache size limit is exceeded."""
        cache = ThumbnailCache(
            max_cache_size=2, max_memory_mb=10, thumbnail_size=(50, 50))

        # Create 3 test images
        images = []
        for i in range(3):
            img_path = os.path.join(temp_dir, f"test_{i}.png")
            create_test_image(img_path, (100, 100), (i * 80, 100, 200))
            images.append(img_path)

        # Generate thumbnails for all 3 (should cause eviction)
        for img_path in images:
            cache.get_thumbnail_base64(img_path)

        stats = cache.get_cache_stats()
        assert stats['cache_size'] <= 2  # Should not exceed limit

    def test_cache_clear(self, thumbnail_cache, test_image_path):
        """Test cache clearing functionality."""
        # Generate a thumbnail
        thumbnail_cache.get_thumbnail_base64(test_image_path)

        # Verify cache has content
        stats = thumbnail_cache.get_cache_stats()
        assert stats['cache_size'] > 0
        assert stats['memory_usage_mb'] > 0

        # Clear cache
        thumbnail_cache.clear_cache()

        # Verify cache is empty
        stats = thumbnail_cache.get_cache_stats()
        assert stats['cache_size'] == 0
        assert stats['memory_usage_mb'] == 0

    def test_memory_limits(self, temp_dir):
        """Test memory usage tracking."""
        # Create cache with very small memory limit
        cache = ThumbnailCache(
            max_cache_size=10, max_memory_mb=1, thumbnail_size=(200, 200))

        # Create large test image
        img_path = os.path.join(temp_dir, "large_test.png")
        create_test_image(img_path, (500, 500), (255, 0, 0))

        # Generate thumbnail
        thumbnail = cache.get_thumbnail_base64(img_path)
        assert thumbnail is not None

        # Check that memory usage is tracked
        stats = cache.get_cache_stats()
        assert stats['memory_usage_mb'] > 0


@skip_if_no_thumbnail()
class TestErrorHandling:
    """Test error handling for various edge cases."""

    def test_nonexistent_file(self, thumbnail_cache):
        """Test handling of non-existent files."""
        thumbnail = thumbnail_cache.get_thumbnail_base64(
            "/nonexistent/file.png")
        assert thumbnail is None

    def test_non_image_file(self, thumbnail_cache, temp_dir):
        """Test handling of non-image files."""
        txt_path = os.path.join(temp_dir, "test.txt")
        with open(txt_path, 'w') as f:
            f.write("This is not an image")

        thumbnail = thumbnail_cache.get_thumbnail_base64(txt_path)
        assert thumbnail is None

    def test_corrupted_image_file(self, thumbnail_cache, temp_dir):
        """Test handling of corrupted image files."""
        corrupted_path = os.path.join(temp_dir, "corrupted.png")
        with open(corrupted_path, 'wb') as f:
            f.write(b"This is not a valid PNG file")

        thumbnail = thumbnail_cache.get_thumbnail_base64(corrupted_path)
        assert thumbnail is None


@skip_if_no_thumbnail()
class TestImageFormats:
    """Test thumbnail generation for different image formats."""

    @pytest.mark.parametrize("format_name,extension", [
        ("PNG", "png"),
        ("JPEG", "jpg"),
        ("BMP", "bmp"),
        ("TIFF", "tiff"),
    ])
    def test_image_format_support(self, thumbnail_cache, temp_dir, format_name, extension):
        """Test thumbnail generation for different image formats."""
        img_path = os.path.join(temp_dir, f"test.{extension}")

        # Create image in specific format
        img = Image.new('RGB', (100, 100), (255, 128, 0))
        img.save(img_path, format_name)

        # Generate thumbnail
        thumbnail = thumbnail_cache.get_thumbnail_base64(img_path)

        assert thumbnail is not None
        assert isinstance(thumbnail, str)
        assert len(thumbnail) > 0


@skip_if_no_thumbnail()
class TestGlobalFunctions:
    """Test global convenience functions."""

    def test_global_thumbnail_function(self, test_image_path):
        """Test the global get_thumbnail_base64 function."""
        clear_thumbnail_cache()

        thumbnail = get_thumbnail_base64(test_image_path)
        assert thumbnail is not None
        assert isinstance(thumbnail, str)
        assert len(thumbnail) > 0

    def test_global_cache_stats(self, test_image_path):
        """Test the global get_cache_stats function."""
        clear_thumbnail_cache()

        # Generate a thumbnail
        get_thumbnail_base64(test_image_path)

        stats = get_cache_stats()
        assert stats['cache_size'] == 1
        assert stats['memory_usage_mb'] > 0

    def test_global_cache_clear(self, test_image_path):
        """Test the global clear_thumbnail_cache function."""
        # Generate a thumbnail
        get_thumbnail_base64(test_image_path)

        # Verify cache has content
        stats = get_cache_stats()
        assert stats['cache_size'] > 0

        # Clear cache
        clear_thumbnail_cache()

        # Verify cache is empty
        stats = get_cache_stats()
        assert stats['cache_size'] == 0


@skip_if_no_thumbnail()
class TestExistingImages:
    """Test with existing test images from the tests directory."""

    def test_existing_test_images(self, thumbnail_cache, existing_test_images):
        """Test with existing test images if available."""
        if not existing_test_images:
            pytest.skip("No existing test images found")

        working_images = 0
        for name, img_path in existing_test_images.items():
            thumbnail = thumbnail_cache.get_thumbnail_base64(img_path)
            if thumbnail:
                working_images += 1
                assert isinstance(thumbnail, str)
                assert len(thumbnail) > 0

        assert working_images > 0, "At least one existing test image should work"


@skip_if_no_thumbnail()
class TestPerformance:
    """Performance-related tests."""

    @pytest.mark.slow
    def test_cache_performance(self, temp_dir):
        """Test cache performance with multiple images."""
        cache = ThumbnailCache(
            max_cache_size=10, max_memory_mb=20, thumbnail_size=(100, 100))

        # Create multiple test images
        images = []
        for i in range(5):
            img_path = os.path.join(temp_dir, f"perf_test_{i}.png")
            create_test_image(img_path, (200, 200), (i * 50, 100, 150))
            images.append(img_path)

        # Generate thumbnails (cache misses)
        start_time = time.time()
        for img_path in images:
            cache.get_thumbnail_base64(img_path)
        generation_time = time.time() - start_time

        # Access thumbnails again (cache hits)
        start_time = time.time()
        for img_path in images:
            cache.get_thumbnail_base64(img_path)
        cache_time = time.time() - start_time

        # Cache hits should be significantly faster
        assert cache_time < generation_time * 0.3 or cache_time < 0.01

        # Verify all images were cached
        stats = cache.get_cache_stats()
        assert stats['cache_size'] == 5
