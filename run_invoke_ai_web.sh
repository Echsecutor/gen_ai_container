#!/bin/bash

set +x
set -e

echo "INVOKE_AI_VENV=${INVOKE_AI_VENV:="/invoke/.venv"}"

if [ "$(which syncthing)" ] && [ -n "${SYNCTHING_GUI_ADDRESS}" ] && [ -n "${SYNCTHING_DIR}" ] && [ "${RUN_SYNCTHING}" = "true" ]; then
    echo "Starting Syncthing on ${SYNCTHING_GUI_ADDRESS} with home directory ${SYNCTHING_DIR}"
    nohup syncthing --gui-address=${SYNCTHING_GUI_ADDRESS} --home=${SYNCTHING_DIR} &
else
    echo "Syncthing is disabled"
fi

. "$HOME/.local/bin/env"

. "$INVOKE_AI_VENV/bin/activate"
invokeai-web --root "${INVOKE_AI_DIR}"
