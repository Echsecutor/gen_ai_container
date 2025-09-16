# syntax = edrevo/dockerfile-plus


# This image is based on the latest official PyTorch image, because it already contains CUDA, CuDNN, and PyTorch
FROM pytorch/pytorch:2.6.0-cuda12.6-cudnn9-runtime

# Apt should not ask for user input
ENV DEBIAN_FRONTEND=noninteractive


ARG COMFY_UI_VERSION=v0.3.59
ARG COMFY_UI_MANAGER_VERSION=3.32.2
ARG MOUNT_DIR=/workspace
ENV MOUNT_DIR=${MOUNT_DIR}


# Added ffmpeg + libs for video generation
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


Add civit_model_loader /civit_model_loader

RUN git clone https://github.com/comfyanonymous/ComfyUI.git /opt/comfyui \
    && cd /opt/comfyui \
    &&git checkout tags/${COMFY_UI_VERSION}


RUN pip install \
    --requirement /opt/comfyui/requirements.txt

WORKDIR /opt/comfyui


# mount one external volume and link dirs there in
RUN for dir in models output custom_nodes user; do \
    rm -rf /opt/comfyui/$dir \
    && mkdir -p ${MOUNT_DIR}/$dir \
    && ln -s ${MOUNT_DIR}/$dir /opt/comfyui/ \
    ; done

EXPOSE 8188

ADD comfy/comfy_entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/bin/bash", "/entrypoint.sh"]

VOLUME ["${MOUNT_DIR}"]



# On startup, ComfyUI is started at its default port; the IP address is changed from localhost to 0.0.0.0, because Docker is only forwarding traffic
# to the IP address it assigns to the container, which is unknown at build time; listening to 0.0.0.0 means that ComfyUI listens to all incoming
# traffic; the auto-launch feature is disabled, because we do not want (nor is it possible) to open a browser window in a Docker container
CMD ["/opt/conda/bin/python", "main.py", "--listen", "0.0.0.0", "--port", "8188", "--disable-auto-launch"]
