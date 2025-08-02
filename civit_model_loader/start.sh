#!/bin/bash

# Civitai Model Loader Startup Script

# Set default environment variables
export MOUNT_DIR=${MOUNT_DIR:-"./dev_mount_dir"}
export PORT=${PORT:-8080}

# Create models directory if it doesn't exist
mkdir -p "${MOUNT_DIR}/models"

echo "Starting Civitai Model Loader..."
echo "Mount directory: ${MOUNT_DIR}"
echo "Port: ${PORT}"
echo "Models will be saved to: ${MOUNT_DIR}/models"

# Create venv if not already existing
if [ ! -d ".venv" ]; then
    python -m venv .venv
fi

# Start the application
source .venv/bin/activate
pip install -r requirements.txt
python main.py
