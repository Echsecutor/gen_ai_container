import os
import logging
import argparse
import json
import tempfile
import zipfile
import glob
import shutil
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from models import SearchRequest, DownloadRequest, DownloadInfo, ConfigExport, FileExistenceRequest, FileExistenceResponse, FileExistenceStatus, FileInfo, ListFilesResponse, ConversionRequest, ConversionInfo
from civitai_client import CivitaiClient
from download_manager import DownloadManager
from conversion_manager import ConversionManager
from converter import convert_invokeai_to_a1111
from thumbnail import get_thumbnail_base64, is_image_file

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global managers
download_manager = None
conversion_manager = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global download_manager, conversion_manager
    mount_dir = os.getenv("MOUNT_DIR", "/workspace")
    download_manager = DownloadManager(mount_dir)
    conversion_manager = ConversionManager(mount_dir)
    logger.info(f"Managers initialized with mount_dir: {mount_dir}")
    yield
    # Shutdown - could add cleanup here if needed

app = FastAPI(title="Civitai Model Loader", version="1.0.0", lifespan=lifespan)

# Add CORS middleware to handle browser requests properly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (frontend)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main frontend page"""
    return FileResponse("static/index.html")


@app.post("/api/search")
async def search_models(request: Request):
    """Search for models on Civitai"""
    try:
        # Handle both application/json and text/plain content types
        content_type = request.headers.get("content-type", "")

        if content_type.startswith("text/plain"):
            # Handle text/plain requests (CORS fallback)
            body = await request.body()
            request_data = json.loads(body.decode())
        else:
            # Handle normal JSON requests
            request_data = await request.json()

        # Parse the request data into SearchRequest model
        search_request = SearchRequest(**request_data)

        logger.info(f"Received search request: {search_request}")
        client = CivitaiClient(api_token=search_request.api_token)
        results = client.search_models(search_request)
        return results
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/models/{civitai_model_id}")
async def get_model(civitai_model_id: int, request: Request):
    """Get detailed information about a specific model"""
    try:
        # Try to get API token from query parameters or headers
        api_token = request.query_params.get("api_token")
        if not api_token:
            # Check Authorization header
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                api_token = auth_header[7:]

        client = CivitaiClient(api_token)
        model_data = client.get_model(civitai_model_id)
        return model_data
    except Exception as e:
        logger.error(f"Error fetching model {civitai_model_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/model-versions/{version_id}")
async def get_model_version(version_id: int):
    """Get detailed information about a specific model version"""
    try:
        client = CivitaiClient()
        version_data = client.get_model_version(version_id)
        return version_data
    except Exception as e:
        logger.error(f"Error fetching model version {version_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/download")
async def start_download(request: Request):
    """Start downloading a model file"""
    try:
        # Handle both application/json and text/plain content types
        content_type = request.headers.get("content-type", "")

        if content_type.startswith("text/plain"):
            # Handle text/plain requests (CORS fallback)
            body = await request.body()
            request_data = json.loads(body.decode())
        else:
            # Handle normal JSON requests
            request_data = await request.json()

        # Parse the request data into DownloadRequest model
        download_request = DownloadRequest(**request_data)

        logger.info(f"Received download request: {download_request}")
        download_id = download_manager.add_download(download_request)
        return {"download_id": download_id, "status": "started"}
    except Exception as e:
        logger.error(f"Download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/downloads/{download_id}")
async def get_download_status(download_id: str):
    """Get the status of a specific download"""
    download_info = download_manager.get_download_status(download_id)
    if not download_info:
        raise HTTPException(status_code=404, detail="Download not found")
    return download_info


@app.get("/api/downloads")
async def get_all_downloads():
    """Get status of all downloads"""
    return download_manager.get_all_downloads()


@app.delete("/api/downloads/{download_id}")
async def cancel_download(download_id: str):
    """Cancel an active download"""
    success = download_manager.cancel_download(download_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="Download not found or not active")
    return {"status": "cancelled"}


