# Changelog: Shipping Invoke AI

## WIP

- Switched `comfy.Dockerfile` base image from `pytorch/pytorch` to `ghcr.io/radiatingreverberations/comfyui-extensions`
  - ComfyUI, xFormers, FlashAttention-2, SageAttention2++, Nunchaku, and ComfyUI-Manager are now pre-installed in the base image
  - Removes manual `git clone` of ComfyUI and `pip install requirements.txt` from the build, significantly reducing build time
  - Updated all container paths from `/opt/comfyui` to `/comfyui` to match base image layout
  - Updated CMD python path to `/opt/venv/bin/python` and entrypoint to create the venv at startup
  - Fixed `chown /opt/comfyui-manager` bug (path did not exist); now chowns `/comfyui` and `/opt/venv` instead
  - Removed duplicate `rgthree-comfy` custom node clone
- Added LTX-2.3 video generation support to ComfyUI container
  - Added `ComfyUI-LTXVideo` (Lightricks) custom node
  - Downloads: LTX-2.3 22B distilled transformer (fp8, ~23.5GB), Gemma 3 12B text encoder (fp8, ~13.2GB), text projection (~2.3GB)
  - VAE auto-downloaded by node on first use
- Added SkyReels V3 video generation support to ComfyUI container
  - Added `ComfyUI-WanVideoWrapper` (Kijai) custom node
  - Downloads: R2V fp8 (~14.5GB, reference-to-video from 1-4 images) and V2V fp8 (~14.5GB, video extension)
  - Both models reuse the existing WAN UMT5 text encoder and WAN VAE — no extra overhead
- Added CLIP vision model download (`clip_vision_h.safetensors`) for WAN I2V and SkyReels V3 R2V workflows
- Pre-installed example workflows into ComfyUI user workflow library at startup
  - `LTX-2.3/`: 4 official Lightricks workflows (T2V/I2V single-stage, two-stage distilled, IC-LoRA control)
  - `SkyReels-V3/`: Phantom (R2V multi-subject) and Pusa extension (V2V continuation) workflows
  - `WAN-2.2/`: WanVideoWrapper Pusa I2V and 5B I2V workflows
  - Uses `cp -n` (no-clobber) so existing user workflows are never overwritten on container restart

## 2.0.1 (2026-02-21)

- Integrated auto-sort functionality into civit_model_loader
  - Moved `scripts/sort_generated_pics` into `civit_model_loader/` for Docker image availability
  - Added auto-sort option to conversion manager with UI checkbox control
  - Enables automatic organization of converted images by prompt keywords
  - Auto-sort is enabled by default but can be disabled via UI
- Optimized `scripts/sort_generated_pics` auto-sort algorithm
  - Changed from greedy (first valid keyword) to balanced binary tree approach
  - Now selects keyword that creates most balanced 50-50 split
  - Results in shallower, more efficient folder hierarchy (log₂(n) depth)
  - Symmetric handling of both branches for consistent tree structure
- Forked comfy UI container
  - Added ffmpeg + libs for video generation
- Moved Invoke to subfolder
- Invoke AI 5.7.1
  - Now using latest invoke image for every build

## 1.2.0 (2025-03-01)

- Invoke AI upgraded to 5.6.0
- `enable_partial_loading: true`

## 1.1.0 (2025-02-11)
 
 - More directories moved into mounted folder for persistence Latest

## 1.0.1 (2025-01-22)

- Separated models and invoke dir

