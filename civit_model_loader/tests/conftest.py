"""
Pytest configuration and shared fixtures for all test modules.
"""

import os
import sys
import tempfile
import pytest
from pathlib import Path
from PIL import Image

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Optional imports for modules that may not be available
try:
    from thumbnail import clear_thumbnail_cache, ThumbnailCache
    THUMBNAIL_AVAILABLE = True
except ImportError:
    THUMBNAIL_AVAILABLE = False

try:
    from models import FileInfo, ListFilesResponse
    MODELS_AVAILABLE = True
except ImportError:
    MODELS_AVAILABLE = False

try:
    from test_config import CIVITAI_API_KEY
except ImportError:
    CIVITAI_API_KEY = "test_api_key_placeholder"


@pytest.fixture
def temp_dir():
    """Create a temporary directory for test files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def test_image_path(temp_dir):
    """Create a test image and return its path."""
    img_path = os.path.join(temp_dir, "test_image.png")
    create_test_image(img_path, (200, 200), (255, 0, 0))
    return img_path


@pytest.fixture
def multiple_test_images(temp_dir):
    """Create multiple test images with different formats."""
    images = {}

    # PNG image
    png_path = os.path.join(temp_dir, "test.png")
    create_test_image(png_path, (100, 100), (255, 0, 0))
    images['png'] = png_path

    # JPEG image
    jpg_path = os.path.join(temp_dir, "test.jpg")
    img = Image.new('RGB', (100, 100), (0, 255, 0))
    img.save(jpg_path, 'JPEG')
    images['jpg'] = jpg_path

    # Text file (non-image)
    txt_path = os.path.join(temp_dir, "test.txt")
    with open(txt_path, 'w') as f:
        f.write("This is a test file")
    images['txt'] = txt_path

    return images


@pytest.fixture
def thumbnail_cache():
    """Create a test thumbnail cache with small limits."""
    if THUMBNAIL_AVAILABLE:
        cache = ThumbnailCache(
            max_cache_size=3,
            max_memory_mb=5,
            thumbnail_size=(50, 50)
        )
        # Clear any existing cache
        clear_thumbnail_cache()
        yield cache
        # Clean up after test
        cache.clear_cache()
    else:
        pytest.skip("Thumbnail module not available")


@pytest.fixture
def existing_test_images():
    """Get paths to existing test images in the tests directory."""
    test_dir = Path(__file__).parent
    images = {}

    img_png = test_dir / "img.png"
    if img_png.exists():
        images['img'] = str(img_png)

    img_a1111 = test_dir / "img_a1111.png"
    if img_a1111.exists():
        images['img_a1111'] = str(img_a1111)

    return images


@pytest.fixture
def civitai_api_key():
    """Get the CivitAI API key for testing."""
    return CIVITAI_API_KEY


# Utility functions
def create_test_image(path, size=(200, 200), color=(255, 0, 0)):
    """Create a test image with specified dimensions and color."""
    img = Image.new('RGB', size, color)
    img.save(path, 'PNG')
    return path


def create_test_text_file(path, content="Test file content"):
    """Create a test text file."""
    with open(path, 'w') as f:
        f.write(content)
    return path


# Skip markers for conditional testing
def skip_if_no_fastapi():
    """Skip test if FastAPI is not available."""
    try:
        import fastapi
        return False
    except ImportError:
        return pytest.mark.skip(reason="FastAPI not available")


def skip_if_no_thumbnail():
    """Skip test if thumbnail module is not available."""
    return pytest.mark.skipif(not THUMBNAIL_AVAILABLE, reason="Thumbnail module not available")


def skip_if_no_models():
    """Skip test if models module is not available."""
    return pytest.mark.skipif(not MODELS_AVAILABLE, reason="Models module not available")


# Test data constants
SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png',
                           '.bmp', '.tiff', '.tif', '.webp', '.gif']
NON_IMAGE_FORMATS = ['.txt', '.pdf', '.doc', '.mp4', '.zip']

# File detection test cases
IMAGE_FILE_TEST_CASES = [
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
