import os
import logging
import argparse
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from contextlib import asynccontextmanager
from models import SearchRequest, DownloadRequest, DownloadInfo, ConfigExport, FileExistenceRequest, FileExistenceResponse, FileExistenceStatus
from civitai_client import CivitaiClient
from download_manager import DownloadManager

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global download manager
download_manager = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global download_manager
    mount_dir = os.getenv("MOUNT_DIR", "/workspace")
    download_manager = DownloadManager(mount_dir)
    logger.info(f"Download manager initialized with mount_dir: {mount_dir}")
    yield
    # Shutdown - could add cleanup here if needed

app = FastAPI(title="Civitai Model Loader", version="1.0.0", lifespan=lifespan)

# Serve static files (frontend)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main frontend page"""
    return FileResponse("static/index.html")


@app.post("/api/search")
async def search_models(search_request: SearchRequest):
    """Search for models on Civitai"""
    try:
        client = CivitaiClient(api_token=search_request.api_token)
        results = client.search_models(search_request)
        return results
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/models/{model_id}")
async def get_model(model_id: int):
    """Get detailed information about a specific model"""
    try:
        client = CivitaiClient()
        model_data = client.get_model(model_id)
        return model_data
    except Exception as e:
        logger.error(f"Error fetching model {model_id}: {e}")
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
async def start_download(download_request: DownloadRequest):
    """Start downloading a model file"""
    try:
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


@app.post("/api/check-files")
async def check_file_existence(request: FileExistenceRequest):
    """Check if downloaded model files actually exist on disk"""
    try:
        mount_dir = os.getenv("MOUNT_DIR", "/workspace")
        models_dir = os.path.join(mount_dir, "models")

        file_statuses = []

        for file_info in request.files:
            file_path = os.path.join(models_dir, file_info.filename)
            exists = os.path.isfile(file_path)

            file_statuses.append(FileExistenceStatus(
                model_id=file_info.model_id,
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
