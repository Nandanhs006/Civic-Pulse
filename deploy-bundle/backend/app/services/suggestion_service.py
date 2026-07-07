from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import UploadFile
from app.db.models.suggestion import Suggestion
from app.db.models.ward import Ward
from app.services.file_service import file_service
from app.services.ai_service import ai_service
from app.services.location_service import LocationService
from app.services.geo_service import GeoService


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
        constituency_id: Optional[int] = None,
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

        # Route the request to a parliamentary constituency (the MP's unit).
        resolved_constituency_id = LocationService(self.db).resolve_constituency(
            constituency_id=constituency_id,
            latitude=latitude,
            longitude=longitude,
        )

        # Also route to the assembly constituency (the MLA's unit) from GPS.
        assembly_constituency_id = None
        if latitude is not None and longitude is not None:
            assembly_constituency_id = GeoService(
                self.db
            ).locate_assembly_constituency_id(float(latitude), float(longitude))

        # Legacy ward mapping retained for the demographic analytics cards.
        ward_id = None
        if latitude is not None and longitude is not None:
            wards = self.db.query(Ward).all()
            if wards:
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
            constituency_id=resolved_constituency_id,
            assembly_constituency_id=assembly_constituency_id,
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
        constituency_id: Optional[int] = None,
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
        if constituency_id:
            query = query.filter(Suggestion.constituency_id == constituency_id)

        return (
            query.order_by(Suggestion.created_at.desc()).offset(skip).limit(limit).all()
        )

    def get_map_issues(self, limit: int = 5000) -> List[Suggestion]:
        """All geolocated issues for the public live map (no PII fields)."""
        return (
            self.db.query(Suggestion)
            .filter(Suggestion.latitude.isnot(None), Suggestion.longitude.isnot(None))
            .order_by(Suggestion.created_at.desc())
            .limit(limit)
            .all()
        )
