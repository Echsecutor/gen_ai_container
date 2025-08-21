#!/usr/bin/env python3
"""
Comprehensive test runner for all new functionality.
Runs tests for thumbnail generation and list-files endpoint.
"""

import sys
import subprocess
import os
from pathlib import Path


def run_test_script(script_name):
    """Run a test script and return (success, output)."""
    script_path = Path(__file__).parent / script_name

    if not script_path.exists():
        return False, f"Test script not found: {script_name}"

    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout
        )

        success = result.returncode == 0
        output = result.stdout
        if result.stderr:
            output += "\nSTDERR:\n" + result.stderr

        return success, output

    except subprocess.TimeoutExpired:
        return False, f"Test script {script_name} timed out after 2 minutes"
    except Exception as e:
        return False, f"Error running test script {script_name}: {e}"


def main():
    """Run all tests and report results."""
    print("🧪 Running Comprehensive Test Suite")
    print("=" * 60)
    print()

    test_scripts = [
        ("Thumbnail Module Tests", "test_thumbnail.py"),
        ("List Files Endpoint Tests", "test_list_files_endpoint.py"),
    ]

    all_passed = True
    results = []

    for test_name, script_name in test_scripts:
        print(f"🔬 Running: {test_name}")
        print("-" * 40)

        success, output = run_test_script(script_name)
        results.append((test_name, success, output))

        if success:
            print(f"✅ {test_name}: PASSED")
            # Show summary line from output
            lines = output.strip().split('\n')
            for line in reversed(lines):
                if "passed" in line and "failed" in line:
                    print(f"   📊 {line}")
                    break
        else:
            print(f"❌ {test_name}: FAILED")
            all_passed = False
            # Show last few lines of output for debugging
            lines = output.strip().split('\n')
            print("   Last few lines of output:")
            for line in lines[-5:]:
                if line.strip():
                    print(f"   {line}")

        print()

    # Summary
    print("=" * 60)
    print("📋 COMPREHENSIVE TEST SUMMARY")
    print("=" * 60)

    passed_count = sum(1 for _, success, _ in results if success)
    total_count = len(results)

    for test_name, success, _ in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_name:.<40} {status}")

    print()
    print(f"📊 Overall Results: {passed_count}/{total_count} test suites passed")

    if all_passed:
        print("🎉 ALL TESTS PASSED! The new functionality is working correctly.")
        print()
        print("✨ Features successfully tested:")
        print("   • Thumbnail generation with intelligent caching")
        print("   • File format detection and processing")
        print("   • LRU cache eviction and memory management")
        print("   • Error handling for edge cases")
        print("   • Data model validation and serialization")
        print("   • Integration with existing test images")
        return 0
    else:
        print("⚠️  Some tests failed. Please review the output above.")
        print()
        print("🔧 To debug failures:")
        print("   • Run individual test scripts for detailed output")
        print("   • Check error messages in the output above")
        print("   • Ensure all dependencies are properly installed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
