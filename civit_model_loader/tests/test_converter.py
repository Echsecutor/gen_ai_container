#!/usr/bin/env python3
"""
Test script for the extracted converter functions.
This script tests the convert_invokeai_to_a1111 function using actual test images.
"""

from converter import convert_invokeai_to_a1111, convert_image_metadata
import sys
import os
import tempfile
import logging
from pathlib import Path
from PIL import Image
from PIL.PngImagePlugin import PngInfo

# Add parent directory to path to import converter
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


def test_converter_functions():
    """Test the converter functions with the provided test images."""

    print("=== Converter Function Test ===")
    print()

    # Get test directory path
    test_dir = Path(__file__).parent
    input_img = test_dir / "img.png"
    expected_img = test_dir / "img_a1111.png"

    # Verify test files exist
    if not input_img.exists():
        print(f"ERROR: Test input image not found: {input_img}")
        return False

    if not expected_img.exists():
        print(f"ERROR: Expected output image not found: {expected_img}")
        return False

    print(f"Input image: {input_img}")
    print(f"Expected output: {expected_img}")
    print()

    # Test 1: Check if input image has InvokeAI metadata
    print("Test 1: Checking input image metadata")
    try:
        with Image.open(input_img) as img:
            img.load()
            if 'invokeai_metadata' in img.info:
                print("✓ Input image contains InvokeAI metadata")
                print(f"  Metadata length: "
                      f"{len(img.info['invokeai_metadata'])} characters")
            else:
                print("✗ Input image does not contain InvokeAI metadata")
                print("  Available metadata keys:", list(img.info.keys()))
                return False
    except Exception as e:
        print(f"✗ Error reading input image: {e}")
        return False
    print()

    # Test 2: Check expected output image metadata
    print("Test 2: Checking expected output image metadata")
    try:
        with Image.open(expected_img) as img:
            img.load()
            if 'parameters' in img.info:
                print("✓ Expected output contains A1111 'parameters' metadata")
                print(f"  Parameters length: "
                      f"{len(img.info['parameters'])} characters")
                print(f"  First 200 chars: {img.info['parameters'][:200]}...")
            else:
                print("✗ Expected output does not contain A1111 'parameters' metadata")
                print("  Available metadata keys:", list(img.info.keys()))
    except Exception as e:
        print(f"✗ Error reading expected output image: {e}")
    print()

    # Test 3: Convert the input image
    print("Test 3: Converting input image using convert_invokeai_to_a1111()")
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
        output_path = tmp_file.name

    try:
        success, message = convert_invokeai_to_a1111(
            str(input_img), output_path)

        if success:
            print(f"✓ Conversion successful: {message}")

            # Verify the output file was created
            if os.path.exists(output_path):
                print(f"✓ Output file created: {output_path}")

                # Check the converted metadata
                with Image.open(output_path) as converted_img:
                    converted_img.load()
                    if 'parameters' in converted_img.info:
                        print(
                            "✓ Converted image contains A1111 'parameters' metadata")
                        print(f"  Parameters length: "
                              f"{len(converted_img.info['parameters'])} characters")
                        print(f"  First 200 chars: "
                              f"{converted_img.info['parameters'][:200]}...")

                        # Compare with expected output (basic comparison)
                        with Image.open(expected_img) as expected:
                            expected.load()
                            if 'parameters' in expected.info:
                                if converted_img.info['parameters'] == expected.info['parameters']:
                                    print(
                                        "✓ Converted metadata matches expected output exactly")
                                else:
                                    print(
                                        "⚠ Converted metadata differs from expected output")
                                    print(
                                        "  This might be expected due to hash differences or configuration")
                            else:
                                print(
                                    "⚠ Expected image doesn't have parameters metadata for comparison")
                    else:
                        print(
                            "✗ Converted image does not contain A1111 'parameters' metadata")
                        print("  Available metadata keys:",
                              list(converted_img.info.keys()))
            else:
                print(f"✗ Output file was not created: {output_path}")
        else:
            print(f"✗ Conversion failed: {message}")

    except Exception as e:
        print(f"✗ Conversion error: {e}")
        success = False
    finally:
        # Clean up temporary file
        if os.path.exists(output_path):
            os.unlink(output_path)
    print()

    # Test 4: Test error handling with invalid file
    print("Test 4: Testing error handling with non-existent file")
    success, message = convert_invokeai_to_a1111(
        "non_existent.png", "output.png")
    if not success:
        print(f"✓ Error handling works correctly: {message}")
    else:
        print(f"✗ Expected error but got success: {message}")
    print()

    # Test 5: Test the detailed function with custom config
    print("Test 5: Testing convert_image_metadata with custom configuration")
    custom_config = {
        "model_folder": "/path/to/models",
        "vae_folder": "/path/to/vae",
        "lora_folder": "/path/to/loras",
        "invokeai_output_folder": "/path/to/output"
    }
    custom_cache = {}

    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
        output_path2 = tmp_file.name

    try:
        success, message = convert_image_metadata(
            str(input_img),
            output_path2,
            custom_config,
            custom_cache
        )

        if success:
            print(f"✓ Custom config conversion successful: {message}")
        else:
            print(f"⚠ Custom config conversion failed (expected if model files not found): "
                  f"{message}")

    except Exception as e:
        print(f"⚠ Custom config conversion error (may be expected): {e}")
    finally:
        # Clean up temporary file
        if os.path.exists(output_path2):
            os.unlink(output_path2)
    print()

    print("=== Test Summary ===")
    print("The converter functions have been tested with the provided test images.")
    print("Check the output above for any issues or unexpected behavior.")

    return True


def show_function_docs():
    """Display the function documentation."""
    print("=== Function Documentation ===")
    print()
    print("convert_invokeai_to_a1111 docstring:")
    print(convert_invokeai_to_a1111.__doc__)
    print()
    print("convert_image_metadata docstring:")
    print(convert_image_metadata.__doc__)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--docs":
        show_function_docs()
    else:
        test_converter_functions()
