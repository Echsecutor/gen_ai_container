# Converter Module

## Overview

The `civit_model_loader/converter.py` module provides functionality to convert InvokeAI generated image metadata to Automatic1111 format, enabling easy upload to Civitai and other platforms that expect A1111 metadata format.

## Architecture

### Original Command-Line Tool

- **Main Function**: `main()` - Processes multiple files via command-line arguments
- **Configuration**: Loads `invokeai_cfg.json` and `hash_cache.json` from working directory
- **Batch Processing**: Handles multiple input files with success/failure tracking

### Extracted Standalone Functions

#### `convert_image_metadata(input_file, output_file, invokeai_cfg, hash_cache)`

**Purpose**: Core conversion logic extracted for programmatic use

**Parameters**:

- `input_file` (str): Path to InvokeAI PNG file
- `output_file` (str): Path for converted output file
- `invokeai_cfg` (dict, optional): Configuration with model folder paths
- `hash_cache` (dict, optional): Cache for previously calculated model hashes

**Returns**: `(success: bool, message: str)` tuple

**Features**:

- Handles all metadata types: base parameters, model hashes, VAE, LoRA
- Supports inpainting image metadata resolution
- Comprehensive error handling with specific error messages
- Model hash calculation and caching functionality

#### `convert_invokeai_to_a1111(input_file, output_file)`

**Purpose**: Simplified wrapper function for easy usage

**Parameters**:

- `input_file` (str): Path to InvokeAI PNG file
- `output_file` (str): Path for converted output file

**Returns**: `(success: bool, message: str)` tuple

**Features**:

- Automatically loads configuration from `invokeai_cfg.json`
- Automatically loads hash cache from `hash_cache.json`
- Graceful fallback when config files are missing
- Simple two-parameter interface for common use cases

## Metadata Conversion Process

### Input: InvokeAI Metadata

- Stored in PNG `invokeai_metadata` field as JSON
- Contains: prompts, model info, generation parameters, LoRA details

### Output: Automatic1111 Metadata

- Stored in PNG `parameters` field as formatted text
- Format: `prompt, negative_prompt, parameter: value, parameter: value...`

### Conversion Steps

1. **Load and Validate**: Read PNG file and extract InvokeAI metadata JSON
2. **Inpainting Check**: Handle canvas objects by loading original image metadata
3. **Base Parameters**: Convert prompts, steps, sampler, CFG, seed, dimensions
4. **Model Hash**: Extract or calculate model file hash (10-character SHA256 prefix)
5. **VAE Processing**: Add VAE model name and hash if present
6. **LoRA Processing**: Process multiple LoRA models with weights and hashes
7. **Assembly**: Combine all parameters into A1111 format string
8. **Save**: Write converted metadata to output PNG file

## Configuration

### `invokeai_cfg.json` Format

```json
{
  "model_folder": "/path/to/models",
  "vae_folder": "/path/to/vae",
  "lora_folder": "/path/to/loras",
  "invokeai_output_folder": "/path/to/output"
}
```

### `hash_cache.json` Format

```json
{
  "model_name.safetensors": "abc1234567",
  "vae_name.safetensors": "def8901234"
}
```

## Testing

### Test Suite: `tests/test_converter.py`

**Test Images**:

- `tests/img.png`: InvokeAI generated test image with metadata
- `tests/img_a1111.png`: Expected A1111 format output

**Test Cases**:

1. **Metadata Validation**: Verify input contains InvokeAI metadata
2. **Expected Output Check**: Verify reference output has A1111 parameters
3. **Conversion Test**: Convert input and compare with expected output
4. **Error Handling**: Test with non-existent files
5. **Custom Configuration**: Test with custom config dictionaries

**Usage**:

```bash
cd civit_model_loader
python tests/test_converter.py        # Run full test suite
python tests/test_converter.py --docs # Show function documentation
```

## Usage Examples

### Simple Conversion

```python
from converter import convert_invokeai_to_a1111

success, message = convert_invokeai_to_a1111("input.png", "output_a1111.png")
if success:
    print(f"Success: {message}")
else:
    print(f"Error: {message}")
```

### Advanced Usage with Custom Config

```python
from converter import convert_image_metadata

config = {
    "model_folder": "/custom/models",
    "vae_folder": "/custom/vae"
}
cache = {}

success, message = convert_image_metadata("input.png", "output.png", config, cache)
```

## Key Features

- **Import Ready**: Functions can be imported and used in other Python scripts
- **Error Handling**: All functions return success/failure with descriptive messages
- **Flexible Configuration**: Works with or without configuration files
- **Hash Caching**: Avoids recalculating expensive model hashes
- **Backward Compatible**: Original CLI functionality preserved
- **Comprehensive Testing**: Validated against real test images

## Implementation Notes

- **Sampler Mapping**: Contains lookup table for InvokeAI to A1111 sampler name conversion
- **Hash Calculation**: Uses same SHA256 algorithm as Automatic1111 for compatibility
- **Error Recovery**: Graceful handling of missing model files, invalid metadata, config issues
- **Memory Management**: Proper cleanup of loaded images to prevent memory leaks
