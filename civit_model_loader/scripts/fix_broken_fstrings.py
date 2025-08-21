#!/usr/bin/env python3
"""
Script to automatically fix broken f-strings caused by autopep8.

This script fixes f-strings that have been broken across multiple lines by autopep8,
which creates SyntaxError: unterminated string literal.

Usage:
    python scripts/fix_broken_fstrings.py

The script will:
1. Find all .py files in the project
2. Identify f-strings broken across lines
3. Fix them by joining the parts back together
4. Report how many files were fixed

Example of what it fixes:
    BROKEN:
        file_info.thumbnail = f"data:image/jpeg;base64,{thumbnail_base64}"
    
    FIXED:
        file_info.thumbnail = f"data:image/jpeg;base64,{thumbnail_base64}"
"""
import re
import os
import glob


def fix_broken_fstring_in_file(filepath):
    """Fix broken f-strings in a single file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

    original_content = content

    # Pattern to match broken f-strings like: f"text{# followed by whitespace and newlines, then the continuation
    pattern = r'f"([^"]*{\s*)\n\s*([^}]*}[^"]*)"'

    def fix_match(match):
        prefix = match.group(1).strip()
        suffix = match.group(2).strip()
        return f'f"{prefix}{suffix}"'

    # Fix the pattern
    content = re.sub(pattern, fix_match, content, flags=re.MULTILINE)

    # Also handle cases where the variable name is on the next line
    pattern2 = r'f"([^"]*{)\s*\n\s*([^}]+)}([^"]*)"'

    def fix_match2(match):
        prefix = match.group(1).strip()
        variable = match.group(2).strip()
        suffix = match.group(3).strip()
        return f'f"{prefix}{variable}{suffix}"'

    content = re.sub(pattern2, fix_match2, content, flags=re.MULTILINE)

    if content != original_content:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed f-strings in {filepath}")
            return True
        except Exception as e:
            print(f"Error writing {filepath}: {e}")
            return False
    return False


def main():
    """Fix all Python files in the project."""
    print("🔧 Fixing broken f-strings caused by autopep8...")

    # Find all Python files
    python_files = []
    for pattern in ["*.py", "**/*.py"]:
        python_files.extend(glob.glob(pattern, recursive=True))

    # Remove duplicates and sort
    python_files = sorted(set(python_files))

    print(f"Found {len(python_files)} Python files to check")

    fixed_count = 0
    for filepath in python_files:
        if fix_broken_fstring_in_file(filepath):
            fixed_count += 1

    print(f"✅ Fixed broken f-strings in {fixed_count} files")

    if fixed_count > 0:
        print("\n📝 Recommendation: Update autopep8 configuration to prevent this issue:")
        print("   - Set aggressive = 0 in .autopep8 and pyproject.toml")
        print("   - Add E704,E127,E128,E124,E125,E126,E129 to ignore list")
        print(
            "   - Consider using Black formatter instead for more reliable string handling")


if __name__ == "__main__":
    main()
