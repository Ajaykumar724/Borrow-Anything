# Borrow AnyThing

A responsive neighborhood borrowing marketplace prototype. The React/Vite frontend uses Tailwind CSS, Lucide icons, and Framer Motion; the Express REST API persists demo data through a replaceable JSON repository.

> **Demo limitations:** There is no sign-in/authentication, real payment processing or escrow, actual phone/identity verification, or legal service. Trust scores, verification badges, checkout estimates, and legal-review timestamps are simulations. Do not enter sensitive information.

## Requirements and local run

- Node.js 18.18+ (Node 20 LTS recommended) and npm

Start the API in one terminal:

```sh
npm --prefix backend install
npm --prefix backend run dev
```

Start the frontend in another:

```sh
npm --prefix frontend install
npm --prefix frontend run dev
```

Open the Vite URL (normally `http://localhost:5173`). The API is at `http://localhost:4000/api`; health check: `GET /api/health`.

The frontend reads `VITE_API_URL` (defaults to `http://localhost:4000/api`). The server reads `PORT`, `CORS_ORIGIN` (comma-separated origin allowlist), and `DATA_FILE` (optional JSON database path). Never point the demo database at important data.

## Demo walkthrough

- Select a demo profile; one test profile may show suspended status from the incident-report flow.
- Explore the seeded listings and filter instantly by search, category, neighborhood, maximum daily rate, and availability dates.
- Open a listing, choose dates, review the server-calculated daily-rate subtotal, refundable-deposit estimate, 10% platform fee, and estimated total.
- Send a rental request and switch between Borrowing and Lending to view the lifecycle, return countdown, hand-off guidance, owner actions, and demo earnings.
- Owners can approve/decline requests, mark items picked up/returned, and report a not-returned or stolen incident. Reports lock open bookings for the renter, suspend that demo profile, and create a timestamped review record. This is not a legal notice or legal advice.
- Demo phone/ID verification buttons only set local demo flags; they do not contact providers or collect documents.
- Use **List an item** to create a listing. Sample records are restored by replacing `backend/db/data.json` from a clean source copy.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Service health |
| GET | `/api/items?q=&category=&location=&maxPrice=&startDate=&endDate=` | Search, price, category, location, and availability filters |
| GET | `/api/items/:id` | Item details and owner |
| POST | `/api/items` | Create a validated listing |
| GET | `/api/users` | Demo profiles with simulated trust badges and score |
| GET | `/api/users/:id` | Demo profile and summary |
| PATCH | `/api/users/:id/verification-demo` | Simulate phone or ID verification; no sensitive data accepted |
| GET | `/api/rentals?userId=` | Participant rentals with item, users, and dispute |
| POST | `/api/rentals/quote` | Server-calculated, no-charge checkout estimate |
| POST | `/api/rentals` | Request booking with validated dates and checkout calculation |
| PATCH | `/api/rentals/:id/status` | Owner lifecycle transition |
| POST | `/api/rentals/:id/report` | File demo not-returned/stolen report and lock open bookings |
| GET | `/api/rentals/disputes/all` | Administrative review queue |

`backend/services/dbService.js` owns persistence access and exposes `getAll`, `getById`, `create`, `update`, and `delete`. Routes do not read or write the JSON file directly. API errors include a request correlation ID; request and booking/report events are logged as structured JSON.

## Validate

```sh
npm --prefix backend test
npm --prefix frontend run build
```
