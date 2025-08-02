#!/usr/bin/env python3
"""
Test script to debug CivitAI API issues
"""
import requests
import json
try:
    from test_config import CIVITAI_API_KEY
except ImportError:
    print("WARNING: test_config.py not found. Please create it with your API key.")
    CIVITAI_API_KEY = "your_api_key_here"


def test_civitai_api():
    """Test various CivitAI API calls to identify correct parameter format"""

    api_key = CIVITAI_API_KEY
    base_url = "https://civitai.com/api/v1"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "CivitAI-Model-Loader/1.0"
    }

    print("=== Testing CivitAI API ===")
    print(f"API Key: {api_key[:10]}...")
    print(f"Base URL: {base_url}")
    print()

    # Test 1: Basic models endpoint without parameters
    print("1. Testing basic models endpoint...")
    try:
        response = requests.get(
            f"{base_url}/models", headers=headers, params={"limit": 1})
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Found {len(data.get('items', []))} models")
            if data.get('items'):
                print(f"First model: {data['items'][0]['name']}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")
    print()

    # Test 2: Test with simple query
    print("2. Testing with simple query...")
    try:
        params = {
            "limit": 1,
            "query": "landscape"
        }
        response = requests.get(
            f"{base_url}/models", headers=headers, params=params)
        print(f"Status: {response.status_code}")
        print(f"URL: {response.url}")
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Found {len(data.get('items', []))} models")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")
    print()

    # Test 3: Test sort parameters
    print("3. Testing sort parameters...")
    sort_options = ["Newest", "Most Downloaded",
                    "Most Liked", "Most Discussed"]
    for sort_param in sort_options:
        try:
            params = {
                "limit": 1,
                "sort": sort_param
            }
            response = requests.get(
                f"{base_url}/models", headers=headers, params=params)
            print(f"Sort '{sort_param}': {
                  response.status_code} - {response.url}")
            if response.status_code != 200:
                print(f"  Error: {response.text}")
        except Exception as e:
            print(f"  Exception: {e}")
    print()

    # Test 4: Test period parameters
    print("4. Testing period parameters...")
    period_options = ["AllTime", "Year", "Month", "Week", "Day"]
    for period_param in period_options:
        try:
            params = {
                "limit": 1,
                "sort": "Most Downloaded",
                "period": period_param
            }
            response = requests.get(
                f"{base_url}/models", headers=headers, params=params)
            print(f"Period '{period_param}': {
                  response.status_code} - {response.url}")
            if response.status_code != 200:
                print(f"  Error: {response.text}")
        except Exception as e:
            print(f"  Exception: {e}")
    print()

    # Test 5: Test model types
    print("5. Testing model types...")
    model_types = ["Checkpoint", "LORA", "TextualInversion"]
    for model_type in model_types:
        try:
            params = {
                "limit": 1,
                "types": model_type
            }
            response = requests.get(
                f"{base_url}/models", headers=headers, params=params)
            print(f"Type '{model_type}': {
                  response.status_code} - {response.url}")
            if response.status_code != 200:
                print(f"  Error: {response.text}")
        except Exception as e:
            print(f"  Exception: {e}")
    print()

    # Test 6: Test without API key
    print("6. Testing without API key...")
    try:
        params = {"limit": 1}
        response = requests.get(f"{base_url}/models", params=params)
        print(f"No API key: {response.status_code}")
        if response.status_code == 200:
            print("Success - API key not required for basic queries")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")


if __name__ == "__main__":
    test_civitai_api()
