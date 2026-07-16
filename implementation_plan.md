# Implementation Plan: Offline & Mobile Sync Pipeline

This plan outlines the implementation of backend sync endpoints and a client-side simulated offline mode for the citizen Portal. This allows you to demonstrate the local-first queuing and background sync capabilities live during your pitch.

---

## 📢 Proposed Approach

### 1. Backend Intake & Sync APIs
We will expose two new endpoints to support off-platform channels:
*   `POST /api/v1/suggestions/sync` (Mobile Batch Sync): Accepts a list of suggestions from the offline queue, runs them through the full translation/vision/routing pipeline, and registers them. It uses idempotency tokens (local UUIDs) to prevent double-submitting on connection drops.
*   `POST /api/v1/sms/intake` (SMS Gateway Parser): A public webhook endpoint that parses plain text SMS formatted reports (e.g., `REPORT Category Description`), autodetects user location, and submits them.

### 2. Frontend "Simulate Offline Mode" (For Pitch Presentation)
We will add a prominent **"Simulate Offline Mode"** toggle in the citizen Portal header:
*   **When Offline**:
    *   Form submissions are intercepted.
    *   The complaint (text, phone, coordinates, and attachments) is saved into a local queue inside the browser (`localStorage`).
    *   A warning badge displays: `⚠️ Connection Lost: Queued [N] reports`.
*   **When Online**:
    *   The queue is automatically read.
    *   The client pushes all queued complaints to the backend `/sync` API in a single batch.
    *   A success toast notification appears: `✅ Successfully synced [N] offline reports!`.

---

## Proposed Changes

### Backend Component

#### [MODIFY] [suggestions.py](file:///Volumes/DiskD/HACKATHONS/Civic-Pulse/backend/app/api/v1/suggestions.py)
Expose the `/sync` and `/sms/intake` endpoints:
*   `POST /suggestions/sync`: Accepts `List[SuggestionSyncIn]` containing description, coordinates, phone, and optional file attachments.
*   `POST /suggestions/sms/intake`: Webhook callback for Twilio/telecom gateways.

#### [MODIFY] [suggestion_service.py](file:///Volumes/DiskD/HACKATHONS/Civic-Pulse/backend/app/services/suggestion_service.py)
*   Add `sync_suggestions(payloads)` handling batch ingestion and database inserts.

---

### Frontend Component

#### [MODIFY] [Portal.tsx](file:///Volumes/DiskD/HACKATHONS/Civic-Pulse/frontend/src/pages/Portal.tsx)
*   Add a local state check `isOffline` linked to a top bar toggle.
*   Intercept `handleSubmit`: if `isOffline` is true, write the suggestion payload to `localStorage` and show a local offline queue preview card.
*   Add a `useEffect` watcher: when `isOffline` changes from `true` to `false`, run the bulk sync task to flush the local queue to the backend.

---

## Verification Plan

### Automated Tests
```bash
# Run pytest on the new router logic
pytest backend/tests/test_sync_api.py
```

### Manual Verification
1. Open the Portal at `http://localhost:5173`.
2. Turn on the **"Simulate Offline Mode"** toggle.
3. Submit a complaint about water drainage. Confirm it shows *"Stored in Offline Queue"* with a warning card.
4. Turn off the **"Simulate Offline Mode"** toggle.
5. Verify that a success alert is shown and the complaint appears instantly on the MP dashboard map.
