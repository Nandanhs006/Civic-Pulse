from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import UploadFile
from app.db.models.suggestion import Suggestion
from app.db.models.ward import Ward
from app.services.file_service import file_service
from app.services.ai_service import ai_service


class SuggestionService:
    def __init__(self, db: Session):
        self.db = db

    def create_suggestion(
        self,
        content: Optional[str] = None,
        citizen_phone: Optional[str] = None,
        language_code: str = "en",
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        audio_file: Optional[UploadFile] = None,
        image_file: Optional[UploadFile] = None,
    ) -> Suggestion:
        # Create directory paths
        audio_url = None
        image_url = None

        if audio_file:
            audio_url = file_service.save_file(audio_file, subfolder="audio")
        if image_file:
            image_url = file_service.save_file(image_file, subfolder="images")

        # Ingest text or run transcription
        transcription_result = {}
        if audio_url:
            transcription_result = ai_service.transcribe_audio(audio_url)
            content = transcription_result.get("raw_text", "")
            english_translation = transcription_result.get("english_translation", "")
            language_code = transcription_result.get("language_code", "en")
            category = transcription_result.get("category", "General")
            sentiment = transcription_result.get("sentiment", "Neutral")
            priority_score = transcription_result.get("priority_score", 50)
        else:
            english_translation = content
            # Run text NLP analysis
            nlp_result = ai_service.analyze_text(content or "", language_code)
            english_translation = nlp_result.get("english_translation", content)
            category = nlp_result.get("category", "General")
            sentiment = nlp_result.get("sentiment", "Neutral")
            priority_score = nlp_result.get("priority_score", 50)

        # Geolocation: Assign to matching ward using a simple mock bounding box
        ward_id = None
        if latitude is not None and longitude is not None:
            # Simple check: query wards and map to closest coordinate or simple lat/long bounding logic
            wards = self.db.query(Ward).all()
            if wards:
                # Fallback: assign to the first ward, or calculate a mock ward mapping
                ward_index = int((abs(latitude) + abs(longitude)) * 100) % len(wards)
                ward_id = wards[ward_index].id

        # Construct and save Suggestion model
        db_suggestion = Suggestion(
            citizen_phone=citizen_phone,
            content=content or "",
            english_translation=english_translation,
            language_code=language_code,
            audio_url=audio_url,
            image_url=image_url,
            latitude=latitude,
            longitude=longitude,
            category=category,
            sentiment=sentiment,
            priority_score=priority_score,
            ward_id=ward_id,
            status="Submitted",
        )

        self.db.add(db_suggestion)
        self.db.commit()
        self.db.refresh(db_suggestion)
        return db_suggestion

    def get_suggestions(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        ward_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Suggestion]:
        query = self.db.query(Suggestion)
        if category:
            query = query.filter(Suggestion.category == category)
        if status:
            query = query.filter(Suggestion.status == status)
        if ward_id:
            query = query.filter(Suggestion.ward_id == ward_id)

        return (
            query.order_by(Suggestion.created_at.desc()).offset(skip).limit(limit).all()
        )