@app.post("/api/start-conversion")
async def start_image_conversion(request: Request):
    """Start converting images asynchronously"""
    try:
        # Handle both application/json and text/plain content types
        content_type = request.headers.get("content-type", "")

        if content_type.startswith("text/plain"):
            # Handle text/plain requests (CORS fallback)
            body = await request.body()
            request_data = json.loads(body.decode())
        else:
            # Handle normal JSON requests
            request_data = await request.json()

        # Parse the request data into ConversionRequest model
        conversion_request = ConversionRequest(**request_data)

        logger.info(f"Received conversion request: {conversion_request}")
        conversion_id = conversion_manager.add_conversion(conversion_request)
        return {"conversion_id": conversion_id, "status": "started"}
    except Exception as e:
        logger.error(f"Conversion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conversions/{conversion_id}")
async def get_conversion_status(conversion_id: str):
    """Get the status of a specific conversion"""
    conversion_info = conversion_manager.get_conversion_status(conversion_id)
    if not conversion_info:
        raise HTTPException(status_code=404, detail="Conversion not found")
    return conversion_info


@app.get("/api/conversions")
async def get_all_conversions():
    """Get status of all conversions"""
    return conversion_manager.get_all_conversions()


@app.delete("/api/conversions/{conversion_id}")
async def cancel_conversion(conversion_id: str):
    """Cancel an active conversion"""
    success = conversion_manager.cancel_conversion(conversion_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="Conversion not found or not active")
    return {"status": "cancelled"}


@app.get("/api/download-conversion/{conversion_id}")
async def download_conversion_result(conversion_id: str):
    """Download the ZIP file for a completed conversion"""
    conversion_info = conversion_manager.get_conversion_status(conversion_id)
    if not conversion_info:
        raise HTTPException(status_code=404, detail="Conversion not found")

    if conversion_info.status != "completed":
        raise HTTPException(status_code=400, detail="Conversion not completed")

    if not hasattr(conversion_info, '_zip_path') or not conversion_info._zip_path:
        raise HTTPException(status_code=404, detail="Download file not found")

    zip_path = conversion_info._zip_path
    if not os.path.exists(zip_path):
        raise HTTPException(
            status_code=404, detail="Download file no longer exists")

    zip_filename = os.path.basename(zip_path)

    return FileResponse(
        path=zip_path,
        filename=zip_filename,
        media_type='application/zip',
        headers={
            "Content-Disposition": f"attachment; filename={zip_filename}"}
    )


@app.post("/api/check-files")
async def check_file_existence(request: Request):
    """Check if downloaded model files actually exist on disk"""
    try:
        # Handle both application/json and text/plain content types
        content_type = request.headers.get("content-type", "")

        if content_type.startswith("text/plain"):
            # Handle text/plain requests (CORS fallback)
            body = await request.body()
            request_data = json.loads(body.decode())
        else:
            # Handle normal JSON requests
            request_data = await request.json()

        # Parse the request data into FileExistenceRequest model
        file_request = FileExistenceRequest(**request_data)

        logger.info(f"Received file existence check request: {file_request}")

        # Handle empty files array
        if not file_request.files:
            logger.info("Empty files array received, returning empty response")
            return FileExistenceResponse(files=[])

        mount_dir = os.getenv("MOUNT_DIR", "/workspace")
        models_dir = os.path.join(mount_dir, "models")

        file_statuses = []

        for file_info in file_request.files:
            file_path = os.path.join(models_dir, file_info.filename)
            exists = os.path.isfile(file_path)

            file_statuses.append(FileExistenceStatus(
                civitai_model_id=file_info.civitai_model_id,
                version_id=file_info.version_id,
                file_id=file_info.file_id,
                filename=file_info.filename,
                exists=exists,
                file_path=file_path
            ))

        return FileExistenceResponse(files=file_statuses)
    except Exception as e:
        logger.error(f"File existence check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/download-converted-images")
