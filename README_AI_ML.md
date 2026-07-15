# 🤖 Civic Pulse — AI & ML Architecture

*AI-powered civic grievance classification, voice intake, photo analysis, and duplicate detection.*
*All modules gracefully degrade — the platform never crashes when a credential is missing.*

---

## ✨ Section 1: AI / ML & Generative AI

> **auto_awesome** — Gemini API, Vertex AI (model building, fine-tuning, agents), Google AI Studio

### Gemini API — `gemini-flash-latest`
**Status: ✅ Live** | Key: `GEMINI_API_KEY`



The core intelligence layer. Every citizen complaint passes through Gemini for:

| Capability | Method | Notes |
|---|---|---|
| Text Classification | `ai_service.analyze_text()` | 8 civic categories |
| Sentiment Analysis | `ai_service.analyze_text()` | Positive / Neutral / Negative |
| Priority Scoring | `ai_service.analyze_text()` | 1–100 urgency score |
| Multilingual Translation | `ai_service.analyze_text()` | Inline in NLP prompt |
| Audio Transcription | `ai_service.transcribe_audio()` | Inline multimodal |
| Photo Analysis | `ai_service.analyze_image()` | Issue + severity + category boost |
| Embedding Generation | `embedding_service.generate_embedding()` | `text-embedding-004` model |

**Fallback chain:**
```
Vertex AI Agent → Gemini API → Keyword Heuristics (always available, no API needed)
```

---

### Vertex AI — `gemini-1.5-flash` Agent
**Status: ⏸ Pitch-Ready** | Keys: `VERTEX_PROJECT_ID` + `GOOGLE_APPLICATION_CREDENTIALS`

Structured reasoning layer — not just a label, but an explanation with confidence.

| Output Field | Description |
|---|---|
| `ai_confidence` | Float 0.0–1.0 stored per suggestion in DB |
| `ai_reasoning` | One-sentence justification for MPs to see |
| `category` | Overrides Gemini if Vertex is available |

**Activate with:**
```env
VERTEX_PROJECT_ID=your-gcp-project
VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```
**File:** `backend/app/services/ai_service.py → _vertex_classify()`

---

### Google AI Studio
**Status: 📋 UI Tool — used for prompt engineering, not in codebase**

Used to prototype and evaluate Gemini prompts before deploying to production. Not an API — no code required.

---

## 🗣️ Section 2: Language & Voice

> **record_voice_over** — Cloud Speech-to-Text, Text-to-Speech, Dialogflow, Translation API

### Cloud Speech-to-Text v2
**Status: ⏸ Pitch-Ready** | Keys: `GOOGLE_APPLICATION_CREDENTIALS` + `GOOGLE_CLOUD_PROJECT`

Purpose-built audio transcription for 20+ Indian regional languages.

| Feature | Detail |
|---|---|
| Languages | Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, Nepali, English (India) |
| Model | `latest_long` — optimised for Indian speech |
| Auto Language Detection | Detects spoken language automatically |
| Word Confidence | Per-word confidence scores |
| Fallback | Gemini inline audio if credentials absent |

**File:** `backend/app/services/stt_service.py`

---

### Translation API v3
**Status: ⏸ Pitch-Ready** | Keys: `GOOGLE_APPLICATION_CREDENTIALS` + `GOOGLE_CLOUD_PROJECT`

Dedicated translation layer. Runs *before* Gemini NLP so the model always receives clean English text.

| Feature | Detail |
|---|---|
| Approach | Pre-translation step in `suggestion_service.create_suggestion()` |
| Accuracy | Purpose-built for translation — more accurate than Gemini inline for pure translation |
| Glossary Support | Civic terms (Gram Panchayat, Tehsil, etc.) translate correctly |
| Fallback | Gemini handles translation inline if Cloud Translation unavailable |

**File:** `backend/app/services/translation_service.py`

---

### Text-to-Speech (WaveNet)
**Status: ⏸ Pitch-Ready** | Key: `GOOGLE_APPLICATION_CREDENTIALS`

Audio confirmation messages for low-literacy citizens — hears their own language after submitting.

| Feature | Detail |
|---|---|
| Trigger | After every successful complaint submission |
| Voice Profiles | WaveNet voices for Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Nepali, English (India) |
| Speaking Rate | 0.9× (slightly slower for rural comprehension) |
| Output | MP3 saved to `/static/tts/` — returned as URL in API response |
| Fallback | API response omits `audio_confirmation_url` if TTS unavailable — no crash |

