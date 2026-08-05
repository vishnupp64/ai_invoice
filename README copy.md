# AI Invoice & Receipt Scanner

Full-stack web app to upload invoices/receipts (JPG/PNG/JPEG/PDF), extract structured data using Google Gemini, review/edit the extracted fields, and save the final invoice into PostgreSQL.

## Tech stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express (TypeScript)
- DB: PostgreSQL
- ORM: Prisma
- Auth: JWT
- Uploads: Multer
- AI: Google Gen AI SDK (`@google/genai`)

## Prerequisites

- Node.js 20+
- Docker (recommended for PostgreSQL) or a local Postgres instance

## 1) Setup environment variables

### Backend

Create `server/.env`:

```
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_invoice?schema=public
JWT_SECRET=replace-me-with-a-strong-secret
GEMINI_API_KEY=your-gemini-api-key
UPLOAD_DIR=uploads
MAX_UPLOAD_MB=12
```

### Frontend

Create `client/.env`:

```
VITE_API_BASE_URL=http://localhost:4000/api
```

## 2) Start PostgreSQL (Docker)

```bash
docker compose up -d
```

## 3) Install dependencies

From the repo root:

```bash
npm install
```

## 4) Prisma setup

```bash
npm run prisma:generate -w server
npm run prisma:migrate -w server
```

## 5) Run the app

In one terminal:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

## Production build

```bash
npm run build
```

## Notes

- Uploaded files are stored on the backend in `server/uploads/` (configurable via `UPLOAD_DIR`).
- The API never exposes the Gemini API key to the frontend.
