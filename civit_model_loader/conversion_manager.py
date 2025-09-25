import os
import asyncio
import uuid
import tempfile
import zipfile
import glob
import shutil
from typing import Dict, Optional
from pathlib import Path
import logging
from datetime import datetime
import time
from models import ConversionInfo, ConversionStatus, ConversionRequest
from converter import convert_invokeai_to_a1111

logger = logging.getLogger(__name__)


class ConversionManager:
    def __init__(self, mount_dir: str = "/workspace"):
        self.mount_dir = mount_dir
        self.conversions: Dict[str, ConversionInfo] = {}
        self.active_conversions: Dict[str, asyncio.Task] = {}

    def add_conversion(self, request: ConversionRequest) -> str:
        """Add a new conversion to the queue"""
        conversion_id = str(uuid.uuid4())

        # Validate directory exists
        if not os.path.exists(request.directory):
            raise ValueError(f"Directory not found: {request.directory}")

        if not os.path.isdir(request.directory):
            raise ValueError(f"Path is not a directory: {request.directory}")

        # Find all PNG files in the directory
        png_pattern = os.path.join(request.directory, "*.png")
        png_files = glob.glob(png_pattern)

        if not png_files:
            raise ValueError(f"No PNG files found in directory: {
                             request.directory}")

        conversion_info = ConversionInfo(
            id=conversion_id,
            directory=request.directory,
            status=ConversionStatus.PENDING,
            total_files=len(png_files),
            start_time=datetime.now().isoformat()
        )

        self.conversions[conversion_id] = conversion_info

        # Start conversion in background
        task = asyncio.create_task(
            self._convert_images(conversion_id, png_files))
        self.active_conversions[conversion_id] = task

        return conversion_id

    async def _convert_images(self, conversion_id: str, png_files: list):
        """Convert images asynchronously"""
        conversion_info = self.conversions[conversion_id]

        try:
            conversion_info.status = ConversionStatus.PROCESSING

            logger.info(f"Starting conversion for {
                        conversion_id}: {len(png_files)} files")

            # Create temporary directory for converted files
            temp_dir = tempfile.mkdtemp()
            converted_files = []
            conversion_errors = []

            try:
                # Convert each PNG file
                for i, png_file in enumerate(png_files):
                    try:
                        conversion_info.current_file = os.path.basename(
                            png_file)
                        conversion_info.processed_files = i
                        conversion_info.progress = (i / len(png_files)) * 100

                        # Generate output filename
                        base_name = Path(png_file).stem
                        output_filename = f"{base_name}_a1111.png"
                        output_path = os.path.join(temp_dir, output_filename)

                        # Convert the image metadata - use /workspace for config/cache files
                        success, message = convert_invokeai_to_a1111(
                            png_file, output_path, self.mount_dir)

                        if success:
                            converted_files.append(
                                (output_path, output_filename))
                            logger.info(
                                f"Converted: {png_file} -> {output_filename}")
                        else:
                            conversion_errors.append(
                                f"{os.path.basename(png_file)}: {message}")
                            logger.warning(f"Failed to convert {
                                           png_file}: {message}")

                        # Yield control periodically
                        await asyncio.sleep(0.001)

                    except Exception as e:
                        error_msg = f"{os.path.basename(png_file)}: {str(e)}"
                        conversion_errors.append(error_msg)
                        logger.error(f"Error converting {png_file}: {e}")

                # Update final progress
                conversion_info.processed_files = len(png_files)
                conversion_info.progress = 100.0
                conversion_info.current_file = None

                # Check if we have any converted files
                if not converted_files:
                    if conversion_errors:
                        error_summary = "; ".join(conversion_errors[:3])
                        if len(conversion_errors) > 3:
                            error_summary += f" and {
                                len(conversion_errors) - 3} more errors"
                        raise Exception(
                            f"No files could be converted. Errors: {error_summary}")
                    else:
                        raise Exception("No files could be converted")

                # Create ZIP file
                zip_filename = f"converted_images_{Path(conversion_info.directory).name}_{
                    conversion_id[:8]}.zip"
                zip_path = os.path.join(temp_dir, zip_filename)

                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for file_path, arc_name in converted_files:
                        zipf.write(file_path, arc_name)

                    # Add a summary file if there were errors
                    if conversion_errors:
                        summary_content = "Conversion Summary\n" + "=" * 50 + "\n\n"
                        summary_content += f"Successfully converted: {
                            len(converted_files)} files\n"
                        summary_content += f"Failed conversions: {
                            len(conversion_errors)} files\n\n"
                        summary_content += "Errors:\n" + \
                            "\n".join(conversion_errors)

                        summary_path = os.path.join(
                            temp_dir, "conversion_summary.txt")
                        with open(summary_path, 'w') as f:
                            f.write(summary_content)
                        zipf.write(summary_path, "conversion_summary.txt")

                # Update conversion info with download URL
                conversion_info.status = ConversionStatus.COMPLETED
                conversion_info.download_url = f"/api/download-conversion/{
                    conversion_id}"
                conversion_info.end_time = datetime.now().isoformat()

                # Store the ZIP file path temporarily for download
                conversion_info._zip_path = zip_path

                logger.info(f"Conversion completed: {
                            conversion_id} - {len(converted_files)} files converted")

            except Exception as e:
                # Clean up temp directory on error
                try:
                    shutil.rmtree(temp_dir)
                except Exception:
                    pass
                raise

        except asyncio.CancelledError:
            conversion_info.status = ConversionStatus.FAILED
            conversion_info.error_message = "Conversion was cancelled"
            logger.info(f"Conversion cancelled: {conversion_id}")

        except Exception as e:
            conversion_info.status = ConversionStatus.FAILED
            conversion_info.error_message = str(e)
            logger.error(f"Conversion failed for {conversion_id}: {e}")

        finally:
            # Remove from active conversions
            if conversion_id in self.active_conversions:
                del self.active_conversions[conversion_id]

    def get_conversion_status(self, conversion_id: str) -> Optional[ConversionInfo]:
        """Get the status of a specific conversion"""
        return self.conversions.get(conversion_id)

    def get_all_conversions(self) -> Dict[str, ConversionInfo]:
        """Get status of all conversions"""
        return self.conversions

    def cancel_conversion(self, conversion_id: str) -> bool:
        """Cancel an active conversion"""
        if conversion_id in self.active_conversions:
            task = self.active_conversions[conversion_id]
            task.cancel()

            conversion_info = self.conversions.get(conversion_id)
            if conversion_info:
                conversion_info.status = ConversionStatus.FAILED
                conversion_info.error_message = "Conversion cancelled"

            return True
        return False

    def cleanup_old_conversions(self, max_age_hours: int = 24):
        """Clean up old completed conversions and their files"""
        cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)

        to_remove = []
        for conversion_id, conversion_info in self.conversions.items():
            if conversion_info.start_time:
                start_time = datetime.fromisoformat(
                    conversion_info.start_time).timestamp()
                if start_time < cutoff_time and conversion_info.status in [ConversionStatus.COMPLETED, ConversionStatus.FAILED]:
                    to_remove.append(conversion_id)

                    # Clean up ZIP file if it exists
                    if hasattr(conversion_info, '_zip_path') and conversion_info._zip_path:
                        try:
                            zip_dir = os.path.dirname(
                                conversion_info._zip_path)
                            if os.path.exists(zip_dir):
                                shutil.rmtree(zip_dir)
                                logger.info(f"Cleaned up conversion files for {
                                            conversion_id}")
                        except Exception as e:
                            logger.warning(f"Failed to clean up files for {
                                           conversion_id}: {e}")

        for conversion_id in to_remove:
            del self.conversions[conversion_id]
            logger.info(f"Removed old conversion: {conversion_id}")

