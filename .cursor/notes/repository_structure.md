# Repository Structure

## Project Overview

Docker container project for AI/ML tools, specifically InvokeAI and ComfyUI with model management capabilities.

## Core Structure

### Docker Components

- `invoke_ai.Dockerfile` - InvokeAI container definition
- `comfy.Dockerfile` - ComfyUI container definition
- `comfy_entrypoint.sh` - ComfyUI startup script

### Scripts (`/scripts`)

- `install_invoke_ai.sh` - InvokeAI installation script
- `run_invoke_ai` - Local InvokeAI runner script
- `run_comfy` - Local ComfyUI runner script
- `run_image` - Generic image runner script

### Model Loader (`/civit_model_loader`)

**NEW COMPONENT** - Frontend + backend for downloading models from Civitai

- Web frontend for model discovery and queue management
- Python backend for API interaction and file download
- Uses Civitai API v1 for model search and download
- Models stored in `${MOUNT_DIR}/models` (default `/workspace`)

### Test/Sample Data (`/invoke_test_volume`)

- Sample configurations for different AI model types
- Database backups and working databases
- Model storage structure examples
- Output directories for generated content

### Configuration Files

- `run_invoke_ai_web.sh` - Web service startup with PID tracking and signal forwarding
- `invokeai.yaml` - InvokeAI configuration example
- Various model config files in `configs/` subdirectories

## Volume Mounting

- Everything persistent mounted under `/workspace`
- Models, databases, outputs, configurations all in this volume
- Ensures data persistence across container restarts

## Services & Ports

- **InvokeAI**: Port 8080 (no login)
- **ComfyUI**: Port 8080
- **SSH**: Port 22 for file transfers
- **Model Loader**: Port 8081 (configurable via CIVIT_MODEL_LOADER_PORT)
