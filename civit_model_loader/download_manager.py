import os
import asyncio
import uuid
from typing import Dict, Optional
from pathlib import Path
import logging
from models import DownloadInfo, DownloadStatus, DownloadRequest
from civitai_client import CivitaiClient

logger = logging.getLogger(__name__)


class DownloadManager:
    def __init__(self, mount_dir: str = "/workspace"):
        self.mount_dir = mount_dir
        self.models_dir = Path(mount_dir) / "models"
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.downloads: Dict[str, DownloadInfo] = {}
        self.active_downloads: Dict[str, asyncio.Task] = {}

    def add_download(self, request: DownloadRequest) -> str:
        """Add a new download to the queue"""
        download_id = str(uuid.uuid4())

        # Get file info from Civitai
        client = CivitaiClient(request.api_token)
        try:
            version_data = client.get_model_version(request.version_id)
            file_info = None

            for file in version_data.get("files", []):
                if file["id"] == request.file_id:
                    file_info = file
                    break

            if not file_info:
                raise ValueError(f"File {request.file_id} not found")

            filename = file_info["name"]
            total_size = int(file_info["sizeKB"] * 1024)  # Convert KB to bytes

            download_info = DownloadInfo(
                id=download_id,
                model_id=request.model_id,
                version_id=request.version_id,
                file_id=request.file_id,
                filename=filename,
                status=DownloadStatus.PENDING,
                total_size=total_size
            )

            self.downloads[download_id] = download_info

            # Start download in background
            task = asyncio.create_task(
                self._download_file(download_id, request))
            self.active_downloads[download_id] = task

            return download_id

        except Exception as e:
            logger.error(f"Error adding download: {e}")
            raise

    async def _download_file(self, download_id: str, request: DownloadRequest):
        """Download a file asynchronously"""
        download_info = self.downloads[download_id]

        try:
            download_info.status = DownloadStatus.DOWNLOADING

            client = CivitaiClient(request.api_token)
            download_url = client.get_download_url(
                request.model_id,
                request.version_id,
                request.file_id
            )

            # Create file path
            file_path = self.models_dir / download_info.filename
            download_info.file_path = str(file_path)

            # Download with progress tracking
            response = client.download_file_stream(
                download_url, request.api_token)

            downloaded_size = 0
            with open(file_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded_size += len(chunk)

                        # Update progress
                        download_info.downloaded_size = downloaded_size
                        if download_info.total_size:
                            download_info.progress = downloaded_size / download_info.total_size * 100

            download_info.status = DownloadStatus.COMPLETED
            download_info.progress = 100.0

            logger.info(f"Download completed: {download_info.filename}")

        except Exception as e:
            download_info.status = DownloadStatus.FAILED
            download_info.error_message = str(e)
            logger.error(f"Download failed for {download_id}: {e}")

        finally:
            # Remove from active downloads
            if download_id in self.active_downloads:
                del self.active_downloads[download_id]

    def get_download_status(self, download_id: str) -> Optional[DownloadInfo]:
        """Get the status of a specific download"""
        return self.downloads.get(download_id)

    def get_all_downloads(self) -> Dict[str, DownloadInfo]:
        """Get status of all downloads"""
        return self.downloads

    def cancel_download(self, download_id: str) -> bool:
        """Cancel an active download"""
        if download_id in self.active_downloads:
            task = self.active_downloads[download_id]
            task.cancel()

            download_info = self.downloads.get(download_id)
            if download_info:
                download_info.status = DownloadStatus.FAILED
                download_info.error_message = "Download cancelled"

            return True
        return False
