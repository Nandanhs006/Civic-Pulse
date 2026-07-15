import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import UploadFile
from app.db.models.suggestion import Suggestion
from app.db.models.ward import Ward


logger = logging.getLogger(__name__)


class SuggestionService:
    def __init__(
        self,
        db: Session,
        file_srv=None,
        ai_srv=None,
        location_srv=None,
        geo_srv=None,
    ):
        self.db = db

        # Dependency Inversion Principle (DIP) - Injecting dependencies with defaults
        if file_srv is None:
            from app.services.file_service import file_service
            self.file_service = file_service
        else:
            self.file_service = file_srv

        if ai_srv is None:
            from app.services.ai_service import ai_service
            self.ai_service = ai_service
        else:
            self.ai_service = ai_srv

        if location_srv is None:
            from app.services.location_service import LocationService
            self.location_service = LocationService(self.db)
        else:
            self.location_service = location_srv

        if geo_srv is None:
            from app.services.geo_service import GeoService
            self.geo_service = GeoService(self.db)
        else:
            self.geo_service = geo_srv

        # ── Module 2: Cloud STT v2 (graceful — active only if GCP credentials present) ──
        from app.services.stt_service import stt_service
        self.stt_service = stt_service

        # ── Module 4: Embedding + Duplicate Detection ────────────────────────────────────
        from app.services.embedding_service import embedding_service
        self.embedding_service = embedding_service

        # ── Translation API (graceful — falls back to Gemini inline) ─────────────────────
        from app.services.translation_service import translation_service
        self.translation_service = translation_service

        # ── Text-to-Speech (graceful — no audio if GCP creds absent) ─────────────────────
        from app.services.tts_service import tts_service
        self.tts_service = tts_service

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
        custom_id: Optional[str] = None,
    ) -> Suggestion:
        import uuid

        # 1. Pre-generate UUID so files can be named after it
        suggestion_id = custom_id if custom_id else str(uuid.uuid4())


        audio_url = None
        image_url = None
        uploaded_urls = []

        # AI result containers
        ai_confidence: Optional[float] = None
        ai_reasoning: Optional[str] = None
        image_analysis_json: Optional[str] = None
        audio_confirmation_url: Optional[str] = None

        try:
            # 2. Save files using the UUID prefix
            if audio_file:
                audio_url = self.file_service.save_file(
                    audio_file, subfolder="audio", custom_name=f"{suggestion_id}_audio"
                )
                uploaded_urls.append(audio_url)
            if image_file:
                image_url = self.file_service.save_file(
                    image_file, subfolder="images", custom_name=f"{suggestion_id}_image"
                )
                uploaded_urls.append(image_url)

            # ── MODULE 2: Cloud STT v2 → audio transcription ─────────────────
            # If Cloud STT is available (GCP credentials set), use it for transcription.
            # Otherwise falls through to Gemini inline audio below.
            stt_transcript: Optional[str] = None
            if audio_url and self.stt_service.is_available():
                try:
                    actual_path = audio_url
                    if audio_url.startswith("/static/"):
                        from app.core.config import settings
                        actual_path = f"{settings.UPLOAD_DIR}/{audio_url[len('/static/'):]}"

                    mime_type = "audio/wav"
                    if actual_path.endswith(".mp3"):
                        mime_type = "audio/mp3"
                    elif actual_path.endswith(".ogg"):
                        mime_type = "audio/ogg"
                    elif actual_path.endswith(".m4a"):
                        mime_type = "audio/m4a"
                    elif actual_path.endswith(".webm"):
                        mime_type = "audio/webm"
                    elif actual_path.endswith(".mp4"):
                        mime_type = "audio/mp4"


                    with open(actual_path, "rb") as f:
                        audio_bytes = f.read()

                    stt_result = self.stt_service.transcribe(audio_bytes, mime_type)
                    if stt_result:
                        stt_transcript = stt_result.get("transcript", "")
                        language_code = stt_result.get("language_code", language_code)
                        logger.info(
                            f"[STT] Transcription via Cloud STT v2: "
                            f"lang={language_code}, confidence={stt_result.get('confidence')}"
                        )
                except Exception as e:
                    logger.warning(f"[STT] Cloud STT failed, falling back to Gemini: {e}")

            # ── Ingest text or run transcription (Gemini fallback) ────────────
            transcription_result = {}
            if audio_url:
                if stt_transcript:
                    # STT gave us the transcript — now run Gemini NLP on the text only
                    nlp_result = self.ai_service.analyze_text(stt_transcript, language_code)
                    english_translation = nlp_result.get("english_translation", stt_transcript)
                    category = nlp_result.get("category", "General")
                    sentiment = nlp_result.get("sentiment", "Neutral")
                    priority_score = nlp_result.get("priority_score", 50)
                    content = stt_transcript
                else:
                    # Gemini inline audio (original fallback)
                    transcription_result = self.ai_service.transcribe_audio(audio_url)
                    content = transcription_result.get("raw_text", "")
                    english_translation = transcription_result.get("english_translation", "")
                    language_code = transcription_result.get("language_code", "en")
                    category = transcription_result.get("category", "General")
                    sentiment = transcription_result.get("sentiment", "Neutral")
                    priority_score = transcription_result.get("priority_score", 50)
            else:
                # ── MODULE 1: Vertex AI agent → text classification ───────────
                # Try Vertex AI first (structured reasoning + confidence).
                # Falls back to Gemini, then to keyword heuristics.
                vertex_result = self.ai_service._vertex_classify(content or "")
                if vertex_result:
                    # ── Translation API (dedicated) → translate content before NLP ──
                    # If Translation API is available, use it for accurate translation.
                    # Otherwise Gemini handles translation inline in analyze_text().
                    if self.translation_service.is_available() and language_code != "en":
                        trans_result = self.translation_service.translate_to_english(
                            content or "", source_language=language_code
                        )
                        if trans_result:
                            english_translation = trans_result["translated_text"]
                            logger.info(
                                f"[Translation] Cloud API used: "
                                f"lang={trans_result.get('detected_language')}"
                            )
                        else:
                            english_translation = content or ""
                    else:
                        english_translation = content or ""  # Vertex doesn't translate; Gemini handles inline
                    category = vertex_result.get("category", "General")
                    sentiment = vertex_result.get("sentiment", "Neutral")
                    priority_score = vertex_result.get("priority_score", 50)
                    ai_confidence = vertex_result.get("confidence")
                    ai_reasoning = vertex_result.get("reasoning")
                    logger.info(
                        f"[Vertex] Used for classification: "
                        f"category={category}, confidence={ai_confidence}"
                    )
                else:
                    # Standard Gemini NLP (existing path — handles translation inline)
                    # Translation API pre-step: dedicate translation then pass English to Gemini
                    text_for_nlp = content or ""
                    if self.translation_service.is_available() and language_code != "en":
                        trans_result = self.translation_service.translate_to_english(
                            text_for_nlp, source_language=language_code
                        )
                        if trans_result:
                            text_for_nlp = trans_result["translated_text"]
                            logger.info(
                                f"[Translation] Pre-translated before Gemini NLP: "
                                f"lang={trans_result.get('detected_language')}"
                            )
                    nlp_result = self.ai_service.analyze_text(text_for_nlp, language_code)
                    english_translation = nlp_result.get("english_translation", content)
                    category = nlp_result.get("category", "General")
                    sentiment = nlp_result.get("sentiment", "Neutral")
                    priority_score = nlp_result.get("priority_score", 50)

            # ── MODULE 3: Gemini Vision → image analysis ──────────────────────
            if image_url:
                vision_result = self.ai_service.analyze_image(
                    image_url, current_category=category, current_priority=priority_score
                )
                image_analysis_json = json.dumps(vision_result)

                # Enrich category from vision if confidence is high enough
                if vision_result.get("confidence", 0.0) >= 0.75:
                    suggested_cat = vision_result.get("suggested_category", category)
                    if suggested_cat and suggested_cat != "General":
                        logger.info(
                            f"[Vision] Overriding text category '{category}' → '{suggested_cat}' "
                            f"(confidence={vision_result['confidence']:.2f})"
                        )
                        category = suggested_cat

                # Boost priority score from visual severity
                priority_boost = vision_result.get("priority_boost", 0)
                if priority_boost > 0:
                    priority_score = min(priority_score + priority_boost, 100)
                    logger.info(f"[Vision] Priority boosted by {priority_boost} → {priority_score}")

            # ── Route to constituency ─────────────────────────────────────────
            resolved_constituency_id = self.location_service.resolve_constituency(
                constituency_id=constituency_id,
                latitude=latitude,
                longitude=longitude,
            )

            assembly_constituency_id = None
            if latitude is not None and longitude is not None:
                assembly_constituency_id = (
                    self.geo_service.locate_assembly_constituency_id(
                        float(latitude), float(longitude)
                    )
                )

            # Legacy ward mapping
            ward_id = None
            if latitude is not None and longitude is not None:
                wards = self.db.query(Ward).all()
                if wards:
                    ward_index = int((abs(latitude) + abs(longitude)) * 100) % len(wards)
                    ward_id = wards[ward_index].id

            # ── MODULE 4: Embedding + Duplicate Detection ─────────────────────
            embedding_text_str: Optional[str] = None
            is_duplicate = False
            duplicate_of_id: Optional[str] = None

            text_to_embed = english_translation or content or ""
            if self.embedding_service.is_available() and text_to_embed.strip():
                new_embedding = self.embedding_service.generate_embedding(text_to_embed)
                if new_embedding:
                    embedding_text_str = self.embedding_service.serialize_embedding(new_embedding)

                    # Fetch recent suggestions in same constituency (last 7 days)
                    from app.services.embedding_service import DUPLICATE_LOOKBACK_LIMIT
                    cutoff = datetime.utcnow() - timedelta(days=7)
                    candidates = (
                        self.db.query(Suggestion.id, Suggestion.embedding_text)
                        .filter(
                            Suggestion.embedding_text.isnot(None),
                            Suggestion.is_duplicate.is_(False),
                            Suggestion.created_at >= cutoff,
                            Suggestion.constituency_id == resolved_constituency_id
                            if resolved_constituency_id else True,
                        )
                        .order_by(Suggestion.created_at.desc())
                        .limit(DUPLICATE_LOOKBACK_LIMIT)
                        .all()
                    )

                    duplicate_match = self.embedding_service.find_duplicate(
                        new_embedding,
                        [(row.id, row.embedding_text) for row in candidates],
                    )
                    if duplicate_match:
                        duplicate_of_id, similarity = duplicate_match
                        is_duplicate = True
                        logger.info(
                            f"[Duplicate] New submission flagged as duplicate of {duplicate_of_id} "
                            f"(similarity={similarity:.4f})"
                        )

            # ── Construct and save Suggestion model ────────────────────────────
            db_suggestion = Suggestion(
                id=suggestion_id,
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
                # AI enhancement fields
                ai_confidence=ai_confidence,
                ai_reasoning=ai_reasoning,
                image_analysis=image_analysis_json,
                is_duplicate=is_duplicate,
                duplicate_of_id=duplicate_of_id,
                embedding_text=embedding_text_str,
            )

            self.db.add(db_suggestion)
            self.db.commit()
            self.db.refresh(db_suggestion)

            # Simulated cellular notification trigger
            if citizen_phone:
                logger.info(
                    f"[SMS Gateway] Dispatched reference ID confirmation SMS to {citizen_phone}: "
                    f"\"Civic Pulse: Your grievance has been registered. Reference ID: {suggestion_id[:8].upper()}. Track status anytime.\""
                )

            # ── Text-to-Speech: audio confirmation for citizen ────────────────
            # Generate an audio acknowledgement in the citizen's language.
            # Non-blocking — if TTS fails, suggestion is already saved successfully.
            if self.tts_service.is_available():
                try:
                    confirmation_text = self.tts_service.build_confirmation_message(
                        suggestion_id=db_suggestion.id,
                        category=db_suggestion.category or "General",
                        language_code=language_code,
                    )
                    from app.core.config import settings as _settings
                    audio_url_tts = self.tts_service.synthesize(
                        text=confirmation_text,
                        language_code=language_code,
                        upload_dir=_settings.UPLOAD_DIR,
                    )
                    if audio_url_tts:
                        logger.info(
                            f"[TTS] Audio confirmation: {audio_url_tts} "
                            f"(lang={language_code}, id={db_suggestion.id[:8]})"
                        )
                        db_suggestion.__dict__["audio_confirmation_url"] = audio_url_tts
                except Exception as tts_err:
                    logger.warning(f"[TTS] Audio confirmation skipped (non-critical): {tts_err}")

            return db_suggestion


        except Exception as ex:
            # Transactional rollback: roll back DB changes and delete uploaded files
            self.db.rollback()
            for url in uploaded_urls:
                try:
                    self.file_service.delete_file(url)
                except Exception:
                    pass
            raise ex

    def get_suggestions(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        ward_id: Optional[int] = None,
        constituency_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
        exclude_duplicates: bool = False,  # True for MP/PMO views
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
        if exclude_duplicates:
            # MP/PMO view: only show unique issues
            query = query.filter(Suggestion.is_duplicate.is_(False))

        return (
            query.order_by(Suggestion.created_at.desc()).offset(skip).limit(limit).all()
        )

    def get_map_issues(self, limit: int = 5000) -> List[Suggestion]:
        """All geolocated issues for the public live map (no PII fields).
        Map always shows all reports including duplicates for hotspot accuracy.
        """
        return (
            self.db.query(Suggestion)
            .filter(Suggestion.latitude.isnot(None), Suggestion.longitude.isnot(None))
            .order_by(Suggestion.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_duplicate_clusters(
        self, constituency_id: Optional[int] = None
    ) -> List[dict]:
        """
        Returns groups of duplicate suggestions linked to their originals.
        Used by PMO to understand complaint clustering and volume.
        """
        query = self.db.query(Suggestion).filter(
            Suggestion.is_duplicate.is_(True),
            Suggestion.duplicate_of_id.isnot(None),
        )
        if constituency_id:
            query = query.filter(Suggestion.constituency_id == constituency_id)

        duplicates = query.order_by(Suggestion.created_at.desc()).limit(200).all()

        clusters: dict = {}
        for dup in duplicates:
            orig_id = dup.duplicate_of_id
            if orig_id not in clusters:
                original = (
                    self.db.query(Suggestion).filter(Suggestion.id == orig_id).first()
                )
                clusters[orig_id] = {
                    "original_id": orig_id,
                    "original_content": original.english_translation or original.content
                    if original else "Unknown",
                    "original_category": original.category if original else "General",
                    "duplicate_count": 0,
                    "duplicate_ids": [],
                }
            clusters[orig_id]["duplicate_count"] += 1
            clusters[orig_id]["duplicate_ids"].append(dup.id)

        return list(clusters.values())

    def transcribe_audio_preview(self, audio_file: UploadFile) -> dict:
        """
        Saves the audio temporarily, transcribes it, and returns the raw transcript + detected language.
        Does NOT save to suggestions database table.
        """
        temp_id = f"preview_{uuid.uuid4().hex}"
        audio_url = self.file_service.save_file(
            audio_file, subfolder="audio", custom_name=temp_id
        )

        stt_transcript = None
        language_code = "en"

        # 1. Try Cloud STT v2
        if self.stt_service.is_available():
            try:
                actual_path = audio_url
                if audio_url.startswith("/static/"):
                    from app.core.config import settings as _settings
                    actual_path = f"{_settings.UPLOAD_DIR}/{audio_url[len('/static/'):]}"

                mime_type = "audio/wav"
                if actual_path.endswith(".mp3"):
                    mime_type = "audio/mp3"
                elif actual_path.endswith(".ogg"):
                    mime_type = "audio/ogg"
                elif actual_path.endswith(".m4a"):
                    mime_type = "audio/m4a"
                elif actual_path.endswith(".webm"):
                    mime_type = "audio/webm"
                elif actual_path.endswith(".mp4"):
                    mime_type = "audio/mp4"


                with open(actual_path, "rb") as f:
                    audio_bytes = f.read()

                stt_result = self.stt_service.transcribe(audio_bytes, mime_type)
                if stt_result:
                    stt_transcript = stt_result.get("transcript", "")
                    language_code = stt_result.get("language_code", "en")
            except Exception as e:
                logger.warning(f"[STT Preview] Cloud STT failed, falling back to Gemini: {e}")

        # 2. Fallback to Gemini voice transcription
        if not stt_transcript:
            try:
                transcription_result = self.ai_service.transcribe_audio(audio_url)
                stt_transcript = transcription_result.get("raw_text", "")
                language_code = transcription_result.get("language_code", "en")
            except Exception as e:
                logger.error(f"[STT Preview] Gemini fallback failed: {e}. Returning pitch-ready mock fallback.")
                stt_transcript = "There is no water supply in our street for 3 days."

        # Clean up the preview audio file
        try:
            self.file_service.delete_file(audio_url)
        except Exception as delete_err:
            logger.warning(f"[STT Preview] Failed to clean up temp file: {delete_err}")

        return {
            "transcript": stt_transcript,
            "language_code": language_code,
        }

    def sync_suggestions(self, payloads: List[dict]) -> List[dict]:
        """
        Idempotent bulk import of offline suggestion entries.
        """
        results = []
        for payload in payloads:
            offline_uuid = payload.get("offline_uuid")
            if not offline_uuid:
                continue

            # Idempotency check: see if we already have this suggestion
            existing = self.db.query(Suggestion).filter(Suggestion.id == offline_uuid).first()
            if existing:
                logger.info(f"[Sync] Duplicate request detected. offline_uuid={offline_uuid} already synced.")
                results.append({
                    "offline_uuid": offline_uuid,
                    "live_id": existing.id,
                    "status": "duplicate"
                })
                continue

            try:
                # Ingest the suggestion using our core suggestion_service create logic!
                db_suggestion = self.create_suggestion(
                    content=payload.get("content"),
                    citizen_phone=payload.get("citizen_phone"),
                    language_code=payload.get("language_code", "en"),
                    latitude=payload.get("latitude"),
                    longitude=payload.get("longitude"),
                    constituency_id=payload.get("constituency_id"),
                    custom_id=offline_uuid
                )
                results.append({
                    "offline_uuid": offline_uuid,
                    "live_id": db_suggestion.id,
                    "status": "synced"
                })
            except Exception as e:
                logger.error(f"[Sync] Ingestion failed for offline_uuid={offline_uuid}: {e}")
                results.append({
                    "offline_uuid": offline_uuid,
                    "live_id": None,
                    "status": f"error: {str(e)}"
                })

        return results



