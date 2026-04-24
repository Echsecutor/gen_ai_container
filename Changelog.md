# Changelog: Shipping Invoke AI

## WIP

- Reverted `comfy.Dockerfile` base image from `ghcr.io/radiatingreverberations/comfyui-extensions` back to `pytorch/pytorch:2.6.0-cuda12.6-cudnn9-runtime`
  - The radiatingreverberations image uses PyTorch 2.10 + CUDA 13.0, which dropped support for compute capability < 7.5 (e.g. Tesla P40 sm_61)
  - PyTorch 2.6 + CUDA 12.6 is the latest official combination that still supports sm_61
  - Re-added manual `git clone` of ComfyUI and `pip install requirements.txt` to the build
  - Kept all `/comfyui` paths, entrypoint venv logic, and video-generation features added in the previous WIP
  - See `.cursor/notes/gpu_compatibility.md` for the full compatibility matrix
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

