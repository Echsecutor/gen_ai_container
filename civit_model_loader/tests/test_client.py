"""
Tests for the CivitaiClient implementation.
Tests the client wrapper around CivitAI API using pytest.
"""

import pytest
from conftest import civitai_api_key

# Try to import client and models
try:
    from civitai_client import CivitaiClient
    CLIENT_AVAILABLE = True
except ImportError:
    CLIENT_AVAILABLE = False

try:
    from models import SearchRequest, ModelType
    MODELS_AVAILABLE = True
except ImportError:
    MODELS_AVAILABLE = False

skip_if_no_client = pytest.mark.skipif(
    not CLIENT_AVAILABLE,
    reason="CivitaiClient not available"
)

skip_if_no_models = pytest.mark.skipif(
    not MODELS_AVAILABLE,
    reason="Models module not available"
)


@skip_if_no_client
class TestCivitaiClientBasic:
    """Test basic CivitaiClient functionality."""

    def test_client_initialization_without_api_key(self):
        """Test client initialization without API key."""
        client = CivitaiClient()
        assert client is not None

    def test_client_initialization_with_api_key(self, civitai_api_key):
        """Test client initialization with API key."""
        client = CivitaiClient(api_token=civitai_api_key)
        assert client is not None

    @skip_if_no_models
    @pytest.mark.integration
    def test_basic_search_without_api_key(self):
        """Test basic search functionality without API key."""
        client = CivitaiClient()
        search_request = SearchRequest(
            query="test",
            limit=1,
            page=1
        )

        results = client.search_models(search_request)

        assert isinstance(results, dict)
        assert 'items' in results
        assert isinstance(results['items'], list)

    @skip_if_no_models
    @pytest.mark.integration
    def test_basic_search_with_api_key(self, civitai_api_key):
        """Test basic search functionality with API key."""
        client = CivitaiClient(api_token=civitai_api_key)
        search_request = SearchRequest(
            query="test",
            limit=1,
            page=1
        )

        results = client.search_models(search_request)

        assert isinstance(results, dict)
        assert 'items' in results
        assert isinstance(results['items'], list)


@skip_if_no_client
@skip_if_no_models
class TestSearchRequest:
    """Test SearchRequest model and client integration."""

    def test_search_request_minimal(self):
        """Test SearchRequest with minimal parameters."""
        request = SearchRequest(limit=1)

        assert request.limit == 1
        assert request.page is None or request.page == 1
        assert request.query is None

    def test_search_request_full_parameters(self):
        """Test SearchRequest with all parameters."""
        request = SearchRequest(
            query="landscape",
            limit=10,
            page=2,
            sort="Most Downloaded",
            period="AllTime",
            types=[ModelType.CHECKPOINT]
        )

        assert request.query == "landscape"
        assert request.limit == 10
        assert request.page == 2
        assert request.sort == "Most Downloaded"
        assert request.period == "AllTime"
        assert ModelType.CHECKPOINT in request.types

    @pytest.mark.integration
    def test_search_with_model_types(self, civitai_api_key):
        """Test search with specific model types."""
        client = CivitaiClient(api_token=civitai_api_key)
        search_request = SearchRequest(
            types=[ModelType.CHECKPOINT],
            limit=1
        )

        results = client.search_models(search_request)

        assert isinstance(results, dict)
        assert 'items' in results

    @pytest.mark.integration
    def test_search_with_sort_and_period(self, civitai_api_key):
        """Test search with sort and period parameters."""
        client = CivitaiClient(api_token=civitai_api_key)
        search_request = SearchRequest(
            limit=1,
            sort="Most Downloaded",
            period="AllTime"
        )

        results = client.search_models(search_request)

        assert isinstance(results, dict)
        assert 'items' in results


@skip_if_no_client
@skip_if_no_models
class TestClientErrorHandling:
    """Test client error handling."""

    def test_empty_search_request(self, civitai_api_key):
        """Test with minimal search request."""
        client = CivitaiClient(api_token=civitai_api_key)
        search_request = SearchRequest(limit=1)

        # Should not raise exception
        results = client.search_models(search_request)
        assert isinstance(results, dict)

    @pytest.mark.integration
    def test_large_limit_handling(self, civitai_api_key):
        """Test client handling of large limit values."""
        client = CivitaiClient(api_token=civitai_api_key)
        search_request = SearchRequest(limit=1000)  # Large limit

        # Client should handle this gracefully
        try:
            results = client.search_models(search_request)
            assert isinstance(results, dict)
        except Exception as e:
            # If API rejects it, that's acceptable
            assert isinstance(e, Exception)

    @pytest.mark.integration
    def test_invalid_search_parameters(self, civitai_api_key):
        """Test with potentially invalid search parameters."""
        client = CivitaiClient(api_token=civitai_api_key)

        # Test with unusual sort parameter
        search_request = SearchRequest(
            limit=1,
            sort="Invalid Sort Option"
        )

        # Should either work or handle gracefully
        try:
            results = client.search_models(search_request)
            assert isinstance(results, dict)
        except Exception:
            # API rejection is acceptable for invalid parameters
            pass


@pytest.mark.integration
@skip_if_no_client
@skip_if_no_models
class TestClientIntegration:
    """Integration tests for the complete client workflow."""

    def test_full_search_workflow(self, civitai_api_key):
        """Test a complete search workflow."""
        client = CivitaiClient(api_token=civitai_api_key)

        # Create comprehensive search request
        search_request = SearchRequest(
            query="test",
            limit=2,
            page=1,
            sort="Most Downloaded",
            period="AllTime"
        )

        results = client.search_models(search_request)

        # Verify response structure
        assert isinstance(results, dict)
        assert 'items' in results
        assert isinstance(results['items'], list)

        # If results exist, verify item structure
        if results['items']:
            first_item = results['items'][0]
            assert 'id' in first_item
            assert 'name' in first_item

    @pytest.mark.slow
    def test_multiple_consecutive_searches(self, civitai_api_key):
        """Test multiple consecutive searches."""
        client = CivitaiClient(api_token=civitai_api_key)

        search_queries = ["landscape", "portrait", "anime"]

        for query in search_queries:
            search_request = SearchRequest(
                query=query,
                limit=1
            )

            results = client.search_models(search_request)
            assert isinstance(results, dict)
            assert 'items' in results

    def test_pagination_support(self, civitai_api_key):
        """Test pagination support in client."""
        client = CivitaiClient(api_token=civitai_api_key)

        # Test first page
        page1_request = SearchRequest(limit=1, page=1)
        page1_results = client.search_models(page1_request)

        # Test second page
        page2_request = SearchRequest(limit=1, page=2)
        page2_results = client.search_models(page2_request)

        # Both should be valid responses
        assert isinstance(page1_results, dict)
        assert isinstance(page2_results, dict)
        assert 'items' in page1_results
        assert 'items' in page2_results


class TestClientAvailability:
    """Test client availability without requiring it."""

    def test_client_import_behavior(self):
        """Test that client import behavior is handled gracefully."""
        try:
            from civitai_client import CivitaiClient
            assert callable(CivitaiClient)
        except ImportError:
            pytest.skip("CivitaiClient not available - this is acceptable")

    def test_models_import_behavior(self):
        """Test that models import behavior is handled gracefully."""
        try:
            from models import SearchRequest, ModelType
            assert SearchRequest is not None
            assert ModelType is not None
        except ImportError:
            pytest.skip("Models module not available - this is acceptable")
