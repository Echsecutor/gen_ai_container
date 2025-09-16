#!/bin/bash

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

echo "Updating compfy UI requirements..."
pip install -r /opt/comfyui/requirements.txt

# Add additional plugins for FluxTrainer
pushd /opt/comfyui/custom_nodes || exit
git clone https://github.com/ltdrdata/ComfyUI-Manager comfyui-manager
git clone https://github.com/kijai/ComfyUI-FluxTrainer.git
git clone https://github.com/kijai/ComfyUI-KJNodes.git
git clone https://github.com/rgthree/rgthree-comfy.git
git clone https://github.com/orssorbit/ComfyUI-wanBlockswap
git clone https://github.com/rgthree/rgthree-comfy
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite
git clone https://github.com/jamesWalker55/comfyui-various
git clone https://github.com/Smirnov75/ComfyUI-mxToolkit
git clone https://github.com/Fannovel16/ComfyUI-Frame-Interpolation
git clone https://github.com/pythongosssss/ComfyUI-Custom-Scripts
git clone https://github.com/DoctorDiffusion/ComfyUI-MediaMixer
git clone https://github.com/city96/ComfyUI-GGUF
git clone https://github.com/ltdrdata/was-node-suite-comfyui
popd || exit

# The custom nodes that were installed using the ComfyUI Manager may have requirements of their own, which are not installed when the container is
# started for the first time; this loops over all custom nodes and installs the requirements of each custom node
echo "Installing requirements for custom nodes..."
for CUSTOM_NODE_DIRECTORY in /opt/comfyui/custom_nodes/*; do
    if [ -f "$CUSTOM_NODE_DIRECTORY/requirements.txt" ]; then
        CUSTOM_NODE_NAME=${CUSTOM_NODE_DIRECTORY##*/}
        CUSTOM_NODE_NAME=${CUSTOM_NODE_NAME//[-_]/ }
        echo "Installing requirements for $CUSTOM_NODE_NAME..."
        pip install --requirement "$CUSTOM_NODE_DIRECTORY/requirements.txt"
    fi
done

# Installing Base Models for WAN flow
echo "Installing Base Models for WAN flow..."
wget https://huggingface.co/ai-forever/Real-ESRGAN/resolve/main/RealESRGAN_x2.pth -O /opt/comfyui/models/upscale_models/RealESRGAN_x2.pth
wget https://huggingface.co/ai-forever/Real-ESRGAN/resolve/main/RealESRGAN_x4.pth -O /opt/comfyui/models/upscale_models/RealESRGAN_x4.pth
wget https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp16.safetensors -O /opt/comfyui/models/clip/umt5_xxl_fp16.safetensors
wget https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors -O /opt/comfyui/models/clip/umt5_xxl_fp8_e4m3fn_scaled.safetensors
wget https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors -O /opt/comfyui/models/vae/wan_2.1_vae.safetensors

# LORAs
echo "Installing LORAs for WAN flow..."
wget https://huggingface.co/lightx2v/Wan2.1-I2V-14B-480P-StepDistill-CfgDistill-Lightx2v/resolve/main/loras/Wan21_I2V_14B_lightx2v_cfg_step_distill_lora_rank64.safetensors -O /opt/comfyui/models/loras/Wan21_I2V_14B_lightx2v_cfg_step_distill_lora_rank64.safetensors

# UNETs
## txt2vid
echo "Installing UNETs for WAN flow txt2vid..."
wget https://huggingface.co/bullerwins/Wan2.2-I2V-A14B-GGUF/resolve/main/wan2.2_i2v_high_noise_14B_Q4_K_M.gguf -O /opt/comfyui/models/unet/wan2.2_i2v_high_noise_14B_Q4_K_M.gguf
wget https://huggingface.co/bullerwins/Wan2.2-I2V-A14B-GGUF/resolve/main/wan2.2_i2v_low_noise_14B_Q4_K_M.gguf -O /opt/comfyui/models/unet/wan2.2_i2v_low_noise_14B_Q4_K_M.gguf

## img2vid
echo "Installing UNETs for WAN flow img2vid..."
wget https://huggingface.co/bullerwins/Wan2.2-T2V-A14B-GGUF/resolve/main/wan2.2_t2v_high_noise_14B_Q4_K_M.gguf -O /opt/comfyui/models/unet/wan2.2_t2v_high_noise_14B_Q4_K_M.gguf
wget https://huggingface.co/bullerwins/Wan2.2-T2V-A14B-GGUF/resolve/main/wan2.2_t2v_low_noise_14B_Q4_K_M.gguf -O /opt/comfyui/models/unet/wan2.2_t2v_low_noise_14B_Q4_K_M.gguf

LOG_FILE=$HOME/logs

# Array to store PIDs of background processes
PIDS=()

echo "Running Civitai Model Loader on port ${CIVIT_MODEL_LOADER_PORT:=8081}"

python -m venv $HOME/venv
. $HOME/venv/bin/activate
pip install -r /civit_model_loader/requirements.txt

pushd /civit_model_loader
nohup python3 main.py --port ${CIVIT_MODEL_LOADER_PORT} >>"${LOG_FILE}" 2>&1 &
CIVIT_PID=$!
PIDS+=("$CIVIT_PID")
echo "Started Civitai Model Loader with PID: $CIVIT_PID"
popd

deactivate

# Function to cleanup child processes
cleanup() {
    echo "Received signal, cleaning up child processes..."
    for pid in "${PIDS[@]}"; do
        echo "Killing process $pid"
        kill "$pid" 2>/dev/null || true
    done
    # Wait a moment for graceful shutdown
    sleep 2
    exit 0
}

# Set up signal traps to forward signals to child processes
trap cleanup SIGTERM SIGINT SIGQUIT

# Under normal circumstances, the container would be run as the root user, which is not ideal, because the files that are created by the container in
# the volumes mounted from the host, i.e., custom nodes and models downloaded by the ComfyUI Manager, are owned by the root user; the user can specify
# the user ID and group ID of the host user as environment variables when starting the container; if these environment variables are set, a non-root
# user with the specified user ID and group ID is created, and the container is run as this user
if [ -z "$USER_ID" ] || [ -z "$GROUP_ID" ]; then
    echo "Running container as $USER..."
    nohup "$@" >>"${LOG_FILE}" 2>&1 &
    COMFY_PID=$!
else
    echo "Creating non-root user..."
    getent group $GROUP_ID >/dev/null 2>&1 || groupadd --gid $GROUP_ID comfyui-user
    id -u $USER_ID >/dev/null 2>&1 || useradd --uid $USER_ID --gid $GROUP_ID --create-home comfyui-user
    chown --recursive $USER_ID:$GROUP_ID /opt/comfyui
    chown --recursive $USER_ID:$GROUP_ID /opt/comfyui-manager
    export PATH=$PATH:/home/comfyui-user/.local/bin

    echo "Running container as $USER..."

    nohup sudo --set-home --preserve-env=PATH --user \#$USER_ID "$@" >>"${LOG_FILE}" 2>&1 &
    COMFY_PID=$!
fi
PIDS+=("$COMFY_PID")
echo "Started ComfyUI with PID: $COMFY_PID"

tail -f "${LOG_FILE}"
