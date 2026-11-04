# Integration hand-off — Borrow AnyThing

The existing frontend is already wired to the Express API. Verify the changed API seam and keep mock data out of the app.

## Services and commands

- Backend: `backend/`; `npm --prefix backend run dev` (port 4000); tests: `npm --prefix backend test`; health: `GET /api/health`.
- Frontend: `frontend/`; `npm --prefix frontend run dev` (port 5173); build: `npm --prefix frontend run build`.
- Frontend API seam: `frontend/src/api/client.js`; configurable with `VITE_API_URL`, default `http://localhost:4000/api`.
- JSON repository: `backend/services/dbService.js`; data: `backend/db/data.json`; configuration: `DATA_FILE`.

## API inventory

- `GET /api/health`
- Items: `GET /api/items` (q/category/location/maxPrice/startDate/endDate), `GET /api/items/:id`, `POST /api/items`
- Users: `GET /api/users`, `GET /api/users/:id`, `PATCH /api/users/:id/verification-demo`
- Rentals: `GET /api/rentals` (optional userId), `POST /api/rentals/quote`, `POST /api/rentals`, `PATCH /api/rentals/:id/status`, `POST /api/rentals/:id/report`, `GET /api/rentals/disputes/all`

## Data, migrations, and demo boundaries

- Database: JSON prototype only; no SQL database or schema migration tool. Do not add seed data through any future migration.
- API environment: `DATA_FILE`, `PORT`, `CORS_ORIGIN`; frontend environment: `VITE_API_URL`.
- Shared types: none (JavaScript client and API contracts).
- Essential services: Express API, Vite/React frontend, local JSON file store.
- Enhancement services: none.
- Mock files to remove: none; `frontend/src/api/client.js` calls the live API.
- Checkout, verification badges/trust score, and legal-review records are demo-only; no money moves and no real identity or legal provider is integrated.
