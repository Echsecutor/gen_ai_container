# Sort Generated Pictures Script

## Locations
- Original: `scripts/sort_generated_pics` (for manual use)
- Integrated: `civit_model_loader/sort_generated_pics` (for Docker container use)

## Purpose
Bash script to automatically sort AI-generated PNG images into folders based on metadata (prompts, keywords, models).

## Sorting Modes

1. **Manual Keyword Sort** (`-s KEYWORD`): Sort by specific keyword
2. **Model Sort** (`-m`): Sort by model used in generation
3. **Auto Sort** (`-a`): Recursive intelligent sorting (RECOMMENDED)

## Auto-Sort Algorithm

### Balanced Binary Tree Approach (Optimized)

**Implementation Date**: 2025-12-12

The auto-sort feature uses a **balanced binary tree** algorithm to create optimal folder structures:

#### Key Strategy

1. **Find Most Balanced Split**: Instead of using the first valid keyword, evaluates ALL candidate keywords and chooses the one that splits files closest to 50-50
2. **Recursive Binary Splits**: Both matching and remaining files are processed recursively
3. **Target Size**: Aims for folder sizes of 3-20 files (optimal for manual browsing)

#### Algorithm Details

**`find_discriminating_keyword()` Function**:
- Extracts all keywords from all file prompts
- Filters out common words (a, the, and, etc.)
- Calculates balance score for each keyword: `|count - total_files/2|`
- Selects keyword with **minimum balance score** (closest to 50-50 split)
- Ensures minimum 3 files per side (for sets > 6 files)
- Tracks used keywords to prevent infinite loops

**`recursive_sort()` Function**:
- Base case: 3-20 files = optimal size, stop recursing
- Large sets (>20): Find discriminating keyword and split
- Fallback: If no good keyword found, split alphabetically by filename
- Recurse symmetrically into both halves
- Maximum depth: 10 levels (safety)

#### Benefits of Balanced Approach

**Before (Greedy)**: Taking first valid keyword could create 95:5 splits
- Deep, unbalanced tree
- Many recursion levels on one side
- Inefficient processing

**After (Balanced)**: Choosing best keyword creates ~50:50 splits
- Shallow, balanced tree with `log₂(n)` depth
- Equal processing on both sides
- More semantic folder organization
- Better distribution across folders

#### Example Split Quality

100 files with balanced approach:
- Level 1: 100 → 50 + 50
- Level 2: 50 → 25 + 25 (each side)
- Level 3: 25 → 12 + 13 (done, within 3-20 range)

Result: 3 levels vs potentially 20+ levels with greedy approach

## Metadata Extraction

Uses ImageMagick's `identify -verbose` to extract:
- Positive prompts (parameters section)
- Model names
- Other generation metadata

Prompts are cleaned:
- LoRA references removed (`<lora:...>`)
- Generation parameters removed (Steps, Sampler, etc.)
- Extra whitespace normalized

## Usage Examples

```bash
# Auto-sort all PNG files in current directory
./scripts/sort_generated_pics -a

# Sort by specific keyword
./scripts/sort_generated_pics -s "portrait"

# Sort by model
./scripts/sort_generated_pics -m
```

## Integration with Civit Model Loader

The script is now integrated into the civit_model_loader image conversion workflow:

- **UI Control**: Checkbox in conversion section (default enabled)
- **API Parameter**: `auto_sort` boolean in `ConversionRequest` (default: true)
- **Execution**: Called automatically by `ConversionManager` before ZIP creation
- **Error Handling**: Sort failures are logged but don't prevent conversion completion
- **ZIP Structure**: Sorted folder hierarchy is preserved in downloaded ZIP file

See `converter.md` for conversion manager integration details.

## Technical Notes

- Requires: bash, ImageMagick (`identify`), standard Unix tools
- Operates on PNG files with embedded metadata
- Creates nested folder structure in-place
- Safe recursion limit: 10 levels maximum
- Keyword tracking prevents infinite loops
- Runs asynchronously in conversion workflow without blocking
