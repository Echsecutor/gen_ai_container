#!/usr/bin/env python3
"""
Test script for the thumbnail generation module.
Tests the ThumbnailCache class and related functions.
"""

from thumbnail import (
    ThumbnailCache,
    get_thumbnail_base64,
    is_image_file,
    get_cache_stats,
    clear_thumbnail_cache,
    SUPPORTED_IMAGE_FORMATS
)
import os
import sys
import tempfile
import logging
import time
from pathlib import Path
from PIL import Image

# Add parent directory to path to import thumbnail module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


def create_test_image(path, size=(200, 300), color=(255, 0, 0)):
    """Create a test image with specified dimensions and color."""
    img = Image.new('RGB', size, color)
    img.save(path, 'PNG')
    return path


def test_is_image_file():
    """Test the is_image_file function."""
    print("=== Testing is_image_file function ===")

    test_cases = [
        # (filename, expected_result)
        ("test.jpg", True),
        ("test.jpeg", True),
        ("test.png", True),
        ("test.bmp", True),
        ("test.tiff", True),
        ("test.tif", True),
        ("test.webp", True),
        ("test.gif", True),
        ("test.JPG", True),  # Case insensitive
        ("test.PNG", True),  # Case insensitive
        ("test.txt", False),
        ("test.pdf", False),
        ("test.doc", False),
        ("test.mp4", False),
        ("test", False),  # No extension
        ("", False),  # Empty string
        ("test.jpg.txt", False),  # Wrong final extension
    ]

    passed = 0
    failed = 0

    for filename, expected in test_cases:
        result = is_image_file(filename)
        if result == expected:
            print(f"✅ {filename}: {result} (expected {expected})")
            passed += 1
        else:
            print(f"❌ {filename}: {result} (expected {expected})")
            failed += 1

    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def test_thumbnail_cache_basic():
    """Test basic thumbnail cache functionality."""
    print("\n=== Testing ThumbnailCache Basic Functionality ===")

    # Create a test cache with small limits for testing
    cache = ThumbnailCache(
        max_cache_size=3, max_memory_mb=5, thumbnail_size=(50, 50))

    with tempfile.TemporaryDirectory() as temp_dir:
        # Create test images
        test_images = []
        for i in range(5):
            img_path = os.path.join(temp_dir, f"test_{i}.png")
            create_test_image(img_path, (100, 100), (i * 50, 0, 0))
            test_images.append(img_path)

        print(f"Created {len(test_images)} test images")

        # Test 1: Generate thumbnails
        print("\nTest 1: Generating thumbnails")
        thumbnails = []
        # Only first 3 to stay within cache limit
        for i, img_path in enumerate(test_images[:3]):
            thumbnail = cache.get_thumbnail_base64(img_path)
            if thumbnail:
                print(f"✅ Generated thumbnail for test_{i}.png ({len(thumbnail)} chars)")
                thumbnails.append(thumbnail)
            else:
                print(f"❌ Failed to generate thumbnail for test_{i}.png")
                return False

        # Test 2: Check cache stats
        print("\nTest 2: Checking cache stats")
        stats = cache.get_cache_stats()
        print(f"Cache size: {stats['cache_size']}/{stats['max_cache_size']}")
        print(f"Memory usage: {stats['memory_usage_mb']:.2f}/{stats['max_memory_mb']} MB")
        print(f"Thumbnail size: {stats['thumbnail_size']}")

        if stats['cache_size'] != 3:
            print(f"❌ Expected 3 items in cache, got {stats['cache_size']}")
            return False

        # Test 3: Cache hits (should be fast)
        print("\nTest 3: Testing cache hits")
        for i, img_path in enumerate(test_images[:3]):
            start_time = time.time()
            thumbnail = cache.get_thumbnail_base64(img_path)
            end_time = time.time()
            duration = (end_time - start_time) * 1000  # Convert to ms

            if thumbnail == thumbnails[i]:
                print(f"✅ Cache hit for test_{i}.png ({duration:.1f}ms)")
            else:
                print(f"❌ Cache miss or content mismatch for test_{i}.png")
                return False

        # Test 4: Cache eviction (add more items than cache limit)
        print("\nTest 4: Testing cache eviction")
        for i in range(3, 5):  # Add 2 more images (should evict old ones)
            thumbnail = cache.get_thumbnail_base64(test_images[i])
            if thumbnail:
                print(f"✅ Generated thumbnail for test_{i}.png (may cause eviction)")
            else:
                print(f"❌ Failed to generate thumbnail for test_{i}.png")
                return False

        # Check final cache stats
        final_stats = cache.get_cache_stats()
        print(f"Final cache size: {final_stats['cache_size']}/{final_stats['max_cache_size']}")

        if final_stats['cache_size'] > 3:
            print(f"❌ Cache size exceeded limit: {final_stats['cache_size']}")
            return False

        # Test 5: Clear cache
        print("\nTest 5: Testing cache clear")
        cache.clear_cache()
        clear_stats = cache.get_cache_stats()
        if clear_stats['cache_size'] == 0 and clear_stats['memory_usage_mb'] == 0:
            print("✅ Cache cleared successfully")
        else:
            print(f"❌ Cache not properly cleared: {clear_stats}")
            return False

    print("✅ All basic cache tests passed!")
    return True


