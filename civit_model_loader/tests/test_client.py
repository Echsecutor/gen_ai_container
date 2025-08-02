#!/usr/bin/env python3
"""
Test script to debug the CivitaiClient implementation
"""
import json
from civitai_client import CivitaiClient
from models import SearchRequest, ModelType
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from test_config import CIVITAI_API_KEY
except ImportError:
    print("WARNING: test_config.py not found. Please create it with your API key.")
    CIVITAI_API_KEY = "your_api_key_here"


def test_civitai_client():
    """Test the CivitaiClient implementation"""

    api_key = CIVITAI_API_KEY

    print("=== Testing CivitaiClient Implementation ===")
    print(f"API Key: {api_key[:10]}...")
    print()

    # Test 1: Client without API key
    print("1. Testing client without API key...")
    try:
        client = CivitaiClient()
        search_request = SearchRequest(
            query="test",
            limit=1,
            page=1,
            sort="Most Downloaded",
            period="AllTime"
        )
        results = client.search_models(search_request)
        print("Success!")
        print(f"Found {len(results.get('items', []))} models")
    except Exception as e:
        print(f"Error: {e}")
    print()

    # Test 2: Client with API key
    print("2. Testing client with API key...")
    try:
        client = CivitaiClient(api_token=api_key)
        search_request = SearchRequest(
            query="test",
            limit=1,
            page=1,
            sort="Most Downloaded",
            period="AllTime"
        )
        results = client.search_models(search_request)
        print("Success!")
        print(f"Found {len(results.get('items', []))} models")
    except Exception as e:
        print(f"Error: {e}")
    print()

    # Test 3: Test with model types
    print("3. Testing with model types...")
    try:
        client = CivitaiClient(api_token=api_key)
        search_request = SearchRequest(
            types=[ModelType.CHECKPOINT],
            limit=1
        )
        results = client.search_models(search_request)
        print("Success!")
        print(f"Found {len(results.get('items', []))} models")
    except Exception as e:
        print(f"Error: {e}")
    print()

    # Test 4: Test basic search (no parameters)
    print("4. Testing basic search...")
    try:
        client = CivitaiClient(api_token=api_key)
        search_request = SearchRequest(limit=1)
        results = client.search_models(search_request)
        print("Success!")
        print(f"Found {len(results.get('items', []))} models")
        if results.get('items'):
            model = results['items'][0]
            print(f"First model: {model['name']}")
    except Exception as e:
        print(f"Error: {e}")
    print()

    # Test 5: Test the actual client method with query search
    print("5. Testing client method with query search...")
    try:
        client = CivitaiClient(api_token=api_key)
        search_request = SearchRequest(
            query="test",
            limit=1,
            page=1,
            sort="Most Downloaded",
            period="AllTime"
        )

        print("Search request parameters:")
        print(f"  query: {search_request.query}")
        print(f"  limit: {search_request.limit}")
        print(f"  page: {search_request.page}")
        print(f"  sort: {search_request.sort}")
        print(f"  period: {search_request.period}")

        # Use the actual client method
        results = client.search_models(search_request)
        print("Success!")
        print(f"Found {len(results.get('items', []))} models")
        if results.get('items'):
            model = results['items'][0]
            print(f"First model: {model['name']}")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    test_civitai_client()
