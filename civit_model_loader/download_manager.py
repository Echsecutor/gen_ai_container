import os
import asyncio
import uuid
from typing import Dict, Optional
from pathlib import Path
import logging
from datetime import datetime
import time
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
                civitai_model_id=request.civitai_model_id,
                version_id=request.version_id,
                file_id=request.file_id,
                filename=filename,
                status=DownloadStatus.PENDING,
                total_size=total_size,
                start_time=datetime.now().isoformat()
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
        """Download a file asynchronously with enhanced error handling and progress tracking"""
        download_info = self.downloads[download_id]

        try:
            download_info.status = DownloadStatus.DOWNLOADING

            client = CivitaiClient(request.api_token)
            download_url = client.get_download_url(
                request.civitai_model_id,
                request.version_id,
                request.file_id
            )

            # Create file path
            file_path = self.models_dir / download_info.filename
            download_info.file_path = str(file_path)

            logger.info(f"Starting download for {download_id}: {download_info.filename}")

            # Enhanced progress callback with timing and speed tracking
            start_time = time.time()
            last_update_time = start_time
            last_downloaded_size = 0

            def progress_callback(downloaded_size: int, total_size: int):
                nonlocal last_update_time, last_downloaded_size

                current_time = time.time()
                download_info.downloaded_size = downloaded_size

                # Calculate progress percentage
                effective_total = total_size or download_info.total_size or 0
                if effective_total > 0:
                    download_info.progress = (
                        downloaded_size / effective_total) * 100
                else:
                    download_info.progress = 0

                # Calculate download speed and ETA
                elapsed_time = current_time - start_time
                if elapsed_time > 0 and downloaded_size > 0:
                    download_info.download_speed = downloaded_size / elapsed_time

                    # Calculate ETA if we have total size and speed
                    if effective_total > 0 and download_info.download_speed > 0:
                        remaining_bytes = effective_total - downloaded_size
                        download_info.eta_seconds = int(
                            remaining_bytes / download_info.download_speed)

                # Update tracking for stall detection
                if downloaded_size > last_downloaded_size:
                    last_update_time = current_time
                    last_downloaded_size = downloaded_size

                # Log progress for large downloads
                # Every 10MB
                if downloaded_size > 0 and downloaded_size % (1024 * 1024 * 10) == 0:
                    speed_mb = (download_info.download_speed or 0) / \
                        (1024 * 1024)
                    eta_str = f"ETA: {download_info.eta_seconds}s" if download_info.eta_seconds else "ETA: unknown"
                    logger.info(f"Download progress {download_id}: {downloaded_size / (1024*1024):.1f}MB / {effective_total / (1024*1024):.1f}MB ({download_info.progress:.1f}%) - Speed: {speed_mb:.1f}MB/s - {eta_str}")

            # Download with async I/O - this won't block the event loop
            downloaded_size = await client.download_file_async(
                download_url,
                str(file_path),
                progress_callback=progress_callback,
                api_token=request.api_token
            )

            # Verify download completed successfully
            if file_path.exists() and file_path.stat().st_size > 0:
                download_info.status = DownloadStatus.COMPLETED
                download_info.progress = 100.0
                download_info.downloaded_size = downloaded_size
                download_info.end_time = datetime.now().isoformat()

                # Final speed calculation
                total_time = time.time() - start_time
                if total_time > 0:
                    download_info.download_speed = downloaded_size / total_time

                logger.info(f"Download completed successfully: {download_info.filename} ({downloaded_size} bytes) in {total_time:.1f}s")
            else:
                raise Exception("Downloaded file is empty or missing")

        except asyncio.CancelledError:
            download_info.status = DownloadStatus.FAILED
            download_info.error_message = "Download was cancelled"
            logger.info(f"Download cancelled: {download_id}")

            # Clean up partial file
            if download_info.file_path and Path(download_info.file_path).exists():
                try:
                    Path(download_info.file_path).unlink()
                    logger.info(f"Cleaned up partial file: {download_info.file_path}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up partial file: {cleanup_error}")

        except Exception as e:
            download_info.status = DownloadStatus.FAILED
            download_info.error_message = str(e)
            logger.error(f"Download failed for {download_id}: {e}")

            # Clean up partial file on error
            if download_info.file_path and Path(download_info.file_path).exists():
                try:
                    file_size = Path(download_info.file_path).stat().st_size
                    # Less than 90% complete
                    if file_size < (download_info.total_size or 0) * 0.9:
                        Path(download_info.file_path).unlink()
                        logger.info(f"Cleaned up incomplete file: {download_info.file_path}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up incomplete file: {cleanup_error}")

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
