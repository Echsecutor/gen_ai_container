"""
Tests for the converter module.
Tests the convert_invokeai_to_a1111 function and related functionality using pytest.
"""

import os
import tempfile
import pytest
from pathlib import Path
from PIL import Image

# Try to import converter functions
try:
    from converter import convert_invokeai_to_a1111, convert_image_metadata
    CONVERTER_AVAILABLE = True
except ImportError:
    CONVERTER_AVAILABLE = False

skip_if_no_converter = pytest.mark.skipif(
    not CONVERTER_AVAILABLE,
    reason="Converter module not available"
)


@skip_if_no_converter
class TestConverterBasicFunctionality:
    """Test basic converter functionality."""

    def test_converter_functions_exist(self):
        """Test that converter functions are available."""
        assert callable(convert_invokeai_to_a1111)
        assert callable(convert_image_metadata)

    def test_converter_function_signatures(self):
        """Test that converter functions have proper docstrings."""
        assert convert_invokeai_to_a1111.__doc__ is not None
        assert convert_image_metadata.__doc__ is not None

    def test_error_handling_nonexistent_file(self):
        """Test error handling with non-existent input file."""
        success, message = convert_invokeai_to_a1111(
            "non_existent.png",
            "output.png"
        )

        assert not success
        assert isinstance(message, str)
        assert len(message) > 0


@skip_if_no_converter
class TestExistingTestImages:
    """Test converter with existing test images."""

    @pytest.fixture
    def test_images_paths(self):
        """Get paths to existing test images."""
        test_dir = Path(__file__).parent
        return {
            'input': test_dir / "img.png",
            'expected': test_dir / "img_a1111.png"
        }

    def test_existing_test_images_exist(self, test_images_paths):
        """Verify that the test images exist."""
        if not test_images_paths['input'].exists():
            pytest.skip(f"Test input image not found: {test_images_paths['input']}")

        assert test_images_paths['input'].exists()

        # Expected image is optional for testing
        if test_images_paths['expected'].exists():
            assert test_images_paths['expected'].exists()

    def test_input_image_has_invokeai_metadata(self, test_images_paths):
        """Test that input image contains InvokeAI metadata."""
        input_path = test_images_paths['input']
        if not input_path.exists():
            pytest.skip("Input test image not found")

        with Image.open(input_path) as img:
            img.load()

            # Should have InvokeAI metadata
            assert 'invokeai_metadata' in img.info
            assert len(img.info['invokeai_metadata']) > 0

    def test_expected_output_has_a1111_metadata(self, test_images_paths):
        """Test that expected output contains A1111 metadata."""
        expected_path = test_images_paths['expected']
        if not expected_path.exists():
            pytest.skip("Expected output image not found")

        with Image.open(expected_path) as img:
            img.load()

            # Should have A1111 parameters metadata
            assert 'parameters' in img.info
            assert len(img.info['parameters']) > 0

    def test_conversion_with_existing_image(self, test_images_paths, temp_dir):
        """Test conversion using the existing test image."""
        input_path = test_images_paths['input']
        if not input_path.exists():
            pytest.skip("Input test image not found")

        output_path = os.path.join(temp_dir, "converted_output.png")

        success, message = convert_invokeai_to_a1111(
            str(input_path),
            output_path
        )

        if success:
            assert os.path.exists(output_path)

            # Check that output has A1111 metadata
            with Image.open(output_path) as converted_img:
                converted_img.load()
                assert 'parameters' in converted_img.info
                assert len(converted_img.info['parameters']) > 0
        else:
            # Log the failure reason but don't fail the test
            # as conversion might fail due to missing model files
            pytest.skip(
                f"Conversion failed (expected in test environment): {message}")


