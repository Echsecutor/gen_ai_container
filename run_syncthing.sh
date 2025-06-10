#!/bin/bash

# Start Syncthing if it is enabled
if [ "$(which syncthing)" ] && [ -n "${SYNCTHING_GUI_ADDRESS}" ] && [ -n "${SYNCTHING_DIR}" ]; then
    echo "Starting Syncthing on ${SYNCTHING_GUI_ADDRESS} with home directory ${SYNCTHING_DIR}"
    nohup syncthing --gui-address=${SYNCTHING_GUI_ADDRESS} --home=${SYNCTHING_DIR} &
else
    echo "SYNCTHING_GUI_ADDRESS: '${SYNCTHING_GUI_ADDRESS}'"
    echo "SYNCTHING_DIR: '${SYNCTHING_DIR}'"
    echo "which syncthing: '$(which syncthing)'"
    echo "Syncthing is disabled"
fi
