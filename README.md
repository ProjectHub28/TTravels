# TTravels — Environment, API & Database Reference

This README explains what to put into the project's `.env` file (do NOT commit secrets), the HTTP API surface your front-end and assistant use, and the Appwrite collection schemas used by the application. Use this file when sharing the project so other developers know which keys and collection fields to configure.

---

## Overview

- Project: TTravels — a voice-enabled travel assistant and booking platform.
- Backend: Python (Flask). Appwrite is used as the document database.
- AI / NLP: Gemini (LLM) + optional spaCy for entity parsing. SerpApi / Google Maps used for search results. ElevenLabs for TTS.

This README intentionally does not contain any secret values — if you share the repo, replace secrets with placeholders in `.env`.

---

## `.env` — Variables you must set

Create a file called `.env` at the project root (copy from `env_template.txt` if present). Add the following variables (do NOT commit this file):

- `APPWRITE_ENDPOINT` — Appwrite endpoint URL (e.g. `https://[region].cloud.appwrite.io/v1`).
- `APPWRITE_PROJECT_ID` — Appwrite project id.
- `APPWRITE_API_KEY` — Appwrite API key (server key).
- `APPWRITE_DATABASE_ID` — Appwrite Database id to store collections.
- `APPWRITE_COLLECTION_ID` — Default collection id (users or whichever you choose).
- `SAVED_TRIP_PLANS_COLLECTION_ID` — (optional) Collection id for saved trip plans (defaults to `saved_trip_plans`).
- `SERPAPI_KEY` — SerpApi key for flights/hotels/maps searches.
- `GOOGLE_MAPS_API_KEY` — Google Maps API key (if using Google Maps SDK).
- `GEMINI_API_KEY` — Gemini (LLM) API key (or other LLM key you use).
- `ELEVENLABS_API_KEY` / `ELEVENLABS_API_KEY2` — ElevenLabs TTS keys (optional / fallback).
- `ADMIN_TEAM_ID` — Appwrite Team id for admins (optional).

Notes:
- Keep these keys secret. Do not paste them into public chat or commit to git.
- When deploying, store secrets in a secure secret manager or CI/CD environment variables.

---

## API Endpoints (structure & payloads)

The project exposes several REST endpoints. Below are the main ones and the expected request/response shapes.

1) Chat / Assistant
- `POST /api/chat-text`
  - Request JSON: `{ "message": "...", "conversation_id": "optional" }`
  - Response JSON: `{ "reply": "...", "reply_text": "...", "audio": "data:...base64,..." | null, "response_data": {...}, "trip_plan": {...} }`

- `POST /api/chat-voice` (multipart)
  - Form fields: `audio` file, `conversation_id` optional
  - Response JSON similar to `/api/chat-text` but includes `transcribed_text`.