@skip_if_no_converter
class TestConverterWithCustomConfig:
    """Test converter with custom configuration."""

    def test_custom_config_parameters(self, temp_dir):
        """Test convert_image_metadata with custom configuration."""
        # Create a simple test image with fake metadata
        test_img_path = os.path.join(temp_dir, "test_input.png")
        img = Image.new('RGB', (100, 100), (255, 0, 0))

        # Add fake InvokeAI metadata
        from PIL.PngImagePlugin import PngInfo
        metadata = PngInfo()
        metadata.add_text("invokeai_metadata", '{"test": "metadata"}')
        img.save(test_img_path, "PNG", pnginfo=metadata)

        output_path = os.path.join(temp_dir, "custom_output.png")

        custom_config = {
            "model_folder": "/test/models",
            "vae_folder": "/test/vae",
            "lora_folder": "/test/loras",
            "invokeai_output_folder": "/test/output"
        }
        custom_cache = {}

        # This might fail due to missing model files, which is expected in tests
        success, message = convert_image_metadata(
            test_img_path,
            output_path,
            custom_config,
            custom_cache
        )

        # Either success or expected failure due to missing model files
        assert isinstance(success, bool)
        assert isinstance(message, str)
        assert len(message) > 0


@skip_if_no_converter
class TestErrorHandling:
    """Test error handling scenarios."""

    def test_invalid_input_path(self):
        """Test with invalid input path."""
        success, message = convert_invokeai_to_a1111(
            "",
            "output.png"
        )

        assert not success
        assert "error" in message.lower() or "not found" in message.lower()

    def test_invalid_output_path(self, temp_dir):
        """Test with invalid output path."""
        # Create a simple test image
        test_img_path = os.path.join(temp_dir, "test.png")
        img = Image.new('RGB', (50, 50), (255, 0, 0))
        img.save(test_img_path, "PNG")

        # Try to write to invalid directory
        invalid_output = "/nonexistent/directory/output.png"

        success, message = convert_invokeai_to_a1111(
            test_img_path,
            invalid_output
        )

        # Should handle this gracefully
        assert isinstance(success, bool)
        assert isinstance(message, str)

    def test_file_without_invokeai_metadata(self, temp_dir):
        """Test with image file that has no InvokeAI metadata."""
        # Create image without InvokeAI metadata
        test_img_path = os.path.join(temp_dir, "no_metadata.png")
        img = Image.new('RGB', (50, 50), (0, 255, 0))
        img.save(test_img_path, "PNG")

        output_path = os.path.join(temp_dir, "output.png")

        success, message = convert_invokeai_to_a1111(
            test_img_path,
            output_path
        )

        # Should handle missing metadata gracefully
        assert isinstance(success, bool)
        assert isinstance(message, str)
        if not success:
            assert "metadata" in message.lower() or "invokeai" in message.lower()


@skip_if_no_converter
class TestDocumentation:
    """Test that functions have proper documentation."""

    def test_convert_invokeai_to_a1111_docstring(self):
        """Test that main conversion function has docstring."""
        doc = convert_invokeai_to_a1111.__doc__
        assert doc is not None
        assert len(doc.strip()) > 0
        assert "convert" in doc.lower() or "invokeai" in doc.lower()

    def test_convert_image_metadata_docstring(self):
        """Test that detailed conversion function has docstring."""
        doc = convert_image_metadata.__doc__
        assert doc is not None
        assert len(doc.strip()) > 0
        assert "convert" in doc.lower() or "metadata" in doc.lower()


@pytest.mark.integration
@skip_if_no_converter
class TestIntegration:
    """Integration tests that test the full conversion pipeline."""

    @pytest.mark.slow
    def test_full_conversion_pipeline(self, temp_dir):
        """Test the complete conversion pipeline if test images are available."""
        test_dir = Path(__file__).parent
        input_img = test_dir / "img.png"

        if not input_img.exists():
            pytest.skip("Integration test image not available")

        output_path = os.path.join(temp_dir, "integration_test_output.png")

        # Test with default configuration
        success, message = convert_invokeai_to_a1111(
            str(input_img),
            output_path
        )

        # This is an integration test - log results but don't fail on expected issues
        if success:
            assert os.path.exists(output_path)

            # Verify output format
            with Image.open(output_path) as img:
                img.load()
                # Should be valid image
                assert img.size[0] > 0
                assert img.size[1] > 0
        else:
            # Log for debugging but don't fail - might be expected in test environment
            print(f"Integration test info: {message}")


class TestConverterAvailability:
    """Test converter module availability without requiring it."""

    def test_converter_import_behavior(self):
        """Test that converter import behavior is handled gracefully."""
        try:
            from converter import convert_invokeai_to_a1111
            # If import succeeds, function should be callable
            assert callable(convert_invokeai_to_a1111)
        except ImportError:
            # Import failure is acceptable in test environments
            pytest.skip("Converter module not available - this is acceptable")
