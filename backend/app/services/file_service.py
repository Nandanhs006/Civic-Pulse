import os
import shutil
import uuid
from fastapi import UploadFile
from app.core.config import settings


class FileService:
    @staticmethod
    def save_file(upload_file: UploadFile, subfolder: str = "general") -> str:
        # Create directories if they do not exist
        target_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
        os.makedirs(target_dir, exist_ok=True)

        # Generate unique filename
        file_ext = os.path.splitext(upload_file.filename)[1] if upload_file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(target_dir, unique_filename)

        # Save to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)

        # Return a relative URL path
        return f"/static/{subfolder}/{unique_filename}"


file_service = FileService()