async def download_converted_images(directory: str = Query(default="/workspace/output/images")):
    """
    Download all PNG images from a directory with metadata converted to Automatic1111 format.

    Args:
        directory: Directory to scan for PNG images (default: /workspace/output/images)

    Returns:
        ZIP file containing converted images
    """
    try:
        # Validate directory exists
        if not os.path.exists(directory):
            raise HTTPException(
                status_code=404, detail=f"Directory not found: {directory}")

        if not os.path.isdir(directory):
            raise HTTPException(
                status_code=400, detail=f"Path is not a directory: {directory}")

        # Find all PNG files in the directory
        png_pattern = os.path.join(directory, "*.png")
        png_files = glob.glob(png_pattern)

        if not png_files:
            raise HTTPException(
                status_code=404, detail=f"No PNG files found in directory: {directory}")

        logger.info(f"Found {len(png_files)} PNG files in {directory}")

        # Create temporary directory for converted files
        temp_dir = tempfile.mkdtemp()
        converted_files = []
        conversion_errors = []

        try:
            # Convert each PNG file
            for png_file in png_files:
                try:
                    # Generate output filename
                    base_name = Path(png_file).stem
                    output_filename = f"{base_name}_a1111.png"
                    output_path = os.path.join(temp_dir, output_filename)

                    # Convert the image metadata - use /workspace for config/cache files
                    success, message = convert_invokeai_to_a1111(
                        png_file, output_path, "/workspace")

                    if success:
                        converted_files.append((output_path, output_filename))
                        logger.info(
                            f"Converted: {png_file} -> {output_filename}")
                    else:
                        conversion_errors.append(
                            f"{os.path.basename(png_file)}: {message}")
                        logger.warning(f"Failed to convert "
                                       f"{png_file}: {message}")

                except Exception as e:
                    error_msg = f"{os.path.basename(png_file)}: {str(e)}"
                    conversion_errors.append(error_msg)
                    logger.error(f"Error converting {png_file}: {e}")

            # Check if we have any converted files
            if not converted_files:
                if conversion_errors:
                    error_summary = "; ".join(
                        conversion_errors[:3])  # Show first 3 errors
                    if len(conversion_errors) > 3:
                        error_summary += f" and " \
                            f"{len(conversion_errors) - 3} more errors"
                    raise HTTPException(
                        status_code=422,
                        detail=f"No files could be converted. Errors: "
                        f"{error_summary}"
                    )
                else:
                    raise HTTPException(
                        status_code=422, detail="No files could be converted")

            # Create ZIP file
            zip_filename = f"converted_images_{Path(directory).name}.zip"
            zip_path = os.path.join(temp_dir, zip_filename)

            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path, arc_name in converted_files:
                    zipf.write(file_path, arc_name)

                # Add a summary file if there were errors
                if conversion_errors:
                    summary_content = "Conversion Summary\n" + "=" * 50 + "\n\n"
                    summary_content += f"Successfully converted: " \
                        f"{len(converted_files)} files\n"
                    summary_content += f"Failed conversions: " \
                        f"{len(conversion_errors)} files\n\n"
                    summary_content += "Errors:\n" + \
                        "\n".join(conversion_errors)

                    summary_path = os.path.join(
                        temp_dir, "conversion_summary.txt")
                    with open(summary_path, 'w') as f:
                        f.write(summary_content)
                    zipf.write(summary_path, "conversion_summary.txt")

            logger.info(f"Created ZIP file with "
                        f"{len(converted_files)} converted images")

            # Return the ZIP file with background task to clean up temp directory

            def cleanup_temp_dir():
                try:
                    shutil.rmtree(temp_dir)
                    logger.info(f"Cleaned up temporary directory: {temp_dir}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary directory "
                                   f"{temp_dir}: {e}")

            # Note: We can't use BackgroundTasks here since it's not in the function signature
            # Instead, we'll rely on the OS to clean up /tmp eventually
            return FileResponse(
                path=zip_path,
                filename=zip_filename,
                media_type='application/zip',
                headers={
                    "Content-Disposition": f"attachment; filename={zip_filename}"}
            )

        except HTTPException:
            # Clean up temp directory on error
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass
            raise
        except Exception as e:
            # Clean up temp directory on error
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass
            raise

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in download_converted_images: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/api/list-files")
async def list_files(folder: str = Query(default="/workspace/output/images")):
    """
    List all files in a specified server-side folder with thumbnails for images.

    Args:
        folder: Server-side folder path to list files from (default: /workspace/output/images)

    Returns:
        JSON array containing file information with thumbnails for images
    """
    try:
        # Validate folder exists
        if not os.path.exists(folder):
            raise HTTPException(
                status_code=404, detail=f"Folder not found: {folder}")

        if not os.path.isdir(folder):
            raise HTTPException(
                status_code=400, detail=f"Path is not a directory: {folder}")

        logger.info(f"Listing files in folder: {folder}")

        file_list = []

        try:
            # Get all files in the directory
            for filename in os.listdir(folder):
                file_path = os.path.join(folder, filename)

                # Skip directories, only include files
                if os.path.isfile(file_path):
                    # Create base file info
                    file_info = FileInfo(
                        filename=filename,
                        full_path=file_path,
                        thumbnail=None,
                        image_url=None
                    )

                    # Generate thumbnail and image URL if it's an image file
                    if is_image_file(file_path):
                        try:
                            thumbnail_base64 = get_thumbnail_base64(file_path)
                            if thumbnail_base64:
                                file_info.thumbnail = f"data:image/jpeg;base64,{thumbnail_base64}"

                            # Create URL for full-size image
                            from urllib.parse import quote
                            file_info.image_url = f"/api/serve-image?file_path={quote(file_path)}"
                        except Exception as e:
                            logger.warning(f"Failed to generate thumbnail for {file_path}: {e}")
                            # Continue without thumbnail

                    file_list.append(file_info)

            # Sort files by name for consistent ordering
            file_list.sort(key=lambda x: x.filename.lower())

            logger.info(f"Found {len(file_list)} files in {folder}")

            return ListFilesResponse(files=file_list)

        except PermissionError:
            raise HTTPException(
                status_code=403, detail=f"Permission denied accessing folder: {folder}")
        except Exception as e:
            logger.error(f"Error listing files in {folder}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Error listing files: {str(e)}")

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in list_files: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/api/serve-image")
async def serve_image(file_path: str = Query(..., description="Full path to the image file")):
    """
    Serve a full-size image file from the server filesystem.

    Args:
        file_path: Full path to the image file on the server

    Returns:
        The image file as a response
    """
    try:
        # Validate that the file exists and is actually a file
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404, detail=f"File not found: {file_path}")

        if not os.path.isfile(file_path):
            raise HTTPException(
                status_code=400, detail=f"Path is not a file: {file_path}")

        # Security check: ensure the file is an image
        if not is_image_file(file_path):
            raise HTTPException(
                status_code=400, detail=f"File is not an image: {file_path}")

        # Additional security: prevent path traversal attacks by ensuring the file is within allowed directories
        # Add other allowed directories as needed
        allowed_dirs = ["/workspace", "/tmp"]
        if not any(os.path.abspath(file_path).startswith(os.path.abspath(allowed_dir)) for allowed_dir in allowed_dirs):
            raise HTTPException(
                status_code=403, detail="Access to this file path is not allowed")

        # Determine the media type based on file extension
        file_extension = os.path.splitext(file_path)[1].lower()
        media_type_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff'
        }

        media_type = media_type_map.get(
            file_extension, 'application/octet-stream')

        logger.info(f"Serving image: {file_path} as {media_type}")

        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=os.path.basename(file_path)
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error serving image {file_path}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "mount_dir": os.getenv("MOUNT_DIR", "/workspace")}

if __name__ == "__main__":
    import uvicorn

    # Setup command line argument parsing
    parser = argparse.ArgumentParser(
        description="Civitai Model Loader Service")
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("PORT", 8080)),
        help="Port to run the service on (default: 8080 or PORT environment variable)"
    )

    args = parser.parse_args()

    uvicorn.run(app, host="0.0.0.0", port=args.port)
