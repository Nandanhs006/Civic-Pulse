# 🤖 Civic Pulse — AI & ML Architecture

*AI-powered civic grievance classification, voice intake, photo analysis, and duplicate detection.*
*All modules gracefully degrade — the platform never crashes when a credential is missing.*

---

## ✨ Section 1: AI / ML & Generative AI

> **auto_awesome** — Gemini API, Vertex AI (model building, fine-tuning, agents), Google AI Studio

### Gemini API — `gemini-2.5-flash`
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
