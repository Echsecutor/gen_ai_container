#!/bin/bash

set +x
set -e

echo "INVOKE_AI_PORT=${INVOKE_AI_PORT:=8080}"
echo "INVOKE_AI_PACKAGE_SPECIFIER=${INVOKE_AI_PACKAGE_SPECIFIER:=invokeai}"
echo "INVOKE_AI_VERSION=${INVOKE_AI_VERSION:=5.5.0}"
echo "INVOKE_AI_DIR=${INVOKE_AI_DIR:=$HOME/invokeai}"

# install python3.11
apt-get install software-properties-common -y
add-apt-repository ppa:deadsnakes/ppa -y
apt-get update -y
apt-get install python3.11 -y

# install uv (like pip)
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env

# install dir
mkdir -p "${INVOKE_AI_DIR}"
cd "${INVOKE_AI_DIR}"

# put venv into home dir
uv venv --relocatable --prompt invoke --python 3.11 --python-preference only-managed ~/invokeai.venv
source "$HOME/invokeai.venv/bin/activate"

uv pip install "${INVOKE_AI_PACKAGE_SPECIFIER}"~="${INVOKE_AI_VERSION}" --python 3.11 --python-preference only-managed --force-reinstall

uv pip install pypatchmatch

deactivate
source "$HOME/invokeai.venv/bin/activate"

echo "host: 0.0.0.0" >>"${INVOKE_AI_DIR}"/invokeai.yaml
echo "port: ${INVOKE_AI_PORT}" >>"${INVOKE_AI_DIR}"/invokeai.yaml

# launch web ui like
#invokeai-web --root "${INVOKE_AI_DIR}"
