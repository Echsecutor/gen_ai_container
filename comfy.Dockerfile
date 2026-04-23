# Community base image: ComfyUI + xFormers + FlashAttention-2 + SageAttention2++ + Nunchaku + ComfyUI-Manager
# See: https://github.com/radiatingreverberations/comfyui-docker
FROM ghcr.io/radiatingreverberations/comfyui-extensions:latest

ENV DEBIAN_FRONTEND=noninteractive

ARG MOUNT_DIR=/workspace
ENV MOUNT_DIR=${MOUNT_DIR}


# git is already present in the base image; add ffmpeg and build tools for video generation and custom nodes
RUN apt-get update -y && \
    apt-get install -y \
        sudo \
        wget \
        ffmpeg \
        libsm6 \
        libxext6 \
        build-essential \
    && apt-get clean -y


ADD civit_model_loader /civit_model_loader

# Mount one external volume; symlink the ComfyUI data dirs into it so all
# models, outputs, custom nodes and user settings persist on the host.
RUN for dir in models output custom_nodes user; do \
    rm -rf /comfyui/$dir \
    && mkdir -p ${MOUNT_DIR}/$dir \
    && ln -s ${MOUNT_DIR}/$dir /comfyui/ \
    ; done

EXPOSE 8188

ADD comfy/comfy_entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/bin/bash", "/entrypoint.sh"]

VOLUME ["${MOUNT_DIR}"]

# ComfyUI is started at 0.0.0.0 so Docker can forward traffic to the container;
# auto-launch is disabled because opening a browser inside a container is not possible.
CMD ["/opt/venv/bin/python", "/comfyui/main.py", "--listen", "0.0.0.0", "--port", "8188", "--disable-auto-launch"]
