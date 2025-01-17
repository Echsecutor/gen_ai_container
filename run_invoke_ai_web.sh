#!/bin/bash

set +x
set -e

source ~/invokeai.venv/bin/activate
invokeai-web --root "${INVOKE_AI_DIR}"
