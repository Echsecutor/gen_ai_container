#!/bin/bash

# The base image bakes torch/xformers/etc. as system packages and expects a
# --system-site-packages venv at /opt/venv for runtime pip installs.
if [ ! -d /opt/venv ]; then
    python3 -m venv --system-site-packages /opt/venv
fi
source /opt/venv/bin/activate

# Creates the directories for the models inside of the volume that is mounted from the host
echo "Creating directories for models..."

# if the models, etc. folders are symlinked into a mount, create them
mkdir -p "$(readlink -f /comfyui/models)"
mkdir -p "$(readlink -f /comfyui/output)"
mkdir -p "$(readlink -f /comfyui/custom_nodes)"
mkdir -p "$(readlink -f /comfyui/user)"

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
    mkdir -p /comfyui/models/$MODEL_DIRECTORY
done

# Clone custom nodes. ComfyUI-Manager is pre-installed in the base image but
# /comfyui/custom_nodes is symlinked to the host volume, so we re-clone it here.
pushd /comfyui/custom_nodes || exit
git clone https://github.com/ltdrdata/ComfyUI-Manager comfyui-manager
git clone https://github.com/kijai/ComfyUI-FluxTrainer.git
git clone https://github.com/kijai/ComfyUI-KJNodes.git
git clone https://github.com/rgthree/rgthree-comfy.git
git clone https://github.com/orssorbit/ComfyUI-wanBlockswap
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite
git clone https://github.com/jamesWalker55/comfyui-various
git clone https://github.com/Smirnov75/ComfyUI-mxToolkit
git clone https://github.com/Fannovel16/ComfyUI-Frame-Interpolation
git clone https://github.com/pythongosssss/ComfyUI-Custom-Scripts
git clone https://github.com/DoctorDiffusion/ComfyUI-MediaMixer
git clone https://github.com/city96/ComfyUI-GGUF
git clone https://github.com/ltdrdata/was-node-suite-comfyui
git clone https://github.com/Lightricks/ComfyUI-LTXVideo.git ComfyUI-LTXVideo
git clone https://github.com/kijai/ComfyUI-WanVideoWrapper.git ComfyUI-WanVideoWrapper
popd || exit

# Populate the user workflow library from example workflows bundled with custom nodes.
# Uses cp -n (no-clobber) so user modifications are never overwritten on container restart.
echo "Installing example workflows..."
WORKFLOW_DIR="$(readlink -f /comfyui/user)/default/workflows"
mkdir -p "${WORKFLOW_DIR}/LTX-2.3"
mkdir -p "${WORKFLOW_DIR}/SkyReels-V3"
mkdir -p "${WORKFLOW_DIR}/WAN-2.2"

