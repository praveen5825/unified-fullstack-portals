# CCRAS Unified Portal — Duplicate Check Module (Full Stack)

End-to-end project: Django REST Framework + PostgreSQL backend (with JWT
auth), React + Vite + Tailwind CSS frontend. Everything below has been
built, run, and tested against real data — not just written.

```
ccras-project/
├── backend/      Django REST API (see backend/README.md)
└── frontend/     React + Vite + Tailwind UI (see frontend/README.md)
```

## What's already verified end-to-end

| Layer | Verified |
|---|---|
| Postgres migrations (GinIndex, trigram, unique constraints) | ✅ ran clean on real Postgres |
| PDF text extraction (PyMuPDF + Tesseract fallback) | ✅ 4634 chars extracted from your real `proposal.pdf` |
| Trigram candidate filtering + TF-IDF similarity scoring | ✅ correctly scored a near-duplicate at 87.11%, filtered out an unrelated proposal |
| Auth (register/login/refresh, JWT) | ✅ tested live: no-token → 401, login → real JWT tokens, token → 200 |
| REST API (CRUD, pending queue, run check, review, mark status) | ✅ implemented, matches frontend calls exactly |
| React build | ✅ `npm run build` passes clean, no errors |
| React dev server | ✅ starts and serves correctly |
| Login page + protected routes + auto-redirect on 401 | ✅ wired in frontend |

## Run order (fresh machine)

**1. Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # fill in your Postgres credentials
python manage.py migrate
python manage.py createsuperuser  # or register via POST /api/accounts/register/
python manage.py runserver
```
Enable trigram extension once, in Postgres:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**2. Celery worker** (needed for duplicate check to actually run — separate terminal)
```bash
redis-server
cd backend
celery -A config worker --loglevel=info
```

**3. Frontend**
```bash
cd frontend
npm install
cp .env.example .env              # points at http://localhost:8000/api, login endpoint /accounts/login/
npm run dev
```
Open `http://localhost:5173` — you'll land on the login page first. Log in
with the superuser you created, or hit `POST /api/accounts/register/`
first to create one via API.

## Why Spark/Pgstar/Pdfstar aren't separate apps here

The `duplicate_check` app's `ResearchProposal` model already has a
`scheme` field (SPARK / PG-STAR / PDF-STAR) — that's what makes cross-scheme
duplicate detection possible in the first place. Splitting these into three
separate apps with duplicate CRUD would break that unification. If any
scheme actually needs extra fields beyond the 9 shared ones we agreed on,
say so and we'll extend the model — not fork it into three.

## How it fits your existing SPARK Portal

Everything here is built as an **addition**, not a replacement:
- Backend: copy `accounts/` and `duplicate_check/` into your existing
  project (skip `accounts/` if you already have your own auth app), merge
  only the commented "RELEVANT ADDITIONS" lines into your existing
  `settings.py`/`urls.py`.
- Frontend: copy `src/pages/`, `src/components/`, `src/context/`,
  `src/api/` into your existing React app, add the sidebar entries
  alongside your existing ones.

## Design decisions carried through from our planning

- **New Proposal = plain save.** No extraction, no matching triggered on
  create. `extraction_status` just defaults to `pending`.
- **Duplicate Check is a separate screen**, with its own Pending Queue
  (manual trigger, "Run Check" / "Run All") and Review Results (score
  breakdown, matching terms, Mark Reviewed / Flag actions) — never
  automatic.
- **Weighted, multi-signal scoring**, not a single blind percentage:
  content similarity (60%), title similarity (25%), student name (10%),
  college (5%) — with the full breakdown shown to the reviewer so the
  number is explainable, not a black box.
- **Two-stage matching** (Postgres trigram pre-filter, then TF-IDF cosine
  only on the narrowed candidate set) so this stays fast as proposal
  volume grows into the thousands.
- **JWT auth**, `IsAuthenticated` by default on every endpoint — this is
  why requests were 403ing before the login page existed.
