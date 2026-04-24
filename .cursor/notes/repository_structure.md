# Repository Structure

## Project Overview

Docker container project for AI/ML tools, specifically InvokeAI and ComfyUI with model management capabilities.

## Core Structure

### Docker Components

- `invoke_ai.Dockerfile` - InvokeAI container definition
- `comfy.Dockerfile` - ComfyUI container. Base image: `ghcr.io/radiatingreverberations/comfyui-extensions:latest` (ComfyUI at `/comfyui`, venv at `/opt/venv`, includes xFormers, FlashAttention-2, SageAttention2++, Nunchaku, ComfyUI-Manager). Only adds apt packages (ffmpeg, sudo, wget, build-essential), civit_model_loader, and the volume symlink setup.
- `comfy/comfy_entrypoint.sh` - ComfyUI startup script. Clones custom nodes, downloads video generation models (WAN 2.2, LTX-2.3, SkyReels V3), runs civit_model_loader, then launches ComfyUI.
- `comfy/extra_model_paths.yaml` - ComfyUI model directory configuration. Sets `/workspace/models` as the default `is_default` path so ComfyUI Manager downloads and lookups persist in the host-mounted volume.

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

- Host volume mounted at `/workspace` inside the container.
- The Dockerfile symlinks `/comfyui/models`, `/comfyui/output`, `/comfyui/custom_nodes`, and `/comfyui/user` into `/workspace` so all persistent data lives on the host mount.
- `extra_model_paths.yaml` explicitly configures `/workspace/models` as the default model base path with `is_default: true`, ensuring ComfyUI Manager downloads and model lookups always target the mounted folder.
- Models, databases, outputs, configurations all in this volume.
- Ensures data persistence across container restarts.

## Custom Nodes & Model Formats

- Cloned custom nodes include: ComfyUI-Manager, KJNodes, rgthree-comfy, wanBlockswap, VideoHelperSuite, comfyui-various, mxToolkit, Frame-Interpolation, Custom-Scripts, MediaMixer, GGUF, was-node-suite, LTXVideo, WanVideoWrapper, ComfyUI-essentials.
- **Removed nodes**: `ComfyUI-SimpleMath` (empty repository, missing `__init__.py`) and `ComfyUI-FluxTrainer` (training-focused, causes 11s import failure).
- **LTX-2.3 model mismatch**: Kijai's separated fp8 checkpoint format (`diffusion_models/`, `clip/`, `text_encoders/`) is used because it is smaller (~23.5 GB transformer + ~13 GB text encoder vs ~46 GB official unified checkpoint). The official ComfyUI-LTXVideo example workflows expect the unified `checkpoints/` format, so they are **not** copied into the workflow library to avoid persistent "Missing Models" warnings. Users can still run LTX-2.3 via native ComfyUI nodes with the downloaded split models.

## Services & Ports

- **InvokeAI**: Port 8080 (no login)
- **ComfyUI**: Port 8080
- **SSH**: Port 22 for file transfers
- **Model Loader**: Port 8081 (configurable via CIVIT_MODEL_LOADER_PORT)
