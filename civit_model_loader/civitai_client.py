import requests
import aiohttp
import aiofiles
import asyncio
from typing import List, Dict, Any, Optional
from models import CivitaiModel, CivitaiModelVersion, SearchRequest
import logging

logger = logging.getLogger(__name__)


class CivitaiClient:
    BASE_URL = "https://civitai.com/api/v1"

    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token
        self.session = requests.Session()
        if api_token:
            self.session.headers.update(
                {"Authorization": f"Bearer {api_token}"})

    def search_models(self, search_request: SearchRequest) -> Dict[str, Any]:
        """Search for models using the Civitai API"""
        params = {
            "limit": search_request.limit,
            "sort": search_request.sort,
            "period": search_request.period
        }

        # CivitAI API doesn't allow 'page' parameter when using 'query'
        # For query searches, use cursor-based pagination instead
        if search_request.query:
            params["query"] = search_request.query
            # Use cursor-based pagination for query searches
            if search_request.cursor:
                params["cursor"] = search_request.cursor
            # Don't include page parameter for query searches
        else:
            # Only include page parameter for non-query searches
            params["page"] = search_request.page

        if search_request.types:
            # Handle both string and ModelType enum values
            params["types"] = [t.value if hasattr(
                t, 'value') else t for t in search_request.types]

        if search_request.nsfw is not None:
            params["nsfw"] = search_request.nsfw

        try:
            response = self.session.get(
                f"{self.BASE_URL}/models", params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Error searching models: {e}")
            raise

    def get_model(self, model_id: int) -> Dict[str, Any]:
        """Get detailed information about a specific model"""
        try:
            response = self.session.get(f"{self.BASE_URL}/models/{model_id}")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Error fetching model {model_id}: {e}")
            raise

    def get_model_version(self, version_id: int) -> Dict[str, Any]:
        """Get detailed information about a specific model version"""
        try:
            response = self.session.get(
                f"{self.BASE_URL}/model-versions/{version_id}")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Error fetching model version {version_id}: {e}")
            raise

    def get_download_url(self, model_id: int, version_id: int, file_id: int) -> str:
        """Get the download URL for a specific model file"""
        # The download URL is typically provided in the model version details
        # For direct download, we use the file's downloadUrl from the model data
        version_data = self.get_model_version(version_id)

        for file_info in version_data.get("files", []):
            if file_info["id"] == file_id:
                return file_info["downloadUrl"]

        raise ValueError(f"File {file_id} not found in version {version_id}")

    def download_file_stream(self, download_url: str, api_token: Optional[str] = None):
        """Download a file and return the streaming response"""
        headers = {}
        if api_token:
            headers["Authorization"] = f"Bearer {api_token}"

        try:
            response = requests.get(download_url, headers=headers, stream=True)
            response.raise_for_status()
            return response
        except requests.RequestException as e:
            logger.error(f"Error downloading file from {download_url}: {e}")
            raise

    async def download_file_async(self, download_url: str, file_path: str,
                                  progress_callback=None, api_token: Optional[str] = None):
        """Download a file asynchronously with progress tracking and better timeout handling"""
        headers = {}
        if api_token:
            headers["Authorization"] = f"Bearer {api_token}"

        # Increase timeouts for large files
        timeout = aiohttp.ClientTimeout(
            total=None,  # No total timeout for large files
            connect=60,  # 60 seconds to connect
            sock_read=60  # 60 seconds between reads
        )

        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(download_url, headers=headers) as response:
                    response.raise_for_status()

                    total_size = int(response.headers.get('content-length', 0))
                    downloaded_size = 0
                    chunk_size = 32768  # Increased chunk size for better performance

                    logger.info(f"Starting download: {
                                file_path}, Total size: {total_size} bytes")

                    # Use aiofiles for async file writing
                    async with aiofiles.open(file_path, 'wb') as f:
                        async for chunk in response.content.iter_chunked(chunk_size):
                            await f.write(chunk)
                            downloaded_size += len(chunk)

                            # Call progress callback if provided
                            if progress_callback:
                                try:
                                    progress_callback(
                                        downloaded_size, total_size)
                                except Exception as e:
                                    logger.warning(
                                        f"Progress callback error: {e}")

                            # Yield control less frequently for better performance
                            if downloaded_size % (chunk_size * 5) == 0:  # Every ~160KB
                                await asyncio.sleep(0.001)

                    logger.info(f"Download completed: {file_path}, Downloaded: {
                                downloaded_size} bytes")
                    return downloaded_size

        except asyncio.TimeoutError as e:
            logger.error(f"Download timeout for {download_url}: {e}")
            raise Exception(
                f"Download timeout: The download took too long to complete")
        except aiohttp.ClientError as e:
            logger.error(f"HTTP error downloading file from {
                         download_url}: {e}")
            raise Exception(f"Download failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error downloading file from {
                         download_url}: {e}")
            raise