**Sample message (Hindi):** `"आपकी शिकायत ABC123 दर्ज हो गई है। श्रेणी: Roads। हम जल्द ही कार्रवाई करेंगे।"`

**File:** `backend/app/services/tts_service.py`

---

### Dialogflow CX
**Status: ⏸ Pitch-Ready** | No credentials needed for webhook (Dialogflow agent setup in GCP console)

Conversational AI webhook — citizens submit complaints via WhatsApp, SMS, or voice IVR.

| Intent | Behaviour |
|---|---|
| `civic.welcome` | Greeting + options menu |
| `civic.complaint.start` | Asks for issue description |
| `civic.complaint.detail` | Auto-classifies complaint, asks to confirm |
| `civic.complaint.submit` | Calls `suggestion_service.create_suggestion()` directly |
| `civic.status.check` | Returns live status for a complaint ID |

**Endpoint:** `POST /api/v1/dialogflow/webhook`
**File:** `backend/app/api/v1/dialogflow.py`

---

## 👁️ Section 3: Vision

> **visibility** — Vertex AI Vision, Gemini multimodal, MediaPipe

### Gemini Multimodal — Photo Analysis
**Status: ✅ Live** | Key: `GEMINI_API_KEY`

Citizen uploads photo → Gemini Vision analyses it → enriches complaint category and priority.

| Output | Description |
|---|---|
| `issue_detected` | Pothole / Garbage / Flooding / Smoke / Infrastructure damage / etc. |
| `severity` | Low / Medium / High / Critical |
| `confidence` | Float 0.0–1.0 |
| `suggested_category` | Overrides text category if confidence ≥ 0.75 |
| `priority_boost` | 0–30 points added to priority score |
| `vision_description` | Plain English description shown in UI |

Stored as JSON in `suggestions.image_analysis` column.
**File:** `backend/app/services/ai_service.py → analyze_image()`

---

### Vertex AI Vision API
**Status: ⏸ Pitch-Ready** (AutoML Vision / Object Detection)
Keys: `VERTEX_PROJECT_ID` + `GOOGLE_APPLICATION_CREDENTIALS`

The Vertex AI *text* agent is live. The dedicated Vertex AI Vision API (custom-trained models for Indian infrastructure issues — crop disease, pothole severity grading, smoke classification) would be activated with GCP credentials. Gemini multimodal handles photo analysis until then.

---

### MediaPipe — On-Device Classification
**Status: ⏸ Pitch-Ready** | No backend credentials needed — runs in browser

Client-side photo pre-classification before upload. Uses EfficientNet Lite 4 via MediaPipe tasks-vision WASM.

| Feature | Detail |
|---|---|
| Model | EfficientNet Lite 4 (WASM, runs in browser) |
| Trigger | On `<input type="file">` photo selection |
| Output | Civic category hint sent with form as `mediapipe_category_hint` |
| Latency | ~200ms after model warm-up |
| Fallback | If MediaPipe fails → form submits normally → Gemini Vision classifies server-side |
| Pre-warm | Called 3 seconds after page load to reduce first-photo latency |

**File:** `frontend/src/services/mediapipeClassifier.ts`

---

## 📊 Full Coverage Summary

| Technology | Status | Activation |
|---|---|---|
| **Gemini API** (text + audio + image + embeddings) | ✅ **Live** | `GEMINI_API_KEY` |
| **Vertex AI Agent** (structured reasoning) | ⏸ Pitch-Ready | GCP service account |
| **Google AI Studio** (prompt engineering) | 📋 UI Tool | n/a |
| **Cloud Speech-to-Text v2** (multilingual audio) | ⏸ Pitch-Ready | GCP service account |
| **Translation API v3** (dedicated translation) | ⏸ Pitch-Ready | GCP service account |
| **Text-to-Speech** (WaveNet, 11 Indian languages) | ⏸ Pitch-Ready | GCP service account |
| **Dialogflow CX** (WhatsApp / SMS flows) | ⏸ Pitch-Ready | GCP console agent setup |
| **Gemini Multimodal Vision** (photo analysis) | ✅ **Live** | `GEMINI_API_KEY` |
| **Vertex AI Vision API** (custom CV models) | ⏸ Pitch-Ready | GCP service account |
| **MediaPipe** (on-device pre-classification) | ⏸ Pitch-Ready | Browser CDN (no backend) |

**Currently live with just `GEMINI_API_KEY`: 2 of 10 ✅**
**Activates with GCP service account: 7 of 10 ✅**
**UI Tool: 1 of 10 (Google AI Studio)**

