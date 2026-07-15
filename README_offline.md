# 📱 Civic Pulse — Mobile & Offline Channel Architecture

*High-availability intake channels for rural and low-connectivity environments.*

---

## 🗺️ Channel Overview & User Experience

To guarantee 100% citizen inclusivity, Civic Pulse extends beyond web browsers into native mobile, SMS, and WhatsApp messaging platforms.

```
                  ┌────────────── Citizen Channels ──────────────┐
                  │                                              │
       [Mobile App (Flutter)]            [WhatsApp]           [Basic SMS]
                  │                          │                    │
          (Offline Queue)              (Dialogflow CX)     (SMS Gateway API)
                  │                          │                    │
                  ▼                          ▼                    ▼
       ┌─────────────────────────────────────────────────────────────────┐
       │                 Civic Pulse HTTPS API Gateway                   │
       └─────────────────────────────────────────────────────────────────┘
```

---

## 📱 1. Mobile App Channel (Flutter / Android)
*Pitch status: Showcase-Ready UX Design*

Designed specifically for remote field environments, supporting **all core features of the web portal** plus a **local offline queue**:

### Key UX Features:
* **Parity with Web Portal**: Supports all web features, including multilingual voice intake, interactive regional map/sentiment feeds, GPS constituency autodetect, and **MediaPipe on-device image classification** (runs locally on-device via TensorFlow Lite).
* **Local-First Database (Hive / SQLite)**: Active reports, audio recordings, and photos are saved securely on the device instantly—even with zero network bars.
* **Smart Offline Queue**: The app monitors network connectivity using background sync workers (WorkManager/JobScheduler). The moment internet is restored, it automatically pushes the queued grievances to the backend sync API.
* **Low-Bandwidth Compression**: Auto-compresses photos and converts voice clips to highly efficient lightweight audio containers before upload to preserve bandwidth on rural networks.


---

## 💬 2. WhatsApp Business API Channel
*Pitch status: Dialogflow Integration Live (with Interactive Simulator)*

Enables conversational complaint submission directly from India's most popular messaging application. 

### Key UX Features:
* **No App Install Required**: Citizens simply text the MP's verified business account.
* **Conversational AI Intake**: Powered by a Dialogflow CX agent that guides the user step-by-step.
* **Direct Grievance Bypass**: Citizens do not need to type "report" first—they can directly message their issue (e.g., *"no water supply for 3 days"*), and the webhook immediately auto-classifies the category.
* **Photo Ingestion Assistant**: If a user asks to upload an image, the bot gives clear instructions on sending standard media attachments and holds active parameters so no text details are lost.
* **Interactive Simulator**: Open **`/simulator`** on the web portal to test this multi-turn Dialogflow CX conversation flow in a high-fidelity mock WhatsApp interface.
* **Real-time Status Updates**: Citizens can type *"Status ABC123"* to retrieve the active ticket progress.


---

## 📟 3. Basic SMS Gateway Channel
*Pitch status: Low-Connectivity Gateway Intake*

Provides basic text-only complaint intake for citizens using feature phones (non-smartphones) or areas with zero internet connectivity.

### Key UX Features:
* **Keyword Intake Protocol**: Citizens text simple formatted messages to a dedicated toll-free shortcode:
  `REPORT [Category] [Description]` (e.g., `REPORT Water Pipe broken near market`)
* **Auto-Routing**: The SMS Gateway API receives the text message, auto-resolves the sender's constituency by their mobile circle registry, and routes it to the correct MP panel.
* **Text Status Response**: The gateway replies with a basic reference code via SMS instantly.

---

## 🔌 4. Why is a Dialogflow Webhook Needed?

In a conversational system (WhatsApp/SMS/Voice IVR), **Dialogflow CX** handles natural language understanding (NLP) to detect *intents* (what the user wants). However, Dialogflow is just a conversational engine—it cannot read/write database tables or run business logic.

This is where the **FastAPI Webhook** (`backend/app/api/v1/dialogflow.py`) comes in.

* **Dialogflow** acts as the **front desk receptionist** (collecting user information politely).
* **The Webhook** acts as the **office database administrator** (taking that information, saving it to PostgreSQL/SQLite, running duplication checks, and returning a real tracking ID).

### Webhook Responsibilities:

```
Citizen Message ──► Dialogflow CX ──► Webhook (FastAPI) ──► DB & Core logic ──► Response
```

1. **Transaction Integrity (Database Writes)**:
   When Dialogflow confirms the user wants to submit their complaint, it triggers the webhook. The webhook invokes our `SuggestionService.create_suggestion()` pipeline to register the grievance and assign local ward officers.
2. **Dynamic Live Lookups**:
   When a user asks for status updates (*"What is the status of complaint ABC123?"*), the webhook queries the active database and returns the live status details to Dialogflow.
3. **Advanced AI Ingestion**:
   The webhook passes incoming text through our core classification, translation, and text-embedding duplicate checking pipeline so WhatsApp complaints are treated with the exact same intelligence as web submissions.
4. **Calculated Responses**:
   The webhook compiles clean, formatted, multilingual confirmation text (e.g. including the calculated priority score and auto-generated tracking ID) to send back into the chat interface.

---

## 🗺️ 5. Backend Implementation Plan (Integration Roadmap)

To bring these channels to life in a production environment, we have mapped out a three-part integration plan on the backend server:

### Part 1: WhatsApp Business API Production Bridge
* **Integration**: Connect the WhatsApp Business profile to **Google Dialogflow CX** via the built-in Dialogflow telephony/messenger gateway.
* **Webhook Mapping**: Configure the Dialogflow CX console fulfillment settings to forward customer inputs directly to our FastAPI endpoint:
  `https://api.civicpulse.gov/api/v1/dialogflow/webhook`

### Part 2: SMS Gateway Callback Endpoint (`POST /api/v1/sms/intake`)
* **Integration**: Register an intake API endpoint to receive standard HTTP callbacks from telecom gateways (e.g., Twilio SMS, Gupshup, or Plivo).
* **Execution Flow**:
  1. Receive request containing parameters: `From` (sender phone number) and `Body` (text description).
  2. Parse custom formats like `REPORT Water Pipe broken near market`.
  3. Invoke `SuggestionService.create_suggestion(content=text, citizen_phone=phone, language_code="en")`.
  4. Return a lightweight XML/JSON response instructing the gateway to reply with the tracking ID via SMS text.

### Part 3: Offline Mobile Sync Endpoint (`POST /api/v1/suggestions/sync`)
* **Integration**: Create a dedicated batch intake API to allow the Flutter/Android app to upload queued offline reports when connectivity returns.
* **Execution Flow**:
  1. Accept a JSON array of offline suggestion payloads containing: local device UUID, lat/long, description content, and base64-encoded audio/image file attachments.
  2. Check for **Idempotency**: If the device UUID already exists in the database, skip (prevents duplicate tickets on connection retries).
  3. Ingest each report through the `SuggestionService` pipeline.
  4. Return a mapping of `{ local_device_uuid: live_tracking_id }` so the mobile app can sync status and confirm resolution details back to the user.

