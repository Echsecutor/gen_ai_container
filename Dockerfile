FROM ubuntu:latest

# might have better driver setup, but container gets to large for github pipeline
#FROM nvcr.io/nvidia/pytorch:22.08-py3


ARG INVOKE_AI_VERSION=5.6.0
ARG INVOKE_AI_SCHEMA_VERSION=4.0.2
ARG INVOKE_AI_PORT=8080

ARG INVOKE_AI_PACKAGE_SPECIFIER=invokeai
ARG INVOKE_AI_DIR=/invoke

ARG MOUNT_DIR=/workspace
ARG INVOKE_AI_MODELS_DIR=${MOUNT_DIR}/models
ARG INVOKE_AI_DB_DIR=${MOUNT_DIR}/db
ARG INVOKE_AI_OUTPUT_DIR=${MOUNT_DIR}/output
ARG INVOKE_AI_CUSTOM_NODES_DIR=${MOUNT_DIR}/nodes
ARG INVOKE_AI_STYLES_DIR=${MOUNT_DIR}/styles
ARG INVOKE_AI_PROFILES_DIR=${MOUNT_DIR}/profiles


ARG INVOKE_AI_VENV="$INVOKE_AI_DIR/.venv"

RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update -y && \
    apt-get install software-properties-common -y && \
    add-apt-repository ppa:deadsnakes/ppa -y && \
    apt-get update -y && \
    apt-get install python3.11 build-essential python3-opencv libopencv-dev curl -y && \
    apt-get autoremove -y && \
    apt-get clean -y

RUN mkdir -p "${INVOKE_AI_DIR}"

WORKDIR $INVOKE_AI_DIR

RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    . "$HOME/.local/bin/env" && \
    uv venv --relocatable --prompt invoke --python 3.11 --python-preference only-managed "$INVOKE_AI_VENV" && \
    . "$INVOKE_AI_VENV/bin/activate" && \
    uv pip install "${INVOKE_AI_PACKAGE_SPECIFIER}"~="${INVOKE_AI_VERSION}" --python 3.11 --python-preference only-managed --force-reinstall && \
    uv pip install pypatchmatch

RUN echo "schema_version: ${INVOKE_AI_SCHEMA_VERSION}" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "host: 0.0.0.0" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "port: ${INVOKE_AI_PORT}" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "hashing_algorithm: 'sha256'" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "models_dir: ${INVOKE_AI_MODELS_DIR}" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "precision: float16" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "patchmatch: true" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "use_memory_db: false" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "db_dir: ${INVOKE_AI_DB_DIR}" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "outputs_dir: ${INVOKE_AI_OUTPUT_DIR}" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "custom_nodes_dir: ${INVOKE_AI_CUSTOM_NODES_DIR}" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "style_presets_dir: ${INVOKE_AI_STYLES_DIR}" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "profiles_dir: ${INVOKE_AI_PROFILES_DIR}" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "enable_partial_loading: true">>"${INVOKE_AI_DIR}"/invokeai.yaml



COPY run_invoke_ai_web.sh /

RUN mkdir -p "${MOUNT_DIR}"

EXPOSE $INVOKE_AI_PORT
VOLUME ["${MOUNT_DIR}"]

ENTRYPOINT ["/run_invoke_ai_web.sh"]
