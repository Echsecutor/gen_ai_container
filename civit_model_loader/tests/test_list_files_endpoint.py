"""
Tests for the /api/list-files endpoint.
Tests the endpoint functionality and data models using pytest.
"""

import os
import json
import asyncio
import pytest
from pathlib import Path

from conftest import (
    skip_if_no_models,
    skip_if_no_fastapi,
    create_test_image,
    create_test_text_file,
    MODELS_AVAILABLE
)

if MODELS_AVAILABLE:
    from models import FileInfo, ListFilesResponse

# Try to import optional dependencies
try:
    from thumbnail import clear_thumbnail_cache
    THUMBNAIL_AVAILABLE = True
except ImportError:
    THUMBNAIL_AVAILABLE = False

try:
    from main import list_files
    from fastapi import HTTPException
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False


@skip_if_no_models()
class TestDataModels:
    """Test the FileInfo and ListFilesResponse data models."""

    def test_file_info_with_thumbnail(self):
        """Test FileInfo model with thumbnail."""
        file_info = FileInfo(
            filename="test.png",
            full_path="/workspace/test.png",
            thumbnail="data:image/jpeg;base64,/9j/4AAQ..."
        )

        assert file_info.filename == "test.png"
        assert file_info.full_path == "/workspace/test.png"
        assert file_info.thumbnail == "data:image/jpeg;base64,/9j/4AAQ..."

    def test_file_info_without_thumbnail(self):
        """Test FileInfo model without thumbnail."""
        file_info = FileInfo(
            filename="test.txt",
            full_path="/workspace/test.txt"
        )

        assert file_info.filename == "test.txt"
        assert file_info.full_path == "/workspace/test.txt"
        assert file_info.thumbnail is None

    def test_list_files_response_with_files(self):
        """Test ListFilesResponse model with files."""
        files = [
            FileInfo(filename="file1.png",
                     full_path="/path/file1.png", thumbnail="thumb1"),
            FileInfo(filename="file2.txt", full_path="/path/file2.txt"),
        ]
        response = ListFilesResponse(files=files)

        assert len(response.files) == 2
        assert response.files[0].filename == "file1.png"
        assert response.files[1].filename == "file2.txt"

    def test_list_files_response_empty(self):
        """Test ListFilesResponse model with empty files list."""
        response = ListFilesResponse(files=[])
        assert len(response.files) == 0

    def test_json_serialization(self):
        """Test JSON serialization of data models."""
        files = [
            FileInfo(filename="test.png", full_path="/test.png",
                     thumbnail="base64data"),
            FileInfo(filename="test.txt", full_path="/test.txt"),
        ]
        response = ListFilesResponse(files=files)

        # Convert to dict (Pydantic method - try both old and new versions)
        try:
            response_dict = response.model_dump()  # Pydantic v2
        except AttributeError:
            response_dict = response.dict()  # Pydantic v1

        json_str = json.dumps(response_dict, indent=2)
        parsed = json.loads(json_str)

        assert 'files' in parsed
        assert len(parsed['files']) == 2
        assert parsed['files'][0]['filename'] == 'test.png'
        assert parsed['files'][1]['filename'] == 'test.txt'


