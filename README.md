[![Building Container](https://github.com/Echsecutor/invoke_ai_container/actions/workflows/build-all.yml/badge.svg)](https://github.com/Echsecutor/invoke_ai_container/actions/workflows/build-all.yml)

# Shipping AI Containers

<img alt="Artificial Inteligence Cyborg Shipping" src="./shipping_ai.png" height="500" />


## Invoke AI Container

This is a minimalist container running invoke web UI. No nonsense included. Just starts the invoke web ui and exposes the port.

- [Run this ComfyUI Container on runpod](https://runpod.io/console/deploy?template=elr3w646vn&ref=c71blwtm)
- See https://www.invoke.com/ for Invoke AI Details
  - This container is not created by/endorsed by invoke.
  - I have just turned the installation manual at https://invoke-ai.github.io/InvokeAI/installation/manual/#walkthrough into a Dockerfile.

### Working Invoke AI Features (testet in container on runpod)
- Install + Use starter Models/Models from Huggin Face/Any Models via URL, e.g. from civitai
- Benchmarks on runpod on A40:
  - SD1,
    - Image generation wall clock time (512x512, 30 steps)  <3s
  - SDXL/Pony
    - Image generation wall clock time (1024x1024, 30 steps) <10s
  - FLUX Models
    - Image generation wall clock time (1024x1024, 30 step) <30s

### Config
- Models, the database, outputs,... in short everything you might want to persist is stored in the volume mounted under `/workspace`
- `/invoke/` contains e.g. the invoke ai config generated at build time
- Invoke AI Web Service exposed on port 8080 (no login)
- Exposes Port 22 for scp (through runpod forwarding)


### Container Build

- This repository contains [a script](./scripts/install_invoke_ai.sh) version of the manual found at 
https://invoke-ai.github.io/InvokeAI/installation/manual/
to install invoke ai into a fresh ubuntu image.
- This script [was transformed into a Dockerfile](./invoke_ai_container/Dockerfile)

### Usage

Run locally:
- Be sure to have nvidia stuff installed: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html

```
docker run --gpus all --rm -it --name invoke -p 8080:8080 -v YOUR_LOCAL_MODEL_DIR:/workspace ghcr.io/echsecutor/gen_ai_container/invoke:main
```

[Or use the provided script](./scripts/run_invoke_ai)

## Comfy UI Container

- [Run on Runpod](https://runpod.io/console/deploy?template=7si05wcrgv&ref=c71blwtm)
- [See the Comfy UI Docs for how to use Comfy UI](https://docs.comfy.org/tutorials/basic/text-to-image)


### Config

- Models, custom nodes, outputs,... in short everything you might want to persist is stored in the volume mounted under `/workspace`

### Usage

Run locally:
- Be sure to have nvidia stuff installed: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html

```
docker run --gpus all --rm -it --name invoke -p 8080:8080 -v YOUR_LOCAL_MODEL_DIR:/workspace ghcr.io/echsecutor/gen_ai_container/comfy:main
```

[Or just use the provided script](./scripts/run_comfy)


# License

Copyright 2025 Sebastian Schmittner

The Docker files/scripts in this repository is not endorsed by anyone but the author.

The Invoke AI container bundles [InvokeAI](https://github.com/invoke-ai/InvokeAI), which ships under the [Apache 2 License](https://github.com/invoke-ai/InvokeAI/blob/main/LICENSE). All credit for Invoke AI go to the Invoke AI Team. 

The ComfyUI Container contains [ComfyUI](https://github.com/comfyanonymous/ComfyUI) which ships under [GPLv3](https://github.com/comfyanonymous/ComfyUI/blob/master/LICENSE). All credits go to the ComfyUI team.


<a href="https://opensource.org/license/mit">
<img alt="Open Source Initiative Approved License" height="200" src="https://opensource.org/wp-content/themes/osi/assets/img/osi-badge-light.svg" />
</a>

All code in this repository is distributed under the <a href="./LICENSE">MIT License</a>.
