import os
import uuid
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import pypdf
import docx
import logging

from models.database import User
from models.schemas import AvatarUploadResponse, ResumeUploadResponse
from core.config import settings

logger = logging.getLogger(__name__)

class ProfileService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def upload_avatar(self, user: User, file: UploadFile) -> AvatarUploadResponse:
        # Validate mime/extension
        allowed_exts = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
        ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
        if ext not in allowed_exts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Supported extensions: {', '.join(allowed_exts)}"
            )

        avatar_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
        os.makedirs(avatar_dir, exist_ok=True)

        filename = f"avatar_{user.id}_{uuid.uuid4().hex[:8]}{ext}"
        filepath = os.path.join(avatar_dir, filename)

        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)

        relative_url = f"/uploads/avatars/{filename}"
        user.profile_picture_url = relative_url
        await self.db.commit()
        await self.db.refresh(user)

        return AvatarUploadResponse(
            profile_picture_url=relative_url,
            message="Profile picture uploaded successfully"
        )

    async def upload_resume(self, user: User, file: UploadFile) -> ResumeUploadResponse:
        ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
        if ext not in [".pdf", ".docx"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid resume file type. Must be .pdf or .docx"
            )

        resume_dir = os.path.join(settings.UPLOAD_DIR, "resumes")
        os.makedirs(resume_dir, exist_ok=True)

        filename = f"resume_{user.id}_{uuid.uuid4().hex[:8]}{ext}"
        filepath = os.path.join(resume_dir, filename)

        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)

        parsed_text = ""
        try:
            if ext == ".pdf":
                reader = pypdf.PdfReader(filepath)
                parsed_text = "\n".join([page.extract_text() or "" for page in reader.pages])
            elif ext == ".docx":
                doc = docx.Document(filepath)
                parsed_text = "\n".join([p.text for p in doc.paragraphs if p.text])
        except Exception as e:
            logger.warning(f"Error parsing resume text: {e}")
            parsed_text = "Unable to parse text from file."

        relative_url = f"/uploads/resumes/{filename}"
        user.resume_url = relative_url
        await self.db.commit()
        await self.db.refresh(user)

        return ResumeUploadResponse(
            resume_url=relative_url,
            extracted_text=parsed_text[:2000] if parsed_text else None,
            message="Resume uploaded and parsed successfully"
        )
