#!/bin/bash

set +x
set -e

LOG_FILE=$HOME/logs

# Array to store PIDs of background processes
PIDS=()

# Function to cleanup child processes
cleanup() {
    echo "Received signal, cleaning up child processes..."
    for pid in "${PIDS[@]}"; do
        echo "Killing process $pid"
        kill "$pid" 2>/dev/null || true
    done
    # Wait a moment for graceful shutdown
    sleep 2
    exit 0
}

# Set up signal traps to forward signals to child processes
trap cleanup SIGTERM SIGINT SIGQUIT

echo "Running web interface for InvokeAI in ${INVOKE_AI_DIR}"
nohup invokeai-web --root "${INVOKE_AI_DIR}" >>"${LOG_FILE}" 2>&1 &
INVOKE_PID=$!
PIDS+=("$INVOKE_PID")
echo "Started InvokeAI web interface with PID: $INVOKE_PID"

echo "Running Civitai Model Loader on port ${CIVIT_MODEL_LOADER_PORT:=8081}"

python3 -m venv $HOME/venv
. $HOME/venv/bin/activate
pip3 install -r /civit_model_loader/requirements.txt

pushd /civit_model_loader
nohup python3 main.py --port ${CIVIT_MODEL_LOADER_PORT} >>"${LOG_FILE}" 2>&1 &
CIVIT_PID=$!
PIDS+=("$CIVIT_PID")
echo "Started Civitai Model Loader with PID: $CIVIT_PID"

popd

deactivate

echo "All services started. PIDs: ${PIDS[*]}"
echo "Use Ctrl+C to stop all services gracefully"

tail -f "${LOG_FILE}"
