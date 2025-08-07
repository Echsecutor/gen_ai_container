# CUDA version
FROM ghcr.io/invoke-ai/invokeai

# For the ROCM version for AMD GPUs use:
#FROM ghcr.io/invoke-ai/invokeai:main-rocm

# Apt should not ask for user input
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -y \
 && apt-get upgrade -y \
 && apt-get install -y \
    python3-pip \
    python3-venv \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*


ARG INVOKE_AI_SCHEMA_VERSION=4.0.2
ARG INVOKE_AI_PORT=9090

ARG INVOKE_AI_DIR=/invokeai
ENV INVOKE_AI_DIR=${INVOKE_AI_DIR}

ARG MOUNT_DIR=/workspace
ENV MOUNT_DIR=${MOUNT_DIR}

ARG INVOKE_AI_MODELS_DIR=${MOUNT_DIR}/models
ARG INVOKE_AI_DB_DIR=${MOUNT_DIR}/db
ARG INVOKE_AI_OUTPUT_DIR=${MOUNT_DIR}/output
ARG INVOKE_AI_CUSTOM_NODES_DIR=${MOUNT_DIR}/nodes
ARG INVOKE_AI_STYLES_DIR=${MOUNT_DIR}/styles
ARG INVOKE_AI_PROFILES_DIR=${MOUNT_DIR}/profiles


RUN mkdir -p "${INVOKE_AI_DIR}"

WORKDIR $INVOKE_AI_DIR

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


COPY docker-entrypoint.sh /

COPY run_invoke_ai_web.sh /

RUN mkdir -p "${MOUNT_DIR}"

EXPOSE $INVOKE_AI_PORT
VOLUME ["${MOUNT_DIR}"]

ARG CIVIT_MODEL_LOADER_PORT=8081
ENV CIVIT_MODEL_LOADER_PORT=${CIVIT_MODEL_LOADER_PORT}

COPY civit_model_loader/ /civit_model_loader/

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["/run_invoke_ai_web.sh"]