---

## 🔑 Environment Variables

```env
# ── Currently Active ──────────────────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key
MOCK_AI_PIPELINE=false

# ── Activates with GCP Service Account ───────────────────────────
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
VERTEX_PROJECT_ID=your-gcp-project-id
VERTEX_LOCATION=us-central1
GOOGLE_CLOUD_PROJECT=your-gcp-project-id   # Used by STT + Translation

# ── Duplicate Detection Tuning ────────────────────────────────────
DUPLICATE_SIMILARITY_THRESHOLD=0.92
DUPLICATE_LOOKBACK_LIMIT=500
```

---

## 🏗️ Full AI Pipeline (All Modules)

```
Citizen Submission
       │
       ├─── Audio Upload ──► Cloud STT v2 (GCP) ──► Gemini Inline (fallback)
       │                              └──► Transcript + Language Code
       │
       ├─── Photo Upload ──► [Browser] MediaPipe EfficientNet (on-device hint)
       │                  └──► [Server] Gemini Vision ──► Issue + Severity + Category Boost
       │                              └──► Vertex AI Vision (when GCP active)
       │
       ├─── Text Input ───► Translation API v3 (GCP) ──► Gemini inline (fallback)
       │                  └──► Vertex AI Agent (GCP) ──► Gemini NLP (fallback)
       │                              └──► Category + Sentiment + Reasoning + Confidence
       │
       └─── Always ───────► Gemini text-embedding-004 ──► Duplicate Detection
                                       │
                                       └── Saved + Flagged ──► MP sees unique issues only
       │
       └─── Post-Submit ──► Cloud TTS (GCP) ──► Audio confirmation MP3
                                       └──► Citizen hears confirmation in their language
```


---

## 🗣️ Voice Recording & Real-time Speech-to-Text Preview

### 1. Browser Playback Fix (No More Corrupt Containers)
To resolve browser compatibility issues where users could not play back or hear their recorded audio clips (especially on macOS/iOS Safari and Chrome):
* Previously, the recorder hook forced `{ type: 'audio/wav' }` on the generated file Blob.
* We updated the hook to dynamically capture the `MediaRecorder`'s native container `mimeType` (e.g., `audio/webm` or `audio/mp4`).
* This preserves container headers intact so that standard HTML5 `<audio>` elements can play them back flawlessly.

### 2. Live Speech-to-Text Preview
Citizens get a live preview of what the AI transcribed from their audio *before* they click submit:
* When recording completes, the React frontend auto-uploads the audio blob to the backend's `/suggestions/transcribe` preview endpoint.
* The backend processes the audio on-the-fly (via Cloud STT v2 or Gemini voice fallback).
* The transcript is rendered dynamically inside a green, glassy AI review card next to the audio player and automatically pre-fills the description text area.
* Citizens can review, edit, or submit the text directly.

**Endpoint:** `POST /api/v1/suggestions/transcribe`

---

## 📁 File Map


| File | Module | Status |
|---|---|---|
| `backend/app/services/ai_service.py` | Gemini + Vertex AI | ✅ Live |
| `backend/app/services/stt_service.py` | Cloud STT v2 | ⏸ Pitch-Ready |
| `backend/app/services/translation_service.py` | Translation API v3 | ⏸ Pitch-Ready |
| `backend/app/services/tts_service.py` | Text-to-Speech WaveNet | ⏸ Pitch-Ready |
| `backend/app/services/embedding_service.py` | Gemini Embeddings + Duplicates | ✅ Live |
| `backend/app/api/v1/dialogflow.py` | Dialogflow CX Webhook | ⏸ Pitch-Ready |
| `backend/app/services/suggestion_service.py` | Full pipeline orchestration | ✅ Live |
| `frontend/src/services/mediapipeClassifier.ts` | MediaPipe on-device | ⏸ Pitch-Ready |
| `backend/app/scripts/migrate_ai_fields.py` | DB migration for AI columns | Run once |

---

## 📢 Pitch Deck Guide: Module Breakdown

### 1. `ai_service.py` (Gemini & Vertex AI Core)
* **What it is**: The primary intelligence engine.
* **Pitch explanation**: "This module connects directly to Google Gemini and Vertex AI. It takes raw, unstructured text from a citizen and instantly processes it: translating it from 20+ regional Indian languages, categorizing it (e.g. Roads, Water, Safety), performing sentiment analysis to detect frustration levels, and calculating a priority score. If GCP credentials are present, it dynamically loads Vertex AI to generate structured reasoning explaining *why* it scored the grievance that way."

