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
- [`thumbnail_system.md`](thumbnail_system.md) - Image thumbnail generation with intelligent caching for file listings and interactive gallery UI
- [`script_improvements.md`](script_improvements.md) - Process management and PID tracking enhancements

### Development and Troubleshooting

- [`development_tools.md`](development_tools.md) - Development tools, autopep8 safety configuration, f-string fixing, and troubleshooting guides

### Utility Scripts

- [`sort_script.md`](sort_script.md) - Balanced binary tree algorithm for sorting generated images by metadata keywords

## Key Components

- **Docker Configurations**: `invoke_ai.Dockerfile`, `comfy.Dockerfile` for containerized AI tools
- **Scripts**: Shell scripts in `/scripts` for running different services
- **Model Loader**: New civit_model_loader component for downloading models from Civitai
- **Converter**: InvokeAI to Automatic1111 metadata conversion utilities with standalone functions
- **Development Tools**: `civit_model_loader/scripts/fix_broken_fstrings.py` for autopep8 troubleshooting, safety configuration in development_tools.md
- **Test Volume**: Sample configurations and model storage in `invoke_test_volume/`
