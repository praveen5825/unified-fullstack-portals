# CCRAS Duplicate Check Backend — Setup

Yeh module tumhare **existing** CCRAS/SPARK Django project mein isolated app
(`duplicate_check`) ke roop mein merge hone ke liye bana hai. Agar tumhare
paas already `accounts`, `spark`, `pgstar`, `pdfstar` apps hain, sirf yeh
karo:

1. `duplicate_check/` folder ko apne existing project root mein copy karo.
2. `config/settings.py` aur `config/urls.py` mein diye gaye **RELEVANT
   ADDITIONS** comments dekh ke sirf wahi lines apne existing files mein
   merge karo — poori file overwrite mat karna.
3. `config/celery.py` naya add karo (agar Celery already nahi hai).

Fresh testing ke liye (jaisa maine yaha kiya), yeh poora project standalone
bhi chalta hai.

## Local Setup

```bash
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

PostgreSQL mein trigram extension enable karo (ek baar, per database):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

`.env.example` ko `.env` mein copy karke apne DB credentials daalo, phir:

```bash
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Celery worker (duplicate check background processing ke liye)

Redis chalao (agar already nahi hai):
```bash
redis-server
```

Alag terminal mein worker start karo:
```bash
celery -A config worker --loglevel=info
```

## Tesseract OCR (Windows)

Agar Windows dev machine pe Tesseract PATH mein registered nahi hai,
`config/settings.py` ke bottom mein commented lines uncomment karke apna
install path daalo.

## Verified

Is scaffold ko maine already test kar liya hai (real Postgres + real PDF
extraction + real similarity scoring + real HTTP auth flow ke saath):
- Migrations clean apply hoti hain (GinIndex, trigram, unique constraints)
- `proposal.pdf` se PyMuPDF ne 4634 chars clean extract kiye
- Near-duplicate proposal ko 87.11% overall match mila (content=100%,
  title=58.89%, student=73.91%), match_type='both', common terms correctly
  nikle
- Auth flow live server pe test kiya:
  - Bina token ke protected endpoint call -> 401
  - `/api/accounts/login/` -> valid JWT access + refresh tokens
  - Token ke saath protected endpoint -> 200
  - `/api/accounts/me/` -> correct user data

Test superuser (local dev DB mein, apna DB fresh banaoge to khud
`createsuperuser` chalana): username `admin`, password `admin12345`.

## API Endpoints

### Accounts (auth)
```
POST   /api/accounts/register/          create user (body: username, email, password)
POST   /api/accounts/login/             login (body: username, password) -> {access, refresh}
POST   /api/accounts/login/refresh/     refresh token (body: {refresh}) -> {access}
GET    /api/accounts/me/                current logged-in user
```

### Duplicate Check

```
GET    /api/duplicate-check/proposals/                 list (filterable: ?scheme=&status=&state=&year=&research_area=)
POST   /api/duplicate-check/proposals/                 create (plain save, no side-effects)
GET    /api/duplicate-check/proposals/{id}/
PATCH  /api/duplicate-check/proposals/{id}/
DELETE /api/duplicate-check/proposals/{id}/

GET    /api/duplicate-check/pending/                    pending queue
POST   /api/duplicate-check/{id}/run/                   trigger check for one proposal
POST   /api/duplicate-check/bulk-run/                   trigger check for many (body: {"proposal_ids": [...]})

GET    /api/duplicate-check/review/                     all reviewed-ready proposals + their matches
GET    /api/duplicate-check/review/{id}/                one proposal's full match detail
PATCH  /api/duplicate-check/review/{id}/status/         mark cleared/flagged (body: {"review_status": "cleared"})
```

## Build order followed (safe, non-breaking)

1. `duplicate_check` app + models + migrate + admin — verified independently
2. Extraction service — tested standalone on real `proposal.pdf`
3. Matching service — tested standalone with synthetic near-duplicate data
4. Celery task — logic verified (worker wiring is the only remaining
   manual step on your machine, since Redis/Celery worker processes can't
   run inside this sandbox)
5. API endpoints wired
6. Ready for frontend integration
