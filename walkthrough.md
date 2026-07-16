# Walkthrough: Mobile App Simulator & SMS Gateway Webhook

We have fully implemented the mobile offline sync and cellular SMS intake pipelines, and built a dedicated **App Simulator** screen in the frontend for live demo pitching.

---

## 🚀 Key Accomplishments

### 1. SMS Gateway Intake Webhook (`POST /suggestions/sms/intake`)
* **Purpose**: Simulates a live telecom gateway parsing text messages sent by citizen feature phones.
* **Logic**: Automatically detects if the SMS starts with a keyword protocol like `REPORT Roads Pothole on main lane`. Scopes the category, logs the citizen phone number, and submits it to the database. It responds with a clean confirmation containing the created ticket ID.

### 2. Mobile Batch Sync Endpoint (`POST /suggestions/sync`)
* **Purpose**: Allows offline mobile clients to bulk-upload their local database queue.
* **Logic**: Accepts a list of cached reports. Implements **Idempotency checks**: if the pre-generated client UUID is already present in the database, it rejects/skips duplicate insertion to prevent double-submitting.

### 3. Frontend App Simulator Screen (`/simulator`)
* **Design**: Centers a beautiful smartphone mock bezel on the screen to simulate the mobile client app user experience:
  - **Simulated Network Switch**: A top bar network toggle allowing you to switch between `📶 Online` and `⚠️ Offline`.
  - **Offline Local Queue**: When offline, suggestions are captured locally into `localStorage`. A warning card shows the list of queued items.
  - **Auto Recovery Sync**: When you click "Go Online" or toggle the network back on, the app runs a background sync, calling `/suggestions/sync` to upload all queued suggestions, clear the local storage, and display a success status message.
  - **SMS Intake Simulator Widget**: Placed next to the phone mock, allowing you to test typing custom SMS text and instantly seeing the webhook's return message bubble in real time!

---

## 📁 File Map

| File | Change |
|---|---|
| [`backend/app/schemas.py`](file:///Volumes/DiskD/HACKATHONS/Civic-Pulse/backend/app/schemas.py) | Added Pydantic schemas for sync input and output |
| [`backend/app/services/suggestion_service.py`](file:///Volumes/DiskD/HACKATHONS/Civic-Pulse/backend/app/services/suggestion_service.py) | Added custom ID parameters and batch `sync_suggestions` method |
| [`backend/app/api/v1/suggestions.py`](file:///Volumes/DiskD/HACKATHONS/Civic-Pulse/backend/app/api/v1/suggestions.py) | Exposed `/sync` and `/sms/intake` endpoints |
| [`frontend/src/pages/AppSimulator.tsx`](file:///Volumes/DiskD/HACKATHONS/Civic-Pulse/frontend/src/pages/AppSimulator.tsx) | Created the App Simulator and SMS Widget page |
| [`frontend/src/App.tsx`](file:///Volumes/DiskD/HACKATHONS/Civic-Pulse/frontend/src/App.tsx) | Configured route for `/simulator` |
| [`frontend/src/components/layouts/TopBar.tsx`](file:///Volumes/DiskD/HACKATHONS/Civic-Pulse/frontend/src/components/layouts/TopBar.tsx) | Added "Simulator" option to navigation |

---

## ⚡ How to Demo / Test

1. Open your browser and navigate to:
   💻 **[http://localhost:5173/simulator](http://localhost:5173/simulator)**
2. Test the **App Simulator**:
   - Select a constituency.
   - Switch the network toggle to **Offline**.
   - Type a complaint and hit **Save to Offline Queue**. Confirm it caches locally inside the dotted red list.
   - Switch back to **Online**. Watch it trigger a background sync, flush the storage, and report success.
3. Test the **SMS Intake Webhook**:
   - Click the **Basic SMS Gateway** tab in the right panel.
   - Type a custom number and body message (e.g., `REPORT Water leakage on road`).
   - Click **Send SMS**. See the gateway's automatic reply bubble with the live ID instantly.
4. Test the **WhatsApp Conversational Bot**:
   - Click the **WhatsApp Business** tab in the right panel.
   - You will see a beautiful green mock WhatsApp conversation window loaded with the official welcome menu.
   - Type `"report"` or `"complaint"` and send. Watch it prompt you for details.
   - Describe a civic problem (e.g. *"garbage pile in ward 4"*), hit send, and see it auto-classify the category.
   - Reply `"yes"` to register the grievance and receive your live tracking reference ID!


---

## 🛠️ Gateway 504 Timeout Resolution
*   **The Issue**: When the backend server is run under sandboxed network restrictions, API calls to the Google Gemini endpoint (`models/text-embedding-004` and `gemini-flash-latest`) were hanging indefinitely, exceeding the 30-second default router threshold and returning a `504 Gateway Timeout`.
*   **The Fix**: Configured a strict **5-second timeout** (`request_options={"timeout": 5.0}`) on all external Gemini Content and Embedding API calls inside [`ai_service.py`](file:///Volumes/DiskD/HACKATHONS/Civic-Pulse/backend/app/services/ai_service.py) and [`embedding_service.py`](file:///Volumes/DiskD/HACKATHONS/Civic-Pulse/backend/app/services/embedding_service.py). 
*   **Result**: If the external API key is blocked or experiencing network latency, the service now aborts within 5 seconds and seamlessly falls back to our robust local regex-based classification heuristics. Complaints are created successfully and immediately without locking up the server!

