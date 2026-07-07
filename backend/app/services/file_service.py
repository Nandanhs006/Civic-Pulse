import os
import sys

# Force fallback to pure Python protobuf to prevent Python 3.14 C-extension crashes
sys.modules["google._upb"] = None  # type: ignore
sys.modules["google._upb._message"] = None  # type: ignore
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
import shutil
import uuid
import logging
from fastapi import UploadFile
from app.core.config import settings

logger = logging.getLogger(__name__)

# Check if we should use Google Cloud Storage
try:
    from google.cloud import storage

    GCS_BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME")
    if GCS_BUCKET_NAME:
        storage_client = storage.Client()
        gcs_bucket = storage_client.bucket(GCS_BUCKET_NAME)
        logger.info(f"[Storage] GCS bucket '{GCS_BUCKET_NAME}' configured.")
    else:
        gcs_bucket = None
        logger.info("[Storage] GCS_BUCKET_NAME not set. Using local disk storage.")
except Exception as e:
    gcs_bucket = None
    logger.warning(
        f"[Storage] Failed to import/configure Google Cloud Storage: {e}. Using local disk storage."
    )


class FileService:
    def save_file(self, upload_file: UploadFile, subfolder: str = "general") -> str:
        # 1. Try uploading to Google Cloud Storage if configured
        if gcs_bucket:
            try:
                file_ext = (
                    os.path.splitext(upload_file.filename)[1]
                    if upload_file.filename
                    else ""
                )
                unique_filename = f"{subfolder}/{uuid.uuid4()}{file_ext}"
                blob = gcs_bucket.blob(unique_filename)
                # Upload directly from fastapi stream
                blob.upload_from_file(upload_file.file)
                return blob.public_url
            except Exception as ex:
                logger.error(
                    f"[Storage] GCS upload failed: {ex}. Falling back to local disk storage."
                )

        # 2. Local disk fallback storage
        target_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
        os.makedirs(target_dir, exist_ok=True)

        file_ext = (
            os.path.splitext(upload_file.filename)[1] if upload_file.filename else ""
        )
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(target_dir, unique_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)

        return f"/static/{subfolder}/{unique_filename}"


file_service = FileService()