2) Hotels & Maps
- `POST /api/hotel-search`
  - Request JSON: `{ "destination": "City, Country", "check_in": "YYYY-MM-DD", "check_out": "YYYY-MM-DD", "adults": 2 }
  - Response JSON: `{ "success": true, "hotels": [ ... ], "total_hotels": N }`

- `GET /api/hotel-details?property_token=...&check_in_date=...&check_out_date=...&adults=2`
  - Returns SerpApi full details for a single property.

3) Flights
- `POST /search` (legacy route used by front-end)
  - Request JSON: `{ "from": "CODE", "to": "CODE", "departure": "YYYY-MM-DD", "return": "YYYY-MM-DD" (optional) }`
  - Response JSON: flight results (enriched) with `best_flights`, `other_flights`.

4) Booking & Payments
- `POST /api/save-booking` (authenticated)
  - Request JSON: booking details (see usage in `main.py`). Example stored fields: `type`, `service_type`, `service_id`, `num_passengers`, `fare_total`, `contact_info`, `details`.
  - Response: `{ success: true, booking_id: '...' }` on success.

- `POST /api/save-payment` (authenticated)
  - Request JSON: `{ "booking_id": "...", "amount": 123.45, "method": "card|upi|wallet", "transaction_id": "..." }`

5) Saved Trip Plans
- `POST /api/save-trip-plan` (authenticated)
  - Request JSON: `{ "title": "...", "trip_plan": {...}, "metadata": {...} }`.
  - The backend currently stores `trip_plan` as a JSON string for robustness; front-end expects `trip_plan` when reading.

6) Utility endpoints
- `/api/text-to-speech`, `/api/speech-to-text`, `/api/translate`, `/api/notifications`, `/api/my-bookings`, `/api/my-saved-plans` — See usages in `main.py` for arguments and shape.

Security notes:
- All `save-*` and user-specific endpoints require authentication (session-based using Appwrite accounts or the project's auth wrapper).
- Do not expose Appwrite server keys to the browser.

---

## Appwrite Collection Schemas (recommended)

Below are concise collection definitions you can create in Appwrite. Use the field name, type, and whether it should be required.

### Collection: `users`
- `document_id` (Appwrite id, primary key)
- `fname` (string, required)
- `lname` (string, optional)
- `email` (string, required, unique)
- `mobile` (string, optional)
- `role` (string enum: `user|admin|staff`, required, default `user`)
- `avatar_url` (string, optional)
- `created_at` (datetime, required)

### Collection: `bookings`
- `document_id`
- `user_id` (string, reference → `users.$id`, required)
- `type` (string, e.g. `flight|hotel|train|bus|car|package`, required)
- `service_type` (string, optional)
- `service_id` (string, optional) — id of listing or provider
- `num_passengers` (integer, optional)
- `fare_total` (float, required)
- `currency` (string, required)
- `payment_status` (string enum: `pending|confirmed|failed|refunded`, required)
- `contact_info` (string or object, optional) — currently stored as JSON string
- `details` (string or object, optional) — stored as JSON string
- `created_at` (datetime, required)

Constraints: add index on `user_id`, `payment_status`, and `created_at` for queries.

### Collection: `payments`
- `document_id`
- `booking_id` (string, reference → `bookings.$id`, required)
- `user_id` (string, reference → `users.$id`, required)
- `provider_payment_id` (string, optional)
- `amount` (float, required)
- `currency` (string, required)
- `method` (string enum: `card|upi|wallet|netbanking|cod`, required)
- `status` (string enum: `initiated|paid|failed|refunded`, required)
- `paid_at` (datetime, optional)
- `created_at` (datetime, required)

### Collection: `saved_trip_plans` (or ID from `SAVED_TRIP_PLANS_COLLECTION_ID`)
- `document_id`
- `user_id` (string, reference → `users.$id`, required)
- `title` (string, optional)
- `trip_plan` (string or object, required) — current code stores as JSON string
- `metadata` (string or object, optional)
- `created_at` (datetime, required)

## Example document (seed) snippets

- `users` document example:
```
{
  "$id": "user_01",
  "fname": "Uday",
  "lname": "Dambali",
  "email": "uday@example.com",
  "role": "user",
  "created_at": "2025-11-21T08:30:00Z"
}
```

- `bookings` example (hotel):
```
{
  "$id": "booking_2001",
  "user_id": "user_01",
  "type": "hotel",
  "fare_total": 12500.0,
  "currency": "INR",
  "payment_status": "pending",
  "contact_info": "{...}",
  "details": "{...}",
  "created_at": "2025-11-21T09:00:00Z"
}
```

---

## How to run locally (quick)

1. Create a Python virtual environment and activate it.

```powershell
python -m venv .venv
& .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Create `.env` at repository root and fill in the variables described above (do not commit it).

3. Start the app:

```powershell
python main.py
```

4. Open the web UI (e.g., `http://localhost:5000`) and test endpoints with the chat widget.

---

## Notes & Best Practices

- Never commit `.env` or API keys to the repository. Use `env_template.txt` to show keys required without values.
- Appwrite: create the collections above and configure permissions carefully (owner-based reads/writes for user-specific documents).
- Consider storing `trip_plan` as a native JSON object in Appwrite rather than a string — update `db.py` and `main.py` when migrating.
- Use Appwrite functions (server-side) for sensitive operations like coupon validation and payment gateway calls.

If you want, I can generate an Appwrite collection creation script (JSON) or a Python seed script that uses `db.py` to populate example documents into your Appwrite instance.

---

File references: see `db.py`, `main.py`, `trip_planner.py`, and `static/js/ai-assistant.js` for concrete usages of the fields and endpoints described above.

---

Thanks — keep your keys safe when sharing this project.