# LTX-2.3 official example workflows (T2V, I2V, IC-LoRA control variants)
for f in /comfyui/custom_nodes/ComfyUI-LTXVideo/example_workflows/2.3/*.json; do
    [ -f "$f" ] && cp -n "$f" "${WORKFLOW_DIR}/LTX-2.3/"
done

# SkyReels V3 R2V: uses the Phantom (multi-subject reference-to-video) workflow
cp -n /comfyui/custom_nodes/ComfyUI-WanVideoWrapper/example_workflows/wanvideo_2_1_14B_phantom_subject2vid_example_02.json \
    "${WORKFLOW_DIR}/SkyReels-V3/SkyReels-V3-R2V_phantom_multi-subject.json" 2>/dev/null || true
# SkyReels V3 V2V: uses the Pusa extension (video continuation) workflow
cp -n /comfyui/custom_nodes/ComfyUI-WanVideoWrapper/example_workflows/wanvideo_2_2_14B_Pusa_extension_example_01.json \
    "${WORKFLOW_DIR}/SkyReels-V3/SkyReels-V3-V2V_pusa_video-extension.json" 2>/dev/null || true

# WAN 2.2 helper workflows from WanVideoWrapper (I2V via Pusa, 5B variant)
cp -n /comfyui/custom_nodes/ComfyUI-WanVideoWrapper/example_workflows/wanvideo_2_1_14B_pusa_I2V_example_01.json \
    "${WORKFLOW_DIR}/WAN-2.2/wan2.2_14B_I2V_pusa.json" 2>/dev/null || true
cp -n /comfyui/custom_nodes/ComfyUI-WanVideoWrapper/example_workflows/wanvideo_2_2_5B_I2V_example_WIP.json \
    "${WORKFLOW_DIR}/WAN-2.2/wan2.2_5B_I2V.json" 2>/dev/null || true

echo "Example workflows installed."

# The custom nodes that were installed using the ComfyUI Manager may have requirements of their own, which are not installed when the container is
# started for the first time; this loops over all custom nodes and installs the requirements of each custom node
echo "Installing requirements for custom nodes..."
for CUSTOM_NODE_DIRECTORY in /comfyui/custom_nodes/*; do
    if [ -f "$CUSTOM_NODE_DIRECTORY/requirements.txt" ]; then
        CUSTOM_NODE_NAME=${CUSTOM_NODE_DIRECTORY##*/}
        CUSTOM_NODE_NAME=${CUSTOM_NODE_NAME//[-_]/ }
        echo "Installing requirements for $CUSTOM_NODE_NAME..."
        pip install --requirement "$CUSTOM_NODE_DIRECTORY/requirements.txt"
    fi
done

WGET_COMMAND="wget --continue -T 30 -t 5"
WGET_PIDS=()
WGET_LOG_FILE=$HOME/wget.log
echo >"$WGET_LOG_FILE"

download_model() {
    # --continue asks the server to skip already-downloaded bytes.
    # If the local file is complete the server returns 416 and wget exits 0
    # without re-downloading. If the file is partial it resumes.
    $WGET_COMMAND "$1" -O "$2" >>$WGET_LOG_FILE 2>&1 &
    WGET_PIDS+=("$!")
}

# Installing Base Models for WAN flow
echo "Installing Base Models for WAN flow..."
download_model https://huggingface.co/ai-forever/Real-ESRGAN/resolve/main/RealESRGAN_x2.pth /comfyui/models/upscale_models/RealESRGAN_x2.pth
download_model https://huggingface.co/ai-forever/Real-ESRGAN/resolve/main/RealESRGAN_x4.pth /comfyui/models/upscale_models/RealESRGAN_x4.pth
download_model https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp16.safetensors /comfyui/models/clip/umt5_xxl_fp16.safetensors
download_model https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors /comfyui/models/clip/umt5_xxl_fp8_e4m3fn_scaled.safetensors
download_model https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors /comfyui/models/vae/wan_2.1_vae.safetensors
# LORAs
echo "Installing LORAs for WAN flow..."
download_model https://huggingface.co/lightx2v/Wan2.1-I2V-14B-480P-StepDistill-CfgDistill-Lightx2v/resolve/main/loras/Wan21_I2V_14B_lightx2v_cfg_step_distill_lora_rank64.safetensors /comfyui/models/loras/Wan21_I2V_14B_lightx2v_cfg_step_distill_lora_rank64.safetensors

# UNETs
## txt2vid
echo "Installing UNETs for WAN flow txt2vid..."
download_model https://huggingface.co/bullerwins/Wan2.2-I2V-A14B-GGUF/resolve/main/wan2.2_i2v_high_noise_14B_Q4_K_M.gguf /comfyui/models/unet/wan2.2_i2v_high_noise_14B_Q4_K_M.gguf
download_model https://huggingface.co/bullerwins/Wan2.2-I2V-A14B-GGUF/resolve/main/wan2.2_i2v_low_noise_14B_Q4_K_M.gguf /comfyui/models/unet/wan2.2_i2v_low_noise_14B_Q4_K_M.gguf

## img2vid
echo "Installing UNETs for WAN flow img2vid..."
download_model https://huggingface.co/bullerwins/Wan2.2-T2V-A14B-GGUF/resolve/main/wan2.2_t2v_high_noise_14B_Q4_K_M.gguf /comfyui/models/unet/wan2.2_t2v_high_noise_14B_Q4_K_M.gguf
download_model https://huggingface.co/bullerwins/Wan2.2-T2V-A14B-GGUF/resolve/main/wan2.2_t2v_low_noise_14B_Q4_K_M.gguf /comfyui/models/unet/wan2.2_t2v_low_noise_14B_Q4_K_M.gguf

# CLIP vision (needed for WAN I2V and SkyReels V3 R2V reference-image workflows)
echo "Installing CLIP vision model..."
download_model https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/clip_vision/clip_vision_h.safetensors /comfyui/models/clip_vision/clip_vision_h.safetensors

# Installing Base Models for LTX-2.3 flow
# Uses Kijai's fp8 separated checkpoint format (ComfyUI-LTXVideo node handles auto-download of the VAE on first use)
echo "Installing Base Models for LTX-2.3 flow..."
# Main transformer: LTX-2.3 22B distilled, fp8 scaled (~23.5 GB)
download_model https://huggingface.co/Kijai/LTX2.3_comfy/resolve/main/diffusion_models/ltx-2.3-22b-distilled_transformer_only_fp8_scaled.safetensors /comfyui/models/diffusion_models/ltx-2.3-22b-distilled_transformer_only_fp8_scaled.safetensors
# Text encoder: Gemma 3 12B, fp8 quantized (~13.2 GB)
download_model https://huggingface.co/GitMylo/LTX-2-comfy_gemma_fp8_e4m3fn/resolve/main/gemma_3_12B_it_fp8_e4m3fn.safetensors /comfyui/models/clip/gemma_3_12B_it_fp8_e4m3fn.safetensors
# Text projection for LTX-2.3 22B (~2.3 GB)
download_model https://huggingface.co/Kijai/LTX2.3_comfy/resolve/main/text_encoders/ltx-2.3_text_projection_bf16.safetensors /comfyui/models/text_encoders/ltx-2.3_text_projection_bf16.safetensors

# Installing Base Models for SkyReels V3 flow
# R2V and V2V are Wan-based: they reuse the already-downloaded WAN UMT5 text encoder and WAN VAE
echo "Installing Base Models for SkyReels V3 flow..."
# R2V (Reference-to-Video): generate video from 1-4 reference images, fp8 scaled (~14.5 GB)
download_model https://huggingface.co/Kijai/WanVideo_comfy_fp8_scaled/resolve/main/SkyReelsV3/Wan21_SkyReelsV3-R2V_fp8_scaled_mixed.safetensors /comfyui/models/diffusion_models/Wan21_SkyReelsV3-R2V_fp8_scaled_mixed.safetensors
# V2V (Video Extension): extend/continue existing video clips, fp8 scaled (~14.5 GB)
download_model https://huggingface.co/Kijai/WanVideo_comfy_fp8_scaled/resolve/main/SkyReelsV3/Wan21-SkyReelsV3-V2V_fp8_scaled_mixed.safetensors /comfyui/models/diffusion_models/Wan21-SkyReelsV3-V2V_fp8_scaled_mixed.safetensors

# Wait for all wget background processes to finish, tailing the wget log while any are running

while :; do
    echo "--------------------------------"
    echo "Waiting for model parallel downloads to complete (WAN 2.2, LTX-2.3, SkyReels V3)..."
    echo "--------------------------------"

    # Remove finished PIDs from the array
    ALIVE_PIDS=()
    for pid in "${WGET_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            ALIVE_PIDS+=("$pid")
        fi
    done
    WGET_PIDS=("${ALIVE_PIDS[@]}")
    if [ "${#WGET_PIDS[@]}" -eq 0 ]; then
        break
    fi
    # Tail the last 20 lines of the wget log
    tail -n 20 "$WGET_LOG_FILE"
    sleep 1
done

echo "All video generation models installed (WAN 2.2, LTX-2.3, SkyReels V3)"

LOG_FILE=$HOME/logs

# Array to store PIDs of background processes
PIDS=()

echo "Running Civitai Model Loader on port ${CIVIT_MODEL_LOADER_PORT:=8081}"

python3 -m venv $HOME/venv
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
    chown --recursive $USER_ID:$GROUP_ID /comfyui
    chown --recursive $USER_ID:$GROUP_ID /opt/venv
    export PATH=$PATH:/home/comfyui-user/.local/bin

    echo "Running container as $USER..."

    nohup sudo --set-home --preserve-env=PATH --user \#$USER_ID "$@" >>"${LOG_FILE}" 2>&1 &
    COMFY_PID=$!
fi
PIDS+=("$COMFY_PID")
echo "Started ComfyUI with PID: $COMFY_PID"

tail -f "${LOG_FILE}"
