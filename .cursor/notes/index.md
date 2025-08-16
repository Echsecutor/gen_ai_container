# Project Notes Index

## Project Overview

This is a Docker container project for AI/ML tools, specifically focused on InvokeAI and ComfyUI setups with model management capabilities.

## Notes Files

### APIs and External Services

- [`civitai_api.md`](civitai_api.md) - Documentation for Civitai REST API v1 usage, authentication, and endpoints

### Project Structure

- [`repository_structure.md`](repository_structure.md) - Overview of project folder structure and components

### Components

- [`civit_model_loader.md`](civit_model_loader.md) - Complete implementation of Civitai model loader (frontend+backend)
- [`converter.md`](converter.md) - InvokeAI to Automatic1111 metadata conversion functions and testing
- [`script_improvements.md`](script_improvements.md) - Process management and PID tracking enhancements

## Key Components

- **Docker Configurations**: `invoke_ai.Dockerfile`, `comfy.Dockerfile` for containerized AI tools
- **Scripts**: Shell scripts in `/scripts` for running different services
- **Model Loader**: New civit_model_loader component for downloading models from Civitai
- **Converter**: InvokeAI to Automatic1111 metadata conversion utilities with standalone functions
- **Test Volume**: Sample configurations and model storage in `invoke_test_volume/`
