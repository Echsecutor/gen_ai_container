# This image is based on the official PyTorch image, because it already contains CUDA, CuDNN, and PyTorch
# PyTorch 2.6 + CUDA 12.6 is the last combination that still supports Tesla P40 (sm_61 / compute capability 6.1)
# See: https://github.com/astral-sh/uv/issues/14742
FROM pytorch/pytorch:2.6.0-cuda12.6-cudnn9-runtime

# Apt should not ask for user input
ENV DEBIAN_FRONTEND=noninteractive

ARG COMFY_UI_VERSION=v0.3.59
ARG COMFY_UI_MANAGER_VERSION=3.32.2
ARG MOUNT_DIR=/workspace
ENV MOUNT_DIR=${MOUNT_DIR}


# Install core runtime deps: git, wget, ffmpeg, and build tools for custom nodes / model downloads
RUN apt-get update -y && \
    apt-get install -y \
        git \
        sudo \
        wget \
        ffmpeg \
        libsm6 \
        libxext6 \
        build-essential \
    && apt-get clean -y


ADD civit_model_loader /civit_model_loader

RUN git clone https://github.com/comfyanonymous/ComfyUI.git /comfyui \
    && cd /comfyui \
    && git checkout tags/${COMFY_UI_VERSION}

RUN pip install \
    --requirement /comfyui/requirements.txt


# Mount one external volume; symlink the ComfyUI data dirs into it so all
# models, outputs, custom nodes and user settings persist on the host.
RUN for dir in models output custom_nodes user; do \
    rm -rf /comfyui/$dir \
    && mkdir -p ${MOUNT_DIR}/$dir \
    && ln -s ${MOUNT_DIR}/$dir /comfyui/ \
    ; done

EXPOSE 8188

ADD comfy/extra_model_paths.yaml /comfyui/extra_model_paths.yaml
ADD comfy/comfy_entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/bin/bash", "/entrypoint.sh"]

VOLUME ["${MOUNT_DIR}"]

# ComfyUI is started at 0.0.0.0 so Docker can forward traffic to the container;
# auto-launch is disabled because opening a browser inside a container is not possible.
CMD ["/opt/venv/bin/python", "/comfyui/main.py", "--listen", "0.0.0.0", "--port", "8188", "--disable-auto-launch"]
