# Tests for CivitAI Model Loader

## Overview

This directory contains comprehensive tests for the CivitAI Model Loader components using pytest. The tests cover the `/api/list-files` endpoint, thumbnail generation system, converter functionality, and CivitAI API integration.

## Test Structure

### Test Files

- **`test_thumbnail.py`** - Tests for thumbnail generation and caching
- **`test_list_files_endpoint.py`** - Tests for the file listing API endpoint
- **`test_converter.py`** - Tests for InvokeAI to A1111 metadata conversion
- **`test_api.py`** - Tests for CivitAI API integration
- **`test_client.py`** - Tests for the CivitAI client wrapper
- **`conftest.py`** - Shared fixtures and test utilities

### Test Configuration

- **`pytest.ini`** configuration is in `pyproject.toml`
- **Async support** via `pytest-asyncio`
- **Markers** for slow and integration tests
- **Fixtures** for common test data and setup

## Running Tests

### Prerequisites

```bash
pip install -r requirements.txt
```

This installs pytest and all required dependencies.

### Basic Test Execution

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest test_thumbnail.py

# Run specific test class
pytest test_thumbnail.py::TestThumbnailCache

# Run specific test function
pytest test_thumbnail.py::TestThumbnailCache::test_cache_initialization
```

### Test Categories

```bash
# Run only fast tests (exclude slow tests)
pytest -m "not slow"

# Run only integration tests
pytest -m integration

# Run all tests including slow ones
pytest -m "slow or not slow"

# Exclude integration tests
pytest -m "not integration"
```

### Coverage and Reporting

```bash
# Run with coverage (if coverage is installed)
pytest --cov=. --cov-report=html

# Generate detailed test report
pytest --tb=long -v

# Run with timing information
pytest --durations=10
```

## Test Features

### Automatic Skipping

Tests automatically skip when dependencies are not available:

- ✅ **FastAPI tests** skip when FastAPI is not installed
- ✅ **Thumbnail tests** skip when thumbnail module is missing
- ✅ **Model tests** skip when models module is unavailable
- ✅ **Integration tests** skip when API keys are not configured

### Test Fixtures

Shared fixtures in `conftest.py` provide:

- **`temp_dir`** - Clean temporary directory for each test
- **`test_image_path`** - Pre-created test image file
- **`multiple_test_images`** - Collection of test images in different formats
- **`thumbnail_cache`** - Configured thumbnail cache instance
- **`existing_test_images`** - Paths to real test images in the repository
- **`civitai_api_key`** - API key for integration tests

### Test Organization

Tests are organized into logical classes:

```python
class TestImageFileDetection:     # Image format detection
class TestThumbnailCache:         # Cache functionality
class TestErrorHandling:          # Error scenarios
class TestIntegration:            # End-to-end workflows
```

## Test Coverage

### Thumbnail System

✅ **Image format detection** - File extension validation  
✅ **Cache management** - LRU eviction, memory limits, statistics  
✅ **Thumbnail generation** - Image processing, base64 encoding  
✅ **Error handling** - Invalid files, corrupted images, permissions  
✅ **Performance** - Cache efficiency, generation speed

### List Files Endpoint

✅ **Data models** - Pydantic model validation and serialization  
✅ **Endpoint logic** - File listing, filtering, thumbnail integration  
✅ **Sorting** - Alphabetical case-insensitive file ordering  
✅ **Path handling** - Security, validation, full path construction  
✅ **Error responses** - Missing directories, invalid paths

### Converter Functionality

✅ **Image conversion** - InvokeAI to A1111 metadata conversion  
✅ **Error handling** - Missing files, invalid metadata, permissions  
✅ **Configuration** - Custom model paths and caching  
✅ **Integration** - End-to-end conversion with real test images

### API Integration

✅ **CivitAI API** - Authentication, parameter validation, response handling  
✅ **Client wrapper** - Search functionality, model type filtering  
✅ **Error handling** - Network errors, invalid parameters, rate limits  
✅ **Pagination** - Multi-page result handling

## Configuration

### API Keys

For integration tests, create `test_config.py`:

```python
CIVITAI_API_KEY = "your_actual_api_key_here"
```

**Note:** This file is gitignored. Tests will use a placeholder if not found.

### Test Images

Some tests use existing images in the tests directory:

- `img.png` - InvokeAI format test image
- `img_a1111.png` - A1111 format expected output

These are optional - tests will skip if not found.

## Development Workflow

### Running Tests During Development

```bash
# Quick smoke test
pytest test_thumbnail.py::TestImageFileDetection -v

# Test specific functionality
pytest -k "cache" -v

# Full test suite
pytest

# Watch mode (with pytest-watch if installed)
ptw
```

### Adding New Tests

1. **Follow naming conventions**: `test_*.py`, `Test*` classes, `test_*` functions
2. **Use appropriate fixtures** from `conftest.py`
3. **Add skip decorators** for optional dependencies
4. **Include docstrings** describing test purpose
5. **Use parametrize** for testing multiple inputs

Example:

```python
@skip_if_no_thumbnail()
class TestNewFeature:
    """Test new thumbnail feature."""

    @pytest.mark.parametrize("input,expected", [
        ("test.jpg", True),
        ("test.txt", False),
    ])
    def test_feature(self, input, expected):
        """Test feature with various inputs."""
        assert new_feature(input) == expected
```

### Debugging Tests

```bash
# Run with Python debugger
pytest --pdb

# Print output (disable capture)
pytest -s

# Run single test with full output
pytest test_file.py::test_name -s -v

# Show local variables on failure
pytest --tb=long --locals
```

## Performance Considerations

- **Integration tests** are marked as `@pytest.mark.integration`
- **Slow tests** are marked as `@pytest.mark.slow`
- **Network timeouts** are configured for API tests
- **Test isolation** prevents cross-test contamination
- **Resource cleanup** via fixtures ensures no leftover files

## Continuous Integration

Tests are designed to work in CI environments:

- **No external dependencies** required for core functionality
- **Graceful degradation** when optional modules are missing
- **Timeout handling** for network operations
- **Deterministic behavior** with proper test isolation
- **Clear skip messages** for missing prerequisites

## Future Enhancements

The test framework can be extended with:

- **Property-based testing** using hypothesis
- **Load testing** for API endpoints
- **Security testing** for path traversal and injection
- **Browser testing** for frontend components
- **Performance benchmarking** and regression detection
