# TransitOps — Fleet Management & Logistics Operating System

TransitOps is an enterprise-grade SaaS platform designed for logistics providers, fleet operators, and dispatchers. It provides real-time vehicle tracking, driver management, trip state machines, automated operational exception detection, multi-tenant billing, and AI-assisted fleet management.

---

## Architecture & Tech Stack

- **Frontend**: React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 3.4 + Zustand 5 + Recharts 3
- **Backend**: Python 3.12 + Flask 3.1 + Flask-SQLAlchemy 3.1 + Flask-JWT-Extended 4.7 + Gunicorn
- **Database & Queue**: PostgreSQL 16 (Relational DB) + Redis (Cache & Task Queue)
- **AI Engine**: Multi-Agent Tool Execution Architecture + Groq API (`llama-3.3-70b-versatile`)
- **Security & Multi-Tenancy**: Tenant-isolated `company_id` data models + Role-Based Access Control (RBAC) + Environment Security Validation

---

## Repository Structure

```text
transitops/
├── client/                     # React 19 + Vite 8 TypeScript frontend application
│   ├── src/
│   │   ├── api/                # Axios API client & interceptors
│   │   ├── components/         # Dashboard, Vehicle, Driver, Trip & Exception UI components
│   │   ├── pages/              # Workspace pages (Dashboard, Vehicles, Drivers, Trips, Analytics, Settings)
│   │   ├── stores/             # Zustand state management stores
│   │   └── types/              # TypeScript interface & schema definitions
│   └── package.json
├── server/                     # Flask 3.1 Python backend API service
│   ├── app/
│   │   ├── commands/           # CLI & database seeding commands
│   │   ├── middleware/         # RBAC, tenant isolation, rate limiting & security header middleware
│   │   ├── models/             # 20 SQLAlchemy data models (Company, Vehicle, Driver, Trip, Exception, etc.)
│   │   ├── routes/             # 16 API Blueprint routes
│   │   └── services/           # Business logic, AI prompt builder, exception engine, quota manager
│   ├── migrations/             # Alembic database schema migration versions
│   ├── tests/                  # Pytest automated test suite (171 tests)
│   ├── config.py               # Fail-fast security configuration profiles (Development, Testing, Production)
│   └── requirements.txt
├── scripts/                    # Maintenance & utility scripts
│   └── archive/                # Relocated historical utility & refactoring scripts
├── deployment/                 # Docker Compose & Kubernetes deployment configuration
├── docker-compose.yml          # Container orchestration manifest (Postgres, Redis, Backend, Frontend, Scheduler)
└── deploy.sh                   # VPS deployment script
```

---

## Getting Started (Local Development)

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 16 (or SQLite for local testing)
- Redis

### Backend Setup

1. Navigate to the `server/` directory:
   ```bash
   cd server
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables (copy template):
   ```bash
   cp .env.example .env
   ```
5. Run database migrations and start the Flask server:
   ```bash
   flask db upgrade
   flask run --port=5000
   ```

### Frontend Setup

1. Navigate to the `client/` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Access the frontend at `http://localhost:5173`.

---

## Testing & Quality Assurance

### Backend Automated Test Suite

```bash
cd server
source venv/bin/activate
pytest tests/ -v
```
*Current test suite: **171/171 tests passing** covering RBAC, tenant isolation, vehicle health scoring, exception engines, and quota enforcement.*

### Frontend Typechecking & Production Build

```bash
cd client
npm run typecheck    # Runs tsc --noEmit
npm run build        # Runs vite build
```

---

## Production Deployment & Security Requirements

TransitOps provides Docker Compose (`docker-compose.yml`) and VPS automated deployment scripts (`deploy.sh`).

### Mandatory Production Environment Variables

When deploying to production (`FLASK_ENV=production`), the application enforces strict fail-fast validation and requires explicit configuration without default fallbacks:

- `FLASK_ENV=production`
- `SECRET_KEY` (Strong random cryptographic key)
- `JWT_SECRET_KEY` (Strong random JWT signing key)
- `DATABASE_URL` (Production PostgreSQL connection string)
- `POSTGRES_PASSWORD` (Production database password)
- `CORS_ORIGINS` (Comma-separated allowed origins, e.g. `https://app.transitops.com`)
- `GROQ_API_KEY` (API key for Groq AI features)

*Note: The production domain `app.transitops.com` currently hosts legacy AngularJS infrastructure and requires executing `deploy.sh` to launch the current React + Flask container stack.*

---

## License

Private & Proprietary. All rights reserved.
