#!/bin/bash

set +x
set -e

echo "Running web interface for InvokeAI in ${INVOKE_AI_DIR}"

invokeai-web --root "${INVOKE_AI_DIR}"
