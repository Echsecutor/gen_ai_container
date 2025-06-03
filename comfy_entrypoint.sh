#!/bin/bash

# Start Syncthing if it is enabled
if [ "$(which syncthing)" ] && [ -n "${SYNCTHING_GUI_ADDRESS}" ] && [ -n "${SYNCTHING_DIR}" ] && [ "${RUN_SYNCTHING}" = "true" ]; then
    echo "Starting Syncthing on ${SYNCTHING_GUI_ADDRESS} with home directory ${SYNCTHING_DIR}"
    nohup syncthing --gui-address=${SYNCTHING_GUI_ADDRESS} --home=${SYNCTHING_DIR} &
else
    echo "SYNCTHING_GUI_ADDRESS: ${SYNCTHING_GUI_ADDRESS}"
    echo "SYNCTHING_DIR: ${SYNCTHING_DIR}"
    echo "RUN_SYNCTHING: ${RUN_SYNCTHING}"
    echo "which syncthing: $(which syncthing)"
    echo "Syncthing is disabled"
fi

# Creates the directories for the models inside of the volume that is mounted from the host
echo "Creating directories for models..."

# if the models, etc. folders are symlinked into a mount, create them
mkdir -p "$(readlink -f /opt/comfyui/models)"
mkdir -p "$(readlink -f /opt/comfyui/output)"
mkdir -p "$(readlink -f /opt/comfyui/custom_nodes)"
mkdir -p "$(readlink -f /opt/comfyui/user)"

MODEL_DIRECTORIES=(
    "checkpoints"
    "clip"
    "clip_vision"
    "configs"
    "controlnet"
    "diffusers"
    "diffusion_models"
    "embeddings"
    "gligen"
    "hypernetworks"
    "loras"
    "photomaker"
    "style_models"
    "text_encoders"
    "unet"
    "upscale_models"
    "vae"
    "vae_approx"
)
for MODEL_DIRECTORY in ${MODEL_DIRECTORIES[@]}; do
    mkdir -p /opt/comfyui/models/$MODEL_DIRECTORY
done

# Creates the symlink for the ComfyUI Manager to the custom nodes directory, which is also mounted from the host
echo "Creating symlink for ComfyUI Manager..."
rm --force /opt/comfyui/custom_nodes/ComfyUI-Manager
ln -s \
    /opt/comfyui-manager \
    /opt/comfyui/custom_nodes/ComfyUI-Manager


echo "Updating compfy UI requirements..."
pip install -r /opt/comfyui/requirements.txt


# Add additional plugins for FluxTrainer
pushd /opt/comfyui/custom_nodes || exit
git clone https://github.com/kijai/ComfyUI-FluxTrainer.git
git clone https://github.com/kijai/ComfyUI-KJNodes.git
git clone https://github.com/rgthree/rgthree-comfy.git
popd || exit


# The custom nodes that were installed using the ComfyUI Manager may have requirements of their own, which are not installed when the container is
# started for the first time; this loops over all custom nodes and installs the requirements of each custom node
echo "Installing requirements for custom nodes..."
for CUSTOM_NODE_DIRECTORY in /opt/comfyui/custom_nodes/*;
do
    if [ "$CUSTOM_NODE_DIRECTORY" != "/opt/comfyui/custom_nodes/ComfyUI-Manager" ];
    then
        if [ -f "$CUSTOM_NODE_DIRECTORY/requirements.txt" ];
        then
            CUSTOM_NODE_NAME=${CUSTOM_NODE_DIRECTORY##*/}
            CUSTOM_NODE_NAME=${CUSTOM_NODE_NAME//[-_]/ }
            echo "Installing requirements for $CUSTOM_NODE_NAME..."
            pip install --requirement "$CUSTOM_NODE_DIRECTORY/requirements.txt"
        fi
    fi
done



# Under normal circumstances, the container would be run as the root user, which is not ideal, because the files that are created by the container in
# the volumes mounted from the host, i.e., custom nodes and models downloaded by the ComfyUI Manager, are owned by the root user; the user can specify
# the user ID and group ID of the host user as environment variables when starting the container; if these environment variables are set, a non-root
# user with the specified user ID and group ID is created, and the container is run as this user
if [ -z "$USER_ID" ] || [ -z "$GROUP_ID" ];
then
    echo "Running container as $USER..."
    exec "$@"
else
    echo "Creating non-root user..."
    getent group $GROUP_ID > /dev/null 2>&1 || groupadd --gid $GROUP_ID comfyui-user
    id -u $USER_ID > /dev/null 2>&1 || useradd --uid $USER_ID --gid $GROUP_ID --create-home comfyui-user
    chown --recursive $USER_ID:$GROUP_ID /opt/comfyui
    chown --recursive $USER_ID:$GROUP_ID /opt/comfyui-manager
    export PATH=$PATH:/home/comfyui-user/.local/bin

    echo "Running container as $USER..."
    sudo --set-home --preserve-env=PATH --user \#$USER_ID "$@"
fi