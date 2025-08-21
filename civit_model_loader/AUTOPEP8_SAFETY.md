# Autopep8 Safety Configuration

## Problem

Autopep8 was breaking f-string literals across lines, causing SyntaxErrors like:

```python
# BROKEN by autopep8:
file_info.thumbnail = f"data:image/jpeg;base64,{
    thumbnail_base64}"
# SyntaxError: unterminated string literal (detected at line X)
```

## Solution

Enhanced autopep8 configuration in both `.autopep8` and `pyproject.toml`:

### Key Settings:

- `ignore = E501,W503,E704,E127,E128` - Ignores formatting rules that break strings
- `hang_closing = false` - Prevents improper line breaking
- `experimental = false` - Avoids experimental features that might break strings
- `aggressive = 1` - Balanced formatting without string breaking

### Error Codes Ignored:

- **E501**: Line too long (we handle this manually for strings)
- **W503**: Line break before binary operator
- **E704**: Multiple statements on one line (prevents string joining issues)
- **E127**: Continuation line over-indented for hanging indent
- **E128**: Continuation line under-indented for hanging indent

## Prevention

### Best Practices:

1. **Keep f-strings on single lines** when possible
2. **Use string concatenation** for very long strings:

   ```python
   # GOOD:
   url = "data:image/jpeg;base64," + thumbnail_base64

   # RISKY (might get broken by formatter):
   url = f"data:image/jpeg;base64,{thumbnail_base64}"
   ```

3. **Test syntax after formatting** with:
   ```bash
   python -m py_compile filename.py
   ```

### VS Code Settings:

If using VS Code with autopep8, ensure your settings.json includes:

```json
{
  "python.formatting.autopep8Args": [
    "--ignore=E501,W503,E704,E127,E128",
    "--hang-closing=false",
    "--experimental=false"
  ]
}
```

## Validation

Always run syntax validation after formatting:

```bash
# Check single file
python -m py_compile main.py

# Check all Python files
find . -name "*.py" -exec python -m py_compile {} \;
```

## Recovery

If f-strings get broken:

1. **Find broken strings**: `grep -n "f\".*{$" *.py`
2. **Fix manually**: Join broken parts back to single line
3. **Update config**: Ensure autopep8 settings are correct
4. **Test syntax**: `python -m py_compile filename.py`

This configuration prevents the formatter from creating syntax errors while maintaining code quality.
