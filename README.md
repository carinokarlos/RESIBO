# Resibo

A mobile-first personal budget tracker for Philippine users. The current foundation milestone contains the light dashboard shell and the first owner-scoped Flask API layer.

## What is here

- React and Vite client with responsive dashboard, transaction quick-entry UI, and mobile navigation.
- Flask JSON API with Argon2 password hashing, signed HttpOnly session cookies, CSRF protection, rate limits, and owner-scoped category and transaction queries.
- SQLAlchemy models for multi-user accounts, revocable sessions, categories, local-date transactions, stable budget cycles, and per-cycle budgets. Personal data is tied to an account through owner-scoped `user_id` foreign keys.
- SQLite for a quick local start; configure PostgreSQL through `DATABASE_URL` for PostgreSQL development and deployment.

New accounts, dashboard totals, transactions, budgets, categories, and saved payment methods use the configured database. SQLite is the default for local development. PostgreSQL can be configured through `DATABASE_URL` for deployment.

## Start the API with SQLite or PostgreSQL

Use Python 3.11 or newer. In PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
flask --app backend.app db init
flask --app backend.app db migrate -m "initial schema"
flask --app backend.app db upgrade
flask --app backend.app run
```

Set a strong `SECRET_KEY` in `.env` before using authentication. The default SQLite file is created in the Flask instance directory. For PostgreSQL, set `DATABASE_URL` to a `postgresql+psycopg://...` connection string before generating and applying migrations.

SQL dump and setup files are intentionally excluded from Git. Use the checked-in Flask-Migrate migrations to create or upgrade a database with `flask --app backend.app db upgrade`. Keep any local database setup scripts in your private working copy.

## Start the client

In a second PowerShell window:

```powershell
npm install
npm run dev
```

Vite proxies `/api` requests to `http://127.0.0.1:5000`.

The authenticated PATCH /api/payment-methods/<id> endpoint saves the current balance snapshot for debit cards or the credit limit and debt snapshot for credit cards.

## Development email verification

New accounts must verify their email before signing in. For local development, create an email sandbox (for example, Mailtrap Email Sandbox), copy its SMTP host, port, username, and password into the `MAIL_*` settings in `.env`, then restart the Flask API. Verification messages appear in the sandbox inbox; this configuration does not deliver mail to real users. Keep the sandbox credentials in `.env` and never commit them.

Apply the email verification table with `flask --app backend.app db upgrade`.

## API foundation

- `GET /api/health`, `GET /api/csrf`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/<id>`, `DELETE /api/categories/<id>`
- `GET /api/payment-card-designs`, `GET /api/payment-methods`, `POST /api/payment-methods`
- `GET`/`POST /api/income-schedules`, `PUT`/`DELETE /api/income-schedules/<id>`, `POST /api/income-schedules/process`
- `GET /api/transactions`, `POST /api/transactions`, `PATCH /api/transactions/<id>`, `DELETE /api/transactions/<id>`
- `GET /api/dashboard`, `GET /api/budgets`, `PUT /api/budgets`, `POST /api/budgets/copy-previous`

State-changing requests require the token returned by `/api/csrf` in the `X-CSRFToken` header. Authenticated requests use the `budget_session` cookie. `user_id` is never accepted from the browser as an ownership claim.

## Current release boundary

This is an in-progress local foundation, not a production release. Email verification and password reset delivery, account deletion, account settings, migrations review, PostgreSQL validation, operational backups, and full UI integration remain to be completed before launch. Configure a shared rate-limit store for multi-process deployment; the default in-memory limiter is only for local development.
