# Walkthrough: Gemini AI Voice Transcription & Classification

We have successfully implemented and verified the **Real AI Voice Transcription & Classification** pipeline for the Civic Pulse project. This integration replaces the mock data and heuristic rules with live, multimodal processing powered by the **Gemini 2.5 Flash** API.

---

## What Was Implemented

### 1. Backend Config & Pydantic Settings
* **Modified [config.py](file:///c:/digitals/Civic-Pulse/backend/app/core/config.py)**:
  * Exposes `GEMINI_API_KEY`, `GEMINI_MODEL`, and `RATE_LIMIT_SUGGESTIONS_PER_HOUR` configurations.
  * Swapped `env_ignore_empty=True` to `env_ignore_empty=False` inside `SettingsConfigDict` to allow empty string variables (like empty passwords) to load correctly.
* **Modified [backend/.env](file:///c:/digitals/Civic-Pulse/backend/.env)**:
  * Unblocked local PostgreSQL dependency crashes by adding `POSTGRES_PASSWORD=`, triggering SQLite fallback automatically.
  * Loaded user-configured `GEMINI_API_KEY` and set `GEMINI_MODEL=gemini-2.5-flash` to query the stable Gemini 2.5 model namespace.

### 2. Live API Transcription & Text Analysis
* **Modified [ai_service.py](file:///c:/digitals/Civic-Pulse/backend/app/services/ai_service.py)**:
  * **`transcribe_audio`**: Resolves `/static/...` audio URLs to local disk files, encodes audio to base64, and POSTs to the Gemini `generateContent` endpoint using `httpx`. Uses `responseSchema` in generation configurations to guarantee type-safe JSON returns.
  * **`analyze_text`**: Sends raw text submissions directly to Gemini for multilingual translation, sentiment analysis, category tagging, and severity prioritization.
  * **Mock Failbacks**: Features graceful error boundaries. If the API key is not configured, or if the network request fails, the service falls back to mock transcripts/heuristics so the server never crashes.

### 3. Rate-Limiter Tuning & Test Database Fallback
* **Modified [rate_limit.py](file:///c:/digitals/Civic-Pulse/backend/app/middleware/rate_limit.py)**: Updates hardcoded limits to use `settings.RATE_LIMIT_SUGGESTIONS_PER_HOUR` to allow developers to perform rapid submission testing.
* **Modified [session.py](file:///c:/digitals/Civic-Pulse/backend/app/db/session.py)**: Automatically detects when unit tests are running (`"pytest" in sys.modules`) and triggers SQLite fallback to prevent connection errors during test imports.

---

## Technical Troubleshooting & Fixes Applied

1. **Uvicorn Reloading & Dotenv Watchers**:
   * *Problem*: Modifying `.env` keys doesn't trigger Uvicorn's file reloader process, leading to stale model configs.
   * *Solution*: Terminated and restarted the server using a fresh background task (`.\venv\Scripts\python -m uvicorn app.main:app --port 8000 --reload`).
2. **Model Availability (v1beta 404)**:
   * *Problem*: Querying `models/gemini-1.5-flash` on the `v1beta` endpoint returned a `404 Not Found` error.
   * *Solution*: Queried the `listModels` method using the API key to identify available models and upgraded configuration targets to `gemini-2.5-flash`.

---

## Running Verification

### 1. Direct API Request Ingestion Verification
We tested the API directly by posting a suggestion referencing multiple conflicting keywords (e.g. "school" and "sewage"):
```powershell
.\venv\Scripts\python -c "import httpx; r = httpx.post('http://127.0.0.1:8000/api/v1/suggestions/', data={'content': 'The high school near ward 3 has extremely bad sewage overflow, please fix it immediately.', 'language_code': 'en'}, timeout=30.0); print('RESPONSE:', r.text)"
```

**Output**:
```json
{
  "id": "f6eaa2c7-dc49-4e11-a7d6-979cb0d20623",
  "content": "The high school near ward 3 has extremely bad sewage overflow, please fix it immediately.",
  "english_translation": "The high school near ward 3 has extremely bad sewage overflow, please fix it immediately.",
  "category": "Sanitation",
  "sentiment": "Negative",
  "priority_score": 90,
  "status": "Submitted"
}
```
*Note: The old mock heuristic would match "school" and put this under **Education**. The real Gemini 2.5 API correctly analyzed the context and categorized it under **Sanitation**.*

### 2. Pytest Suite Execution
From the `backend/` directory:
```powershell
$env:PYTHONPATH="."; .\venv\Scripts\pytest
```

**Output**:
```
tests\test_auth.py ..                                                    [ 50%]
tests\test_suggestions.py ..                                             [100%]
======================== 4 passed, 3 warnings in 6.40s ========================
```
