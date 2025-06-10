#!/bin/bash

set +x
set -e

echo "INVOKE_AI_VENV=${INVOKE_AI_VENV:="/invoke/.venv"}"

./run_syncthing.sh

. "$HOME/.local/bin/env"

. "$INVOKE_AI_VENV/bin/activate"
invokeai-web --root "${INVOKE_AI_DIR}"
