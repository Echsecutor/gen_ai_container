# Open Video Generation Models (Local Inference)

Research date: April 2026

## Summary

The current ComfyUI setup supports **Wan 2.1** video models natively. As of 2026, **Wan 2.2** is the best available open-weight model. Several other strong open-source models exist. **Seedance 2.0** and Wan 2.5/2.6 are closed/commercial and cannot be run locally.

---

## Open-Weight Models (Locally Runnable)

### 1. Wan 2.2 (Alibaba) — Best Overall
- **License**: Apache 2.0
- **Architecture**: MoE (Mixture-of-Experts), 27B total / 14B active
- **Resolution**: 480p–720p @ 24fps, up to ~10s clips
- **ComfyUI**: Native support (built-in since ComfyUI v0.3.x); also Diffusers
- **Weights**: Available on [HuggingFace (Wan-AI)](https://huggingface.co/Wan-AI) and ModelScope

| Model | Task | VRAM | Notes |
|-------|------|------|-------|
| T2V-A14B | Text→Video | 24–40GB | MoE, best quality |
| I2V-A14B | Image→Video | 24–40GB | MoE, 480p & 720p |
| TI2V-5B | T2V + I2V unified | 12GB | Consumer-friendly, 720p |
| S2V-14B | Speech→Video (audio-driven) | 24–40GB | Cinematic audio sync |
| Animate-14B | Character animation | 24–40GB | Holistic movement replication |

> **Note**: Wan 2.5 and 2.6 are **commercial only** — no open weights released. 2.2 is the latest open-source version.

**ComfyUI model files location**: `diffusion_models/`, VAE in `vae/`, text encoder (`umt5_xxl_fp8_e4m3fn_scaled.safetensors`) in `text_encoders/`

---

### 2. LTX-2 / LTX-2.3 (Lightricks + NVIDIA) — Best Quality / Speed
- **License**: Apache 2.0 (free for revenue < $10M ARR)
- **Architecture**: DiT (Diffusion Transformer), 22B parameters
- **Resolution**: Native 4K (up to 50fps), portrait 1080×1920 native
- **Max duration**: ~20s per clip
- **Native audio**: Yes — synchronized motion, dialogue, SFX, music in one pass
- **VRAM**: 32GB+ official; community NVFP8/NVFP4 quantization brings it to 8GB+
  - NVIDIA optimization: 3× faster, 60% less VRAM on RTX 40-series with NVFP4
- **ComfyUI**: Native + `ComfyUI-LTXVideo` custom nodes
- **Weights**: [HuggingFace Lightricks/LTX-2.3](https://huggingface.co/Lightricks/LTX-2.3)
- **Text encoder**: Gemma 3 12B

**Key advantages over Wan 2.2**: 4K, native audio, portrait mode, 18× faster iteration
**Disadvantage**: Higher base VRAM, heavier setup, worse motion realism for human subjects

---

### 3. HunyuanVideo (Tencent) — High Quality, High VRAM
- **License**: Community license (commercial use with attribution)
- **Parameters**: 13B
- **Resolution**: 720p (1280×720), ~129 frames (~5s)
- **VRAM**: 45GB minimum (540p), 60GB minimum (720p), 80GB recommended
- **ComfyUI**: `ComfyUI-HunyuanVideoWrapper` (Kijai) + official `ComfyUI-HunyuanVideo`
- **Weights**: [HuggingFace Tencent-Hunyuan](https://huggingface.co/tencent/HunyuanVideo), FP8 quantized version available
- **Practical use**: Requires A100/H100-class GPU or multi-GPU setup; impractical on consumer hardware without significant quantization

---

### 4. CogVideoX (Zhipu / Tsinghua)
- **Parameters**: ~5B
- **Strength**: Best image-to-video quality (among older models), LoRA fine-tuning support
- **ComfyUI**: Native support
- **VRAM**: 16GB+ (accessible on mid-range cards)
- Good for fine-tuning use cases

---

### 5. Mochi (Genmo)
- **Parameters**: 10B
- **ComfyUI**: Native support
- Now somewhat outclassed by Wan 2.2 and LTX-2

---

### 6. Open-Sora 2.0 (hpcaitech / ColossalAI)
- **License**: Apache 2.0
- **Parameters**: 11B
- **Architecture**: MMDiT (Masked Motion Diffusion Transformer), 3D full attention
- **Resolution**: 256×256 and 768×768 (square-ish, not 16:9 focused)
- **Max duration**: up to 129 frames (~5s)
- **Training cost**: ~$200K — notable efficiency vs. quality ratio
- **Supports**: T2V and I2V in one model; uses T2I2V pipeline (Flux generates image, then video)
- **Weights**: [HuggingFace hpcai-tech/Open-Sora-v2](https://huggingface.co/hpcai-tech/Open-Sora-v2)
- **GitHub**: [hpcaitech/Open-Sora](https://github.com/hpcaitech/Open-Sora)
- **ComfyUI**: Community node `ComfyUI-Open-Sora-I2V` (designed for v1.x; v2 support partial)
- **Multi-GPU**: ColossalAI sequence parallelism (`torchrun`)

**VRAM requirements (50 steps, H100/H800 benchmark):**

| Resolution | 1 GPU | 2 GPUs | 4 GPUs | 8 GPUs | Time (8x GPU) |
|-----------|-------|--------|--------|--------|----------------|
| 256×256 | 52.5GB | 44.3GB | 44.3GB | — | ~60s |
| 768×768 | 60.3GB | 48.3GB | 44.3GB | 44.3GB | ~4.5min |

> **Consumer GPU verdict**: **Not runnable** on RTX 4090 (24GB) — confirmed OOM even with 8× RTX 4090 cards. Requires 80GB GPU (A100/H100). Primarily for research, cloud, or air-gapped server deployments.

---

### 7. SkyReels V2 (SkyworkAI) — Infinite-Length Video
- **License**: Custom (non-Apache)
- **Released**: April 2025
- **Architecture**: Diffusion Forcing (autoregressive) — unique among open models
- **Key capability**: **Infinite-length video generation** — can generate up to 60s+ clips by chaining segments
- **Resolution**: 540P (544×960) and 720P (720×1280)
- **Frame rates**: 24fps
- **Weights**: Available on HuggingFace and ModelScope

| Model | Task | Resolution | Notes |
|-------|------|-----------|-------|
| DF-1.3B-540P | T2V + I2V (Diffusion Forcing) | 540P | Consumer-friendly |
| DF-14B-540P | T2V + I2V (Diffusion Forcing) | 540P | Best quality long-form |
| DF-14B-720P | T2V + I2V (Diffusion Forcing) | 720P | Highest quality |
| T2V-14B-540P / 720P | Text-to-Video | 540P/720P | Standard mode |
| I2V-14B-540P / 720P | Image-to-Video | 540P/720P | |
| Camera Director variants | T2V with camera control | 540P/720P | |

- **VRAM**: 14B variants need substantial VRAM; `--offload` flag enables single RTX 4090 (24GB) for 540P with degraded speed; 1.3B variant runs on lower-end hardware
- **Multi-GPU**: xDiT USP (`torchrun --nproc_per_node=N`)
- **ComfyUI**: Via Kijai's WanVideoWrapper; drag-and-drop JSON workflows for V2V extend engine
- **Also includes**: SkyReels-A1 (portrait animation), SkyReels-A2 (multi-element assembly)
- **GitHub**: [SkyworkAI/SkyReels-V2](https://github.com/SkyworkAI/SkyReels-V2)

Long video generation frame counts: `--num_frames 257` = ~10s, `377` = 15s, `777` = 30s, `1457` = 60s

---

### 8. SkyReels V3 (SkyworkAI) — Multimodal Reference/Audio
- **License**: Custom (non-Apache)
- **Released**: January 2026
- **Architecture**: Unified multimodal in-context learning framework
- **Resolution**: 720P @ 24fps, ~5s clips
- **Weights**: HuggingFace and ModelScope
- **GitHub**: [SkyworkAI/SkyReels-V3](https://github.com/SkyworkAI/SkyReels-V3)

| Model | Task | VRAM (est.) |
|-------|------|-------------|
| R2V-14B-720P | Reference images → Video (1–4 ref images) | 43GB+ with offload |
| V2V-14B-720P | Video extension / continuation | 43GB+ with offload |
| A2V-19B-720P | Audio-driven talking avatar | ~60GB+ |

**Key capabilities:**
1. **Reference-to-Video (R2V)**: Multi-subject generation from 1–4 reference images — maintains character/object identity across scenes
2. **Video Extension (V2V)**: Seamlessly extends existing footage segment-by-segment with motion continuity (loop-based, FP8 quantized for ComfyUI)
3. **Talking Avatar (A2V)**: Audio-conditioned portrait animation (19B model)

- **ComfyUI**: Via Kijai's WanVideoWrapper; drag-and-drop JSON workflows (`SkyReels-V3-R2V-多图参考.json`); also FP8 weights available as `Wan21-SkyReelsV3-V2V_fp8_scaled_mixed.safetensors`
- **Performance**: Claims SOTA among open-source models (benchmarks vs PixVerse V5, Wan 2.2, etc.)
- **Multi-GPU**: xDiT USP (`torchrun --nproc_per_node=4 ... --use_usp --offload`)

---

## Closed / Commercial Models (API Only — Not Locally Runnable)

| Model | Developer | Notes |
|-------|-----------|-------|
| Seedance 2.0 | ByteDance | Proprietary, API via fal/Jimeng/ByteDance platforms; paper: [arXiv 2604.14148](https://arxiv.org/abs/2604.14148); 480p–720p, native audio-video, 4–15s; estimated 20B+ params requiring H100 cluster |
| Wan 2.5 / 2.6 | Alibaba | No open weights; 2.6 is commercial via Higgsfield etc. |
| Kling v3 | Kuaishou | API only |
| Veo 3 | Google | API only |
| Sora 2 | OpenAI | API only |

**Seedance 2.0 specifically**: ByteDance's flagship model as of early 2026. Comparable capabilities to Wan 2.2/LTX-2 in some areas, better in human motion and cinematic quality. Cannot be run locally — not open-sourced and would require H100-class hardware even if weights were released.

---

## Hardware Reference

| GPU | VRAM | Best Local Options |
|-----|------|--------------------|
| RTX 3060 / 4060 | 8–12GB | Wan 2.2 TI2V-5B (480p), LTX-2 (community quant), SkyReels-V2 1.3B |
| RTX 4070 Ti / 3090 | 16–24GB | Wan 2.2 T2V-A14B (fp8), LTX-2 (distilled), SkyReels-V2 14B (offload) |
| RTX 4090 / 5090 | 24–32GB | Wan 2.2 14B full, LTX-2.3 (quantized), SkyReels-V3 14B (offload) |
| A100 (40GB) | 40GB | HunyuanVideo (544p), SkyReels-V3 A2V (marginal) |
| A100 / H100 (80GB) | 80GB | HunyuanVideo (720p), Open-Sora 2.0 single-GPU |

> **Open-Sora 2.0 is the only model here that cannot run on even 8× RTX 4090.** H100/H800 class GPUs are mandatory.

---

## ComfyUI Integration Status

| Model | Support Type | Custom Nodes | In Container? |
|-------|-------------|--------------|---------------|
| Wan 2.2 | Native (built-in) | None needed | ✅ Yes (GGUF Q4_K_M) |
| LTX-2.3 | Native + `ComfyUI-LTXVideo` | Lightricks node | ✅ Yes (fp8 transformer + Gemma fp8) |
| SkyReels V3 R2V + V2V | `ComfyUI-WanVideoWrapper` | Kijai node | ✅ Yes (fp8; reuses WAN encoder/VAE) |
| HunyuanVideo | Community | `ComfyUI-HunyuanVideoWrapper` (Kijai) | ❌ No (needs 45-80GB VRAM) |
| CogVideoX | Native | None needed | ❌ No |
| Mochi | Native | None needed | ❌ No |
| SkyReels V2 | `ComfyUI-WanVideoWrapper` | Kijai node | ❌ No (can add V2V-14B GGUF manually) |
| Open-Sora 2.0 | Partial community | `ComfyUI-Open-Sora-I2V` (v1.x) | ❌ No (needs 80GB GPU) |

### Container Workflow Library

Pre-installed into `${MOUNT_DIR}/user/default/workflows/` at startup (via `cp -n`, never overwrites user changes):

| Folder | File | Source | Purpose |
|--------|------|--------|---------|
| `LTX-2.3/` | `LTX-2.3_T2V_I2V_Single_Stage_Distilled_Full.json` | ComfyUI-LTXVideo repo | T2V + I2V single-stage |
| `LTX-2.3/` | `LTX-2.3_T2V_I2V_Two_Stage_Distilled.json` | ComfyUI-LTXVideo repo | T2V + I2V with upsampling |
| `LTX-2.3/` | `LTX-2.3_ICLoRA_Union_Control_Distilled.json` | ComfyUI-LTXVideo repo | IC-LoRA depth+pose+edge control |
| `LTX-2.3/` | `LTX-2.3_ICLoRA_Motion_Track_Distilled.json` | ComfyUI-LTXVideo repo | IC-LoRA motion tracking |
| `SkyReels-V3/` | `SkyReels-V3-R2V_phantom_multi-subject.json` | ComfyUI-WanVideoWrapper repo | R2V: multi-subject from ref images |
| `SkyReels-V3/` | `SkyReels-V3-V2V_pusa_video-extension.json` | ComfyUI-WanVideoWrapper repo | V2V: extend existing video |
| `WAN-2.2/` | `wan2.2_14B_I2V_pusa.json` | ComfyUI-WanVideoWrapper repo | WAN 2.2 image-to-video |
| `WAN-2.2/` | `wan2.2_5B_I2V.json` | ComfyUI-WanVideoWrapper repo | WAN 2.2 5B image-to-video |

> **Note on LTX-2.3 workflows**: The Lightricks example workflows reference the full-checkpoint model format (`checkpoints/`). Our container uses Kijai's transformer-only fp8 format (`diffusion_models/`). Users need to update the model loader node once when first opening an LTX-2.3 workflow. SkyReels V3 and WAN workflows work as-is since they use WanVideoWrapper's flexible model loader.
> 
> Native ComfyUI LTX-2.3 templates (via Template Library → Video) also work and auto-download their own model files.

### Container Model File Locations (`comfy_entrypoint.sh`)

| File | Path | Size | Purpose |
|------|------|------|---------|
| `wan2.2_t2v_high/low_noise_14B_Q4_K_M.gguf` | `unet/` | ~8GB×2 | WAN 2.2 T2V |
| `wan2.2_i2v_high/low_noise_14B_Q4_K_M.gguf` | `unet/` | ~8GB×2 | WAN 2.2 I2V |
| `umt5_xxl_fp8/fp16.safetensors` | `clip/` | ~10/20GB | WAN+SkyReels text encoder |
| `wan_2.1_vae.safetensors` | `vae/` | ~0.5GB | WAN+SkyReels VAE |
| `clip_vision_h.safetensors` | `clip_vision/` | ~2.5GB | WAN I2V + SkyReels R2V |
| `ltx-2.3-22b-distilled_transformer_only_fp8_scaled.safetensors` | `diffusion_models/` | ~23.5GB | LTX-2.3 transformer |
| `gemma_3_12B_it_fp8_e4m3fn.safetensors` | `clip/` | ~13.2GB | LTX-2.3 text encoder |
| `ltx-2.3_text_projection_bf16.safetensors` | `text_encoders/` | ~2.3GB | LTX-2.3 projection |
| `Wan21_SkyReelsV3-R2V_fp8_scaled_mixed.safetensors` | `diffusion_models/` | ~14.5GB | SkyReels V3 R2V |
| `Wan21-SkyReelsV3-V2V_fp8_scaled_mixed.safetensors` | `diffusion_models/` | ~14.5GB | SkyReels V3 V2V |

---

## Recommendations

- **Consumer GPU (8–16GB)**: Wan 2.2 TI2V-5B or LTX-2 (quantized), SkyReels-V2 1.3B
- **Mid-range (24GB)**: Wan 2.2 T2V-A14B fp8, LTX-2.3 distilled, SkyReels-V2 14B with offload
- **Need audio sync in one pass**: LTX-2.3 (only open-source model with synchronized audio-video)
- **Need character animation**: Wan 2.2 Animate-14B or SkyReels-V3 A2V (19B, high VRAM)
- **Need multi-subject / reference-to-video**: SkyReels-V3 R2V (1–4 reference images)
- **Need infinite-length / long video (>10s)**: SkyReels-V2 with Diffusion Forcing
- **Need video extension/continuation**: SkyReels-V3 V2V
- **Research / data-sovereign, 80GB GPU**: Open-Sora 2.0 (fully open training + weights)
- **Comparable to Seedance 2.0 locally**: Not possible — Wan 2.2 + SkyReels-V3 are the practical ceiling

---

## Sources
- [FindAIVideo: Best Open-Source Models 2026](https://findaivideo.com/blog/best-open-source-ai-video-models-2026-wan-ltx)
- [Wan 2.2 GitHub](https://github.com/wan-video/wan2.2)
- [LTX-2 ComfyUI Blog](https://blog.comfy.org/p/ltx-2-open-source-audio-video-ai)
- [HunyuanVideo GitHub](https://github.com/Tencent-Hunyuan/HunyuanVideo)
- [Open-Sora 2.0 GitHub](https://github.com/hpcaitech/Open-Sora)
- [Open-Sora 2.0 OOM issue on RTX 4090 × 8](https://github.com/hpcaitech/Open-Sora/issues/847)
- [SkyReels-V2 GitHub](https://github.com/SkyworkAI/SkyReels-V2)
- [SkyReels-V3 GitHub](https://github.com/SkyworkAI/SkyReels-V3)
- [SkyReels-V3 ComfyUI issue](https://github.com/Comfy-Org/ComfyUI/issues/12152)
- [Seedance 2.0 Paper (arXiv)](https://arxiv.org/abs/2604.14148)
- [Seedance 2.0 Open Source Analysis](https://www.glbgpt.com/hub/is-seedance-2-0-open-source-truth-about-bytedances-new-video-ai-2026/)
- [WAN 2.6 commercial discussion (Reddit)](https://www.reddit.com/r/comfyui/comments/1pnw6j9/)
