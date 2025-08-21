"""
Tests for CivitAI API functionality.
Tests various CivitAI API calls to identify correct parameter formats using pytest.
"""

import pytest
import requests

from conftest import civitai_api_key


class TestCivitAIAPIBasic:
    """Test basic CivitAI API functionality."""

    @pytest.fixture
    def api_config(self, civitai_api_key):
        """Configuration for API tests."""
        return {
            'api_key': civitai_api_key,
            'base_url': 'https://civitai.com/api/v1',
            'headers': {
                'Authorization': f'Bearer {civitai_api_key}',
                'User-Agent': 'CivitAI-Model-Loader/1.0'
            }
        }

    @pytest.mark.integration
    def test_basic_models_endpoint(self, api_config):
        """Test basic models endpoint without parameters."""
        response = requests.get(
            f"{api_config['base_url']}/models",
            headers=api_config['headers'],
            params={'limit': 1},
            timeout=10
        )

        assert response.status_code == 200
        data = response.json()
        assert 'items' in data
        assert isinstance(data['items'], list)

    @pytest.mark.integration
    def test_api_without_key(self, api_config):
        """Test API access without authentication."""
        response = requests.get(
            f"{api_config['base_url']}/models",
            params={'limit': 1},
            timeout=10
        )

        # API should work without key for basic queries
        assert response.status_code == 200
        data = response.json()
        assert 'items' in data

    @pytest.mark.integration
    def test_simple_query_search(self, api_config):
        """Test with simple query parameter."""
        params = {
            'limit': 1,
            'query': 'landscape'
        }
        response = requests.get(
            f"{api_config['base_url']}/models",
            headers=api_config['headers'],
            params=params,
            timeout=10
        )

        assert response.status_code == 200
        data = response.json()
        assert 'items' in data


class TestCivitAIAPISortParameters:
    """Test CivitAI API sort parameters."""

    @pytest.fixture
    def api_config(self, civitai_api_key):
        """Configuration for API tests."""
        return {
            'base_url': 'https://civitai.com/api/v1',
            'headers': {
                'Authorization': f'Bearer {civitai_api_key}',
                'User-Agent': 'CivitAI-Model-Loader/1.0'
            }
        }

    @pytest.mark.integration
    @pytest.mark.parametrize("sort_param", [
        "Newest",
        "Most Downloaded",
        "Most Liked",
        "Most Discussed"
    ])
    def test_sort_parameters(self, api_config, sort_param):
        """Test various sort parameters."""
        params = {
            'limit': 1,
            'sort': sort_param
        }
        response = requests.get(
            f"{api_config['base_url']}/models",
            headers=api_config['headers'],
            params=params,
            timeout=10
        )

        # Some sort parameters might not be valid
        # Just verify we get a reasonable response
        assert response.status_code in [200, 400, 422]

        if response.status_code == 200:
            data = response.json()
            assert 'items' in data


class TestCivitAIAPIPeriodParameters:
    """Test CivitAI API period parameters."""

    @pytest.fixture
    def api_config(self, civitai_api_key):
        """Configuration for API tests."""
        return {
            'base_url': 'https://civitai.com/api/v1',
            'headers': {
                'Authorization': f'Bearer {civitai_api_key}',
                'User-Agent': 'CivitAI-Model-Loader/1.0'
            }
        }

    @pytest.mark.integration
    @pytest.mark.parametrize("period_param", [
        "AllTime",
        "Year",
        "Month",
        "Week",
        "Day"
    ])
    def test_period_parameters(self, api_config, period_param):
        """Test various period parameters."""
        params = {
            'limit': 1,
            'sort': 'Most Downloaded',
            'period': period_param
        }
        response = requests.get(
            f"{api_config['base_url']}/models",
            headers=api_config['headers'],
            params=params,
            timeout=10
        )

        # Period parameters might not all be valid
        assert response.status_code in [200, 400, 422]

        if response.status_code == 200:
            data = response.json()
            assert 'items' in data


