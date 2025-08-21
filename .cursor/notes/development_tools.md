# Development Tools and Troubleshooting

## Autopep8 F-String Breaking Issue

### Problem

Autopep8 formatter breaks f-string literals across multiple lines, causing `SyntaxError: unterminated string literal` errors. This is a critical issue that prevents container startup.

**Example of broken f-string:**

```python
# BROKEN by autopep8:
file_info.thumbnail = f"data:image/jpeg;base64,{
    thumbnail_base64}"
# Results in: SyntaxError: unterminated string literal (detected at line X)
```

### Root Cause

Autopep8's aggressive line-length formatting attempts to break f-strings across lines, which is invalid Python syntax. This happens when:

- `aggressive = 1` or higher is set
- Line length limits are enforced strictly
- F-strings contain long variable names or expressions

### Solution

#### 1. Fixed Autopep8 Configuration

Located in `.autopep8` and `pyproject.toml`:

```ini
[autopep8]
max_line_length = 120
ignore = E501,W503,E704,E127,E128,E124,E125,E126,E129
aggressive = 0  # CRITICAL: Prevents string breaking
experimental = false
hang_closing = false
```

#### 2. Automated Fixing Script

**Location:** `civit_model_loader/scripts/fix_broken_fstrings.py`

**Usage:**

```bash
cd civit_model_loader
python scripts/fix_broken_fstrings.py
```

**Features:**

- Automatically finds all `.py` files in project
- Identifies broken f-strings using regex patterns
- Fixes them by joining broken parts
- Reports number of files fixed
- Handles multiple breaking patterns

**What it fixes:**

```python
# Pattern 1:
f"prefix{
    variable}suffix"
# Becomes:
f"prefix{variable}suffix"

# Pattern 2:
f"prefix{
variable}suffix"
# Becomes:
f"prefix{variable}suffix"
```

### Prevention Strategies

#### 1. Autopep8 Configuration

- **Set `aggressive = 0`** - Most important setting
- **Ignore formatting codes** that cause string breaking
- **Use `hang_closing = false`** to prevent line breaking

#### 2. Code Style Practices

```python
# GOOD - Keep f-strings on single lines when possible
url = f"data:image/jpeg;base64,{thumbnail_base64}"

# ALTERNATIVE - Use string concatenation for very long strings
url = "data:image/jpeg;base64," + thumbnail_base64

# AVOID - Complex f-strings that are likely to be broken
url = f"very_long_prefix_that_might_cause_line_breaks_{very_long_variable_name}_with_suffix"
```

#### 3. Alternative Formatters

Consider using **Black formatter** instead of autopep8:

- More reliable string handling
- Consistent formatting rules
- Less likely to break f-strings
- Better community support

### Validation Commands

**Check syntax of all Python files:**

```bash
find . -name "*.py" -exec python -m py_compile {} \;
```

**Find broken f-strings:**

```bash
grep -n "f\".*{$" *.py **/*.py
```

**Test specific file:**

```bash
python -m py_compile filename.py
```

### Recovery Process

When f-strings get broken:

1. **Identify broken files:**

   ```bash
   find . -name "*.py" -exec python -m py_compile {} \; 2>&1 | grep -B1 "unterminated string"
   ```

2. **Run the fixing script:**

   ```bash
   python scripts/fix_broken_fstrings.py
   ```

3. **Verify fixes:**

   ```bash
   find . -name "*.py" -exec python -m py_compile {} \;
   ```

4. **Update configuration** if needed to prevent recurrence

### Error Codes in Autopep8 Config

**Ignored error codes and their purpose:**

- **E501**: Line too long (manual handling for strings)
- **W503**: Line break before binary operator
- **E704**: Multiple statements on one line (prevents string joining issues)
- **E127**: Continuation line over-indented for hanging indent
- **E128**: Continuation line under-indented for hanging indent
- **E124**: Closing bracket does not match indentation
- **E125**: Continuation line indentation
- **E126**: Continuation line over-indented for hanging indent
- **E129**: Visually indented line with same indent as next logical line

### Files Involved

**Configuration Files:**

- `civit_model_loader/.autopep8`
- `civit_model_loader/pyproject.toml`

**Recovery Tools:**

- `civit_model_loader/scripts/fix_broken_fstrings.py`

**Documentation:**

- `civit_model_loader/AUTOPEP8_SAFETY.md` (detailed prevention guide)

### Best Practices

1. **Always test syntax** after running autopep8
2. **Use the fixing script** as first response to syntax errors
3. **Keep f-strings simple** and on single lines when possible
4. **Consider alternative formatters** if autopep8 continues to cause issues
5. **Monitor configuration files** to ensure they don't get reset
