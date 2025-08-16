# Civitai AI Model Loader

This is a Python backend with a web frontend that uses the Civitai API v1 (see https://developer.civitai.com/docs/api/public-rest) to discover and download models from Civitai. Models are stored under `${MOUNT_DIR}/models` by the backend, using the env variable MOUNT_DIR (default `/workspace`). Models can then be discovered there by tools like InvokeAI.

## Features

The model loader frontend allows the user to:

- Provide Civitai API token (stored in browser storage, auto-filled next time)
- Search for models on Civitai and add them to a download queue
- Remember all downloaded models in browser local storage
- Re-download models that may have vanished from the backend after pod restart
- Export the list of models and API token (all browser local information) as a JSON file
- Import previously exported configurations

The backend takes care of actually downloading the model files using the API token and model ID provided by the frontend and the corresponding Civitai endpoint. It exposes status information about running/completed downloads to be shown in the frontend.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start the service
docker-compose up -d

# Access the web interface
open http://localhost:8080
```

### Using Docker

```bash
# Build the image
docker build -t civit-model-loader .

# Run the container
docker run -p 8080:8080 -v ./models:/workspace/models civit-model-loader
```

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
./start.sh
# or
python main.py
```

## Configuration

- **MOUNT_DIR**: Directory where models are stored (default: `/workspace`)
- **PORT**: Service port (default: `8080`)

## API Endpoints

- `GET /` - Web frontend
- `POST /api/search` - Search models
- `POST /api/download` - Start download
- `GET /api/downloads` - Get download status
- `GET /api/health` - Health check

## Getting Your API Token

1. Visit [Civitai Account Settings](https://civitai.com/user/account)
2. Generate an API token
3. Enter it in the web interface

## Metadata Converter

This project includes a metadata conversion utility (`converter.py`) that converts InvokeAI generated image metadata to Automatic1111 format for easy upload to Civitai. The converter is originally based on the work from [kraussian/invoke-civitai](https://github.com/kraussian/invoke-civitai) and has been enhanced with:

- Standalone function APIs for programmatic use
- Comprehensive test suite with real test images
- Improved error handling and validation
- Code deduplication and refactoring

The converter supports all metadata types including base parameters, model hashes, VAE, LoRA, and inpainting scenarios. See the `converter.py` file for usage examples and API documentation.
