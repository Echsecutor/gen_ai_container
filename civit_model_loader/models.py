from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum


class DownloadStatus(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"


class ModelType(str, Enum):
    CHECKPOINT = "Checkpoint"
    TEXTUAL_INVERSION = "TextualInversion"
    HYPERNETWORK = "Hypernetwork"
    AESTHETIC_GRADIENT = "AestheticGradient"
    LORA = "LORA"
    LYCORIS = "LyCORIS"
    CONTROLNET = "Controlnet"
    POSE = "Pose"
    UPSCALER = "Upscaler"
    MOTION_MODULE = "MotionModule"
    VAE = "VAE"
    OTHER = "Other"


class CivitaiModelFile(BaseModel):
    id: int
    name: str
    type: str
    metadata: Dict[str, Any]
    sizeKB: float
    downloadUrl: str
    hashes: Dict[str, str]


class CivitaiModelVersion(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    baseModel: Optional[str] = None
    trainedWords: List[str] = []
    files: List[CivitaiModelFile]
    images: List[Dict[str, Any]] = []


class CivitaiModel(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    type: ModelType
    creator: Dict[str, Any]
    tags: List[str] = []
    modelVersions: List[CivitaiModelVersion]


class SearchRequest(BaseModel):
    query: Optional[str] = None
    types: Optional[List[ModelType]] = None
    sort: Optional[str] = "Most Downloaded"
    period: Optional[str] = "AllTime"
    nsfw: Optional[bool] = None
    limit: int = 20
    page: int = 1  # Only used for non-query searches
    # Used for query searches (cursor-based pagination)
    cursor: Optional[str] = None
    api_token: Optional[str] = None

    class Config:
        # Allow extra fields and ignore them
        extra = "ignore"


class DownloadRequest(BaseModel):
    civitai_model_id: int
    version_id: int
    file_id: int
    api_token: str


class DownloadInfo(BaseModel):
    id: str
    civitai_model_id: int
    version_id: int
    file_id: int
    filename: str
    status: DownloadStatus
    progress: float = 0.0
    total_size: Optional[int] = None
    downloaded_size: Optional[int] = None
    error_message: Optional[str] = None
    file_path: Optional[str] = None
    start_time: Optional[str] = None  # ISO format timestamp
    end_time: Optional[str] = None    # ISO format timestamp
    download_speed: Optional[float] = None  # bytes per second
    eta_seconds: Optional[int] = None  # estimated time to completion


class ConfigExport(BaseModel):
    api_token: str
    downloaded_models: List[Dict[str, Any]]


class DownloadedModelFile(BaseModel):
    civitai_model_id: int
    version_id: int
    file_id: int
    filename: str


class FileExistenceRequest(BaseModel):
    files: List[DownloadedModelFile]


class FileExistenceStatus(BaseModel):
    civitai_model_id: int
    version_id: int
    file_id: int
    filename: str
    exists: bool
    file_path: str


class FileExistenceResponse(BaseModel):
    files: List[FileExistenceStatus]


class FileInfo(BaseModel):
    filename: str
    full_path: str
    thumbnail: Optional[str] = None  # Base64-encoded thumbnail for images
    image_url: Optional[str] = None  # URL to serve full-size image


class ListFilesResponse(BaseModel):
    files: List[FileInfo]


class ConversionRequest(BaseModel):
    directory: str


class ConversionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ConversionInfo(BaseModel):
    id: str
    directory: str
    status: ConversionStatus
    progress: float = 0.0
    processed_files: int = 0
    total_files: int = 0
    current_file: Optional[str] = None
    error_message: Optional[str] = None
    download_url: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