class TestCivitAIAPIModelTypes:
    """Test CivitAI API model type parameters."""

    @pytest.fixture
    def api_config(self, civitai_api_key):
        """Configuration for API tests."""
        return {
            'base_url': 'https://civitai.com/api/v1',
            'headers': {
                'Authorization': f'Bearer {civitai_api_key}',
                'User-Agent': 'CivitAI-Model-Loader/1.0'
            }
        }

    @pytest.mark.integration
    @pytest.mark.parametrize("model_type", [
        "Checkpoint",
        "LORA",
        "TextualInversion"
    ])
    def test_model_types(self, api_config, model_type):
        """Test various model type parameters."""
        params = {
            'limit': 1,
            'types': model_type
        }
        response = requests.get(
            f"{api_config['base_url']}/models",
            headers=api_config['headers'],
            params=params,
            timeout=10
        )

        # Model types should generally work
        assert response.status_code in [200, 400, 422]

        if response.status_code == 200:
            data = response.json()
            assert 'items' in data


class TestCivitAIAPIErrorHandling:
    """Test CivitAI API error handling."""

    @pytest.fixture
    def api_config(self, civitai_api_key):
        """Configuration for API tests."""
        return {
            'base_url': 'https://civitai.com/api/v1',
            'headers': {
                'Authorization': f'Bearer {civitai_api_key}',
                'User-Agent': 'CivitAI-Model-Loader/1.0'
            }
        }

    @pytest.mark.integration
    def test_invalid_endpoint(self, api_config):
        """Test with invalid API endpoint."""
        response = requests.get(
            f"{api_config['base_url']}/invalid_endpoint",
            headers=api_config['headers'],
            timeout=10
        )

        assert response.status_code == 404

    @pytest.mark.integration
    def test_large_limit_parameter(self, api_config):
        """Test with unreasonably large limit parameter."""
        params = {'limit': 10000}
        response = requests.get(
            f"{api_config['base_url']}/models",
            headers=api_config['headers'],
            params=params,
            timeout=10
        )

        # API should handle this gracefully
        assert response.status_code in [200, 400, 422]

    @pytest.mark.integration
    def test_invalid_parameters(self, api_config):
        """Test with invalid parameter combinations."""
        params = {
            'limit': 1,
            'invalid_param': 'invalid_value'
        }
        response = requests.get(
            f"{api_config['base_url']}/models",
            headers=api_config['headers'],
            params=params,
            timeout=10
        )

        # Should either work (ignoring invalid params) or return error
        assert response.status_code in [200, 400, 422]


@pytest.mark.slow
@pytest.mark.integration
class TestCivitAIAPIIntegration:
    """Integration tests for CivitAI API."""

    def test_api_response_structure(self, civitai_api_key):
        """Test that API responses have expected structure."""
        headers = {
            'Authorization': f'Bearer {civitai_api_key}',
            'User-Agent': 'CivitAI-Model-Loader/1.0'
        }

        response = requests.get(
            'https://civitai.com/api/v1/models',
            headers=headers,
            params={'limit': 2},
            timeout=15
        )

        assert response.status_code == 200
        data = response.json()

        # Check response structure
        assert 'items' in data
        assert isinstance(data['items'], list)

        if data['items']:
            # Check structure of first item
            first_item = data['items'][0]
            assert 'id' in first_item
            assert 'name' in first_item
            assert isinstance(first_item['id'], int)
            assert isinstance(first_item['name'], str)

    def test_pagination_metadata(self, civitai_api_key):
        """Test that pagination metadata is included."""
        headers = {
            'Authorization': f'Bearer {civitai_api_key}',
            'User-Agent': 'CivitAI-Model-Loader/1.0'
        }

        response = requests.get(
            'https://civitai.com/api/v1/models',
            headers=headers,
            params={'limit': 1, 'page': 1},
            timeout=15
        )

        assert response.status_code == 200
        data = response.json()

        # Check for pagination metadata (if provided by API)
        # Note: Actual metadata fields may vary
        assert 'items' in data