@pytest.mark.skipif(not FASTAPI_AVAILABLE, reason="FastAPI not available")
class TestEndpointFunction:
    """Test the list_files endpoint function directly."""

    def setup_method(self):
        """Clear thumbnail cache before each test."""
        if THUMBNAIL_AVAILABLE:
            clear_thumbnail_cache()

    @pytest.mark.asyncio
    async def test_basic_file_listing(self, temp_dir):
        """Test basic file listing functionality."""
        # Create test files
        test_files = []

        # Create images
        for i in range(2):
            img_path = os.path.join(temp_dir, f"image_{i}.png")
            create_test_image(img_path, (100, 100), (i * 80, 100, 200))
            test_files.append(f"image_{i}.png")

        # Create text files
        for i in range(2):
            txt_path = os.path.join(temp_dir, f"document_{i}.txt")
            create_test_text_file(txt_path, f"Content of document {i}")
            test_files.append(f"document_{i}.txt")

        # Call endpoint
        result = await list_files(folder=temp_dir)

        assert isinstance(result, ListFilesResponse)
        assert len(result.files) == 4

        # Verify all files are included
        returned_filenames = sorted([f.filename for f in result.files])
        expected_filenames = sorted(test_files)
        assert returned_filenames == expected_filenames

    @pytest.mark.asyncio
    async def test_thumbnail_generation(self, temp_dir):
        """Test that thumbnails are generated for images only."""
        # Create one image and one text file
        img_path = os.path.join(temp_dir, "test.png")
        create_test_image(img_path, (100, 100), (255, 0, 0))

        txt_path = os.path.join(temp_dir, "test.txt")
        create_test_text_file(txt_path, "Test content")

        result = await list_files(folder=temp_dir)

        # Find image and text file in results
        image_file = next(f for f in result.files if f.filename == "test.png")
        text_file = next(f for f in result.files if f.filename == "test.txt")

        # Image should have thumbnail, text file should not
        if THUMBNAIL_AVAILABLE:
            assert image_file.thumbnail is not None
            assert image_file.thumbnail.startswith('data:image/jpeg;base64,')
        assert text_file.thumbnail is None

    @pytest.mark.asyncio
    async def test_empty_directory(self, temp_dir):
        """Test with empty directory."""
        empty_dir = os.path.join(temp_dir, "empty")
        os.makedirs(empty_dir)

        result = await list_files(folder=empty_dir)

        assert isinstance(result, ListFilesResponse)
        assert len(result.files) == 0

    @pytest.mark.asyncio
    async def test_full_path_construction(self, temp_dir):
        """Test that full paths are correctly constructed."""
        img_path = os.path.join(temp_dir, "test.png")
        create_test_image(img_path, (100, 100), (255, 0, 0))

        result = await list_files(folder=temp_dir)

        assert len(result.files) == 1
        file_info = result.files[0]
        assert file_info.full_path == img_path

    @pytest.mark.asyncio
    async def test_file_sorting(self, temp_dir):
        """Test that files are returned in sorted order."""
        # Create files with names that test sorting
        file_names = ["zebra.txt", "apple.png",
                      "Banana.jpg", "1_number.txt", "beta.png"]
        expected_sorted = sorted(file_names, key=str.lower)

        for name in file_names:
            file_path = os.path.join(temp_dir, name)
            if name.endswith('.txt'):
                create_test_text_file(file_path)
            else:
                create_test_image(file_path)

        result = await list_files(folder=temp_dir)
        returned_names = [f.filename for f in result.files]

        assert returned_names == expected_sorted


@pytest.mark.skipif(not FASTAPI_AVAILABLE, reason="FastAPI not available")
class TestErrorHandling:
    """Test error handling for the endpoint."""

    @pytest.mark.asyncio
    async def test_nonexistent_directory(self):
        """Test handling of non-existent directory."""
        with pytest.raises(HTTPException) as exc_info:
            await list_files(folder="/nonexistent/directory")

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_file_instead_of_directory(self, temp_dir):
        """Test handling when a file path is provided instead of directory."""
        # Create a test file
        test_file = os.path.join(temp_dir, "test.txt")
        create_test_text_file(test_file, "test content")

        with pytest.raises(HTTPException) as exc_info:
            await list_files(folder=test_file)

        assert exc_info.value.status_code == 400


@pytest.mark.integration
class TestIntegration:
    """Integration tests with real files and scenarios."""

    @pytest.mark.asyncio
    async def test_mixed_file_types(self, temp_dir):
        """Test with a realistic mix of file types."""
        # Create various file types
        files = {
            'image.png': lambda: create_test_image(os.path.join(temp_dir, 'image.png')),
            'document.txt': lambda: create_test_text_file(os.path.join(temp_dir, 'document.txt')),
            'config.json': lambda: create_test_text_file(
                os.path.join(temp_dir, 'config.json'),
                '{"test": true}'
            ),
            'data.csv': lambda: create_test_text_file(
                os.path.join(temp_dir, 'data.csv'),
                'col1,col2\nval1,val2'
            ),
        }

        for filename, creator in files.items():
            creator()

        if not FASTAPI_AVAILABLE:
            pytest.skip("FastAPI not available")

        result = await list_files(folder=temp_dir)

        assert len(result.files) == 4

        # Verify only image has thumbnail
        for file_info in result.files:
            if file_info.filename == 'image.png' and THUMBNAIL_AVAILABLE:
                assert file_info.thumbnail is not None
            else:
                assert file_info.thumbnail is None

    @pytest.mark.skipif(not THUMBNAIL_AVAILABLE, reason="Thumbnail module not available")
    @pytest.mark.asyncio
    async def test_thumbnail_caching_behavior(self, temp_dir):
        """Test that thumbnail caching works across multiple calls."""
        if not FASTAPI_AVAILABLE:
            pytest.skip("FastAPI not available")

        img_path = os.path.join(temp_dir, "test.png")
        create_test_image(img_path, (200, 200), (255, 0, 0))

        # First call
        result1 = await list_files(folder=temp_dir)
        thumbnail1 = result1.files[0].thumbnail

        # Second call (should use cache)
        result2 = await list_files(folder=temp_dir)
        thumbnail2 = result2.files[0].thumbnail

        # Thumbnails should be identical (cached)
        assert thumbnail1 == thumbnail2
        assert thumbnail1 is not None
