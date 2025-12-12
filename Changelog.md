# Changelog: Shipping Invoke AI

## WIP

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

## 1.2.0 (2025-03-01)

- Invoke AI upgraded to 5.6.0
- `enable_partial_loading: true`

## 1.1.0 (2025-02-11)
 
 - More directories moved into mounted folder for persistence Latest

## 1.0.1 (2025-01-22)

- Separated models and invoke dir

