# Changelog: Shipping Invoke AI

## WIP

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

