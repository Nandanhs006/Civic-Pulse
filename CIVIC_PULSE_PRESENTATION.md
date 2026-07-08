# Civic Pulse: AI-Powered Citizen Grievance & PMO Governance Platform
*Google Cloud Run, Cloud SQL, BigQuery Federated Connections, and Gemini AI*

---

## 🚀 1. The Hackathon Pitch: What is Civic Pulse?
**Civic Pulse** bridges the communication gap between Indian citizens and their elected representatives (MPs, MLAs, and municipal Ward Officers). 

By ingestion of multi-channel voice reports, text complaints, and images, Civic Pulse parses, routes, and scores citizen feedback using **Gemini AI**, while offering a real-time oversight dashboard for the **Prime Minister's Office (PMO)** to monitor representative performance and resolution turnaround times (TAT).

---

## 🛑 2. Core Problem Statements
1. **Disconnected Channels**: Citizens file reports via WhatsApp, hotlines, emails, or municipal apps, resulting in fragmented data.
2. **Delayed Synced Analytics**: Standard OLAP databases sync data once every 12–24 hours, meaning PMO oversight is always reacting to yesterday's metrics.
3. **Accountability Gaps**: There is no live performance index to hold Member of Parliament (MP) or Member of Legislative Assembly (MLA) representatives accountable for unresolved grievances in their constituencies.

---

## 🛠️ 3. The Architecture Stack (Live Sync OLAP)
Civic Pulse decouples transactional workloads (OLTP) from analytics queries (OLAP) using a real-time CQRS-lite pattern:

```
  [ Citizen Reports ]  ➔  [ Nginx Load Balancer ]
                                  │
                    ┌─────────────┴─────────────┐
         [ FastAPI Node 1 ]            [ FastAPI Node 2 ]
                    │                           │
         [ PostgreSQL (OLTP) ] ◄─────── [ BigQuery (OLAP) ]
                    ▲                     (EXTERNAL_QUERY)
                    │
         [ Gemini 1.5 Flash AI ]
```

1. **OLTP Schema (Cloud SQL PostgreSQL)**: Normalized database tables (`users`, `constituencies`, `mps`, `mlas`, `suggestions`, `ward_officers`, `wards`) handling real-time CRUD writes.
2. **OLAP Queries (Google BigQuery)**: Executes live analytical queries using **BigQuery Federated Queries (`EXTERNAL_QUERY`)** directly to Cloud SQL in-place, eliminating slow ETL sync pipelines.
3. **Atomic GCS Storage**: Media attachments are named after pre-generated suggestion UUIDs (`[id]_audio.wav`) and automatically rolled back from disk/GCS if transactional DB commits fail.

---

## 🧠 4. AI-Powered Ingestion Pipeline (Gemini 1.5 Flash)
* **Grievance Audio Transcribing**: Translates local Indian dialects into structured English text.
* **Category Auto-Routing**: Classifies grievances into administration units (e.g. *Water*, *Roads*, *Sanitation*).
* **Priority Indexing**: Assigns a weight score (`1-100`) based on critical sentiment indicators (e.g. pipeline leak vs. minor pothole).
* **Ward Officer Dispatch**: Geolocates report pins and routes task details straight to local Ward Representatives.

---

## 📈 5. PMO Governance Command Center Features
* **Representative Directory**: Searchable directory of all active MPs, featuring paginated grids and list views sorted by total caseload.
* **OLAP Analytics Dashboard**: Displays live connection status, category ratios, sentiment aggregates, and Ward Officer workload saturation.
* **Constituency Performance Index & Leaderboard**:
    * Podical Rank cards displaying top performing representatives.
    * Comparative ratings comparing Lok Sabha MPs and Vidhan Sabha MLAs.
    * Sortable tables based on **Resolution Rates (%)**, **Average Turnaround Time (days)**, and overall **Governance Score**.
    * Paginated and state-filtered table listings.
