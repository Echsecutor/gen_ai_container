#!/bin/bash

set +x
set -e

echo "INVOKE_AI_VENV=${INVOKE_AI_VENV:="/invoke/.venv"}"

if [ -f "/run_syncthing.sh" ]; then
    /run_syncthing.sh
else
    echo "Error: /run_syncthing.sh not found"
fi

if [ -f "/mount_web_dav.sh" ]; then
    /mount_web_dav.sh
else
    echo "Error: /mount_web_dav.sh not found"
fi

. "$HOME/.local/bin/env"

. "$INVOKE_AI_VENV/bin/activate"
invokeai-web --root "${INVOKE_AI_DIR}"