### 2. `stt_service.py` (Cloud Speech-to-Text v2)
* **What it is**: High-fidelity Indian dialect transcriber.
* **Pitch explanation**: "This module handles multilingual voice intake. It is built on Google's next-generation Cloud Speech-to-Text v2 API, optimized with the `latest_long` audio model. It supports auto-detecting and transcribing 20+ Indian languages (Hindi, Tamil, Telugu, Kannada, etc.) dynamically. If the cloud API is offline, the pipeline gracefully falls back to Gemini's inline audio ingestion without disrupting the citizen."

### 3. `translation_service.py` (Translation API v3)
* **What it is**: Dedicated real-time translation bridge.
* **Pitch explanation**: "To ensure maximum classification accuracy, this module handles translating incoming regional complaints into clean English before they hit the core NLP classifier. It utilizes Google Cloud Translation v3, which supports custom glossaries. This means local civic terms like *'Gram Panchayat'*, *'Tehsil'*, or *'Patwari'* are translated correctly, preserving context that standard translation tools lose."

### 4. `tts_service.py` (Text-to-Speech WaveNet Confirmations)
* **What it is**: Multilingual audio acknowledgment generator.
* **Pitch explanation**: "A key feature for low-literacy or rural citizens. When a citizen submits a complaint, this module uses Google Wavenet voices (configured for 11 regional Indian languages) to generate an on-the-fly MP3 audio confirmation (e.g., *'Your complaint has been registered under ID ABC123'*) spoken back to them in their own native tongue. It plays instantly in the citizen's browser upon submission."

### 5. `embedding_service.py` (Gemini Embeddings & Duplicate Detection)
* **What it is**: AI-driven deduplication engine.
* **Pitch explanation**: "MPs are flooded with duplicate complaints about the same pothole or broken pipe. This module uses Gemini's `text-embedding-004` model to convert every complaint into a high-dimensional vector. It runs real-time cosine similarity checks against the last 500 complaints in that constituency. If a new report is a duplicate (similarity > 92%), it is flagged, saved for the citizen, but filtered out of the MP's dashboard—cutting through the noise. **It also leverages GPS coordinates: it auto-scopes the lookup to candidates within the same physical constituency boundary resolved by the citizen's GPS coordinates, ensuring spatial accuracy.**"


### 6. `dialogflow.py` (Conversational AI Webhook)
* **What it is**: Multi-channel intake router (WhatsApp, SMS, IVR).
* **Pitch explanation**: "This endpoint acts as the backend fulfillment webhook for Google Dialogflow CX. It allows citizens to file grievances or check complaint status via WhatsApp, SMS, or interactive voice calls (IVR). The conversational agent collects details, auto-classifies them, and saves them directly into the main database, creating a friction-free intake channel. **A webhook is critical here because Dialogflow itself is only a conversational parser with no database or backend logic access. Dialogflow acts as the front desk receptionist (collecting user information politely) while the Webhook acts as the office database administrator (taking that info, saving it to PostgreSQL/SQLite, running duplication checks, and returning a real tracking ID).**"



### 7. `suggestion_service.py` (Pipeline Orchestrator)
* **What it is**: The transaction coordinator.
* **Pitch explanation**: "The brain of the backend. It coordinates the transactional workflow. When a submission arrives, it saves files, triggers audio transcription, enriches the request with Gemini Vision photo analysis, runs the deduplication engine, auto-detects administrative boundaries via GPS, routes it to the correct local ward officer, and triggers the audio playback confirmation."

### 8. `mediapipeClassifier.ts` (On-Device Vision Classifier)
* **What it is**: Browser-side client-side machine learning.
* **Pitch explanation**: "For rural areas with poor internet connectivity, we don't want to waste bandwidth sending large images to the server. This module uses Google MediaPipe (running EfficientNet Lite 4 WASM) on-device inside the citizen's browser. It classifies uploaded photos (e.g. detecting garbage vs potholes) locally in ~200ms before upload, sending a category hint to help the server process it faster."

### 9. `migrate_ai_fields.py` (Database Migration Script)
* **What it is**: Database schema preparation.
* **Pitch explanation**: "An administrative utility that alters database tables (SQLite for local/offline demos and PostgreSQL for production) to prepare the schema to store AI metadata (AI confidence, reasoning text, vision analysis json, duplicate flags, and embedding vectors) without corrupting existing citizen data."

