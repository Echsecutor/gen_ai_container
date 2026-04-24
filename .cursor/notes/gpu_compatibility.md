# GPU / CUDA Compatibility Notes

## Tesla P40 (Pascal, sm_61)

- **Compute Capability**: 6.1
- **CUDA Toolkit max**: 12.6 (CUDA 13.x drops support for sm_61)
- **PyTorch wheels**: cu126 (CUDA 12.6) is the last pre-built wheel that includes sm_61 binaries
  - PyTorch 2.6 + CUDA 12.6: **supported**
  - PyTorch 2.10 + CUDA 13.0: **NOT supported** (minimum sm_75)
- **Current base image**: `pytorch/pytorch:2.6.0-cuda12.6-cudnn9-runtime`

## Compatibility Matrix

| Compute Capability | Architectures | Max CUDA Toolkit | PyTorch wheels |
|---|---|---|---|
| 3.5 / 3.7 | Kepler (K80) | CUDA 10.2 | PyTorch 1.12.1 (cu102) |
| 5.x | Maxwell (M10/M60, GTX 9xx) | CUDA 12.4 | PyTorch 2.5 (cu124/cu121) |
| 6.x | **Pascal (P40, GTX 10xx)** | **CUDA 12.6** | **PyTorch 2.6 (cu126)** |
| 7.0 / 7.2 | Volta (V100) | CUDA 12.4 | PyTorch 2.5 (cu124/cu121) |
| 7.5+ | Turing / Ampere / Ada / Hopper / Blackwell | CUDA 12.8 / 13.x | PyTorch 2.7+ (cu128+) |

## Sources

- PyTorch cu128 dropping sm_61: https://github.com/astral-sh/uv/issues/14742
- Compatibility cheat sheet: https://llmlaba.com/articles/cuda-pytorch-compatibility.html

## Related Files

- `comfy.Dockerfile` — base image selection
- `comfy/comfy_entrypoint.sh` — runtime model downloads and ComfyUI startup