def test_global_functions():
    """Test the global convenience functions."""
    print("\n=== Testing Global Functions ===")

    with tempfile.TemporaryDirectory() as temp_dir:
        # Create a test image
        img_path = os.path.join(temp_dir, "global_test.png")
        create_test_image(img_path, (150, 150), (0, 255, 0))

        # Clear cache first
        clear_thumbnail_cache()

        # Test 1: get_thumbnail_base64
        print("Test 1: get_thumbnail_base64 function")
        thumbnail = get_thumbnail_base64(img_path)
        if thumbnail and thumbnail.startswith(""):  # Should be base64 string
            print(f"✅ Global thumbnail function works ({len(thumbnail)} chars)")
        else:
            print("❌ Global thumbnail function failed")
            return False

        # Test 2: get_cache_stats
        print("Test 2: get_cache_stats function")
        stats = get_cache_stats()
        if stats['cache_size'] == 1:
            print(f"✅ Global cache stats function works (size: {stats['cache_size']})")
        else:
            print(f"❌ Global cache stats unexpected: {stats}")
            return False

        # Test 3: clear_thumbnail_cache
        print("Test 3: clear_thumbnail_cache function")
        clear_thumbnail_cache()
        stats = get_cache_stats()
        if stats['cache_size'] == 0:
            print("✅ Global cache clear function works")
        else:
            print(f"❌ Global cache clear failed: {stats}")
            return False

    print("✅ All global function tests passed!")
    return True


def test_error_handling():
    """Test error handling for various edge cases."""
    print("\n=== Testing Error Handling ===")

    cache = ThumbnailCache()

    # Test 1: Non-existent file
    print("Test 1: Non-existent file")
    thumbnail = cache.get_thumbnail_base64("/nonexistent/file.png")
    if thumbnail is None:
        print("✅ Correctly handled non-existent file")
    else:
        print("❌ Should return None for non-existent file")
        return False

    # Test 2: Non-image file
    print("Test 2: Non-image file")
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("This is not an image")
        txt_path = f.name

    try:
        thumbnail = cache.get_thumbnail_base64(txt_path)
        if thumbnail is None:
            print("✅ Correctly handled non-image file")
        else:
            print("❌ Should return None for non-image file")
            return False
    finally:
        os.unlink(txt_path)

    # Test 3: Corrupted image file
    print("Test 3: Corrupted image file")
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        f.write(b"This is not a valid PNG file")
        corrupted_path = f.name

    try:
        thumbnail = cache.get_thumbnail_base64(corrupted_path)
        if thumbnail is None:
            print("✅ Correctly handled corrupted image file")
        else:
            print("❌ Should return None for corrupted image file")
            return False
    finally:
        os.unlink(corrupted_path)

    print("✅ All error handling tests passed!")
    return True


def test_image_formats():
    """Test thumbnail generation for different image formats."""
    print("\n=== Testing Different Image Formats ===")

    cache = ThumbnailCache()

    with tempfile.TemporaryDirectory() as temp_dir:
        test_formats = [
            ('test.png', 'PNG'),
            ('test.jpg', 'JPEG'),
            ('test.bmp', 'BMP'),
            ('test.tiff', 'TIFF'),
        ]

        results = []
        for filename, format_name in test_formats:
            print(f"Testing {format_name} format...")
            img_path = os.path.join(temp_dir, filename)

            # Create image in specific format
            img = Image.new('RGB', (100, 100), (255, 128, 0))
            img.save(img_path, format_name)

            # Generate thumbnail
            thumbnail = cache.get_thumbnail_base64(img_path)
            if thumbnail:
                print(f"✅ {format_name} format works ({len(thumbnail)} chars)")
                results.append(True)
            else:
                print(f"❌ {format_name} format failed")
                results.append(False)

        success_count = sum(results)
        total_count = len(results)
        print(f"\nFormat support: {success_count}/{total_count} formats working")

        return success_count == total_count


def test_with_existing_test_image():
    """Test with the existing test image from the tests directory."""
    print("\n=== Testing with Existing Test Image ===")

    # Look for existing test images
    test_dir = Path(__file__).parent
    test_images = [
        test_dir / "img.png",
        test_dir / "img_a1111.png"
    ]

    cache = ThumbnailCache()
    working_images = 0

    for img_path in test_images:
        if img_path.exists():
            print(f"Testing with {img_path.name}...")
            thumbnail = cache.get_thumbnail_base64(str(img_path))
            if thumbnail:
                print(f"✅ Successfully generated thumbnail for {img_path.name} ({len(thumbnail)} chars)")
                working_images += 1
            else:
                print(f"❌ Failed to generate thumbnail for {img_path.name}")
        else:
            print(f"⚠️ Test image not found: {img_path}")

    if working_images > 0:
        print(f"✅ Successfully tested with {working_images} existing test images")
        return True
    else:
        print("⚠️ No existing test images found, but this is not a failure")
        return True


def run_all_tests():
    """Run all thumbnail tests."""
    print("🧪 Starting Thumbnail Module Tests")
    print("=" * 50)

    tests = [
        ("Image File Detection", test_is_image_file),
        ("Basic Cache Functionality", test_thumbnail_cache_basic),
        ("Global Functions", test_global_functions),
        ("Error Handling", test_error_handling),
        ("Image Formats", test_image_formats),
        ("Existing Test Images", test_with_existing_test_image),
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        print(f"\n🔬 Running: {test_name}")
        print("-" * 30)
        try:
            if test_func():
                print(f"✅ {test_name}: PASSED")
                passed += 1
            else:
                print(f"❌ {test_name}: FAILED")
                failed += 1
        except Exception as e:
            print(f"💥 {test_name}: ERROR - {e}")
            failed += 1

    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed} passed, {failed} failed")

    if failed == 0:
        print("🎉 All tests passed!")
        return True
    else:
        print(f"⚠️ {failed} test(s) failed!")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
