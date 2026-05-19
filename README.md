# ⚙️ CodeMorph DB-AI

> **AI-powered database migration tool** — Upload your Django project ZIP, get Oracle 23ai-ready DDL, index recommendations, compatibility scoring, and AI advisory in seconds.

<p>
  <img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/Oracle-F80000?style=for-the-badge&logo=oracle&logoColor=white"/>
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white"/>
</p>

---

## 📌 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Frontend Pages](#frontend-pages)
- [Future Roadmap](#future-roadmap)

---

## Overview

CodeMorph DB-AI takes a Django project ZIP file and runs it through a fully automated migration pipeline:

1. **Parses** `models.py` using Python's AST module — no regex, no guessing
2. **Builds** a structured Schema IR (Intermediate Representation) capturing every model, field, FK, and constraint
3. **Generates** production-grade Oracle 23ai DDL including CREATE TABLE, ALTER TABLE FK constraints, and junction tables for ManyToMany relationships
4. **Recommends** indexes based on Oracle's auto-indexing rules (FK columns, unique fields, lookup-pattern columns)
5. **Scores** schema compatibility (0–100) based on type mapping warnings and relationship integrity
6. **Advises** via an AI oracle using Llama3/Ollama with Oracle Select AI framing
7. **Exports** a ZIP bundle containing `oracle_ddl.sql`, `index_recommendations.sql`, and `migration_notes.md`

---

## Key Features

**🔍 AST-Based Model Parser**  
Parses Django `models.py` using Python's `ast` module — handles `CharField`, `ForeignKey`, `ManyToManyField`, `JSONField`, `UUIDField`, and 20+ other Django field types with full keyword argument extraction (`null`, `blank`, `max_length`, `default`, `unique`, `on_delete`).

**🗄️ Oracle 23ai DDL Generation**  
Generates Oracle 23ai-compatible DDL with:
- `GENERATED ALWAYS AS IDENTITY` for auto fields
- `VARCHAR2(N CHAR)` for string fields
- `TIMESTAMP` for DateTimeField, `CLOB` for TextField
- Junction tables for ManyToManyField relationships
- Separate `ALTER TABLE ADD CONSTRAINT` for all FK references

**📊 Smart Index Advisor**  
Mirrors Oracle Autonomous Database auto-indexing logic:
- Every FK column gets an index (Oracle doesn't auto-index FKs like MySQL InnoDB)
- Unique fields get `UNIQUE` indexes
- Columns ending in `_email`, `_slug`, `_token`, `_key`, `_ref`, `_code`, `_username` are flagged as likely lookup columns

**🎯 Compatibility Scorer**  
Computes a 0–100 score based on lossy type mapping warnings (e.g. `BooleanField → NUMBER(1)`, `UUIDField → VARCHAR2(36)`), missing FK relationships, and Oracle 23ai bonus features (JSON, UUID support).

**🤖 AI Oracle Advisory**  
Sends schema summary to Llama3 via Ollama using Oracle Select AI framing — returns migration readiness assessment, Vector Search indexing suggestions, and query optimization tips.

**📦 One-Click Export**  
Downloads a ZIP containing:
- `oracle_ddl.sql` — ready to run in SQL*Plus or Oracle APEX
- `index_recommendations.sql` — all recommended `CREATE INDEX` statements
- `migration_notes.md` — table count, relationship count, compatibility score, and all warnings

**🔐 JWT Authentication**  
Register/login with JWT tokens and optional Google OAuth. All migration endpoints are protected.

**📈 Migration History & Metrics**  
Tracks every migration run — parser version, generator version, validator version, routes found, conversion accuracy, and execution time.

---

## How It Works

```
User uploads Django project ZIP
           │
           ▼
┌─────────────────────────────┐
│   Uploader (save + UUID)    │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│   Parser (AST)              │
│   models.py → Schema IR     │
│   - ModelIR / TableSchema   │
│   - FieldIR / ColumnSchema  │
│   - ForeignKeySchema        │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│   Oracle SQL Layer          │
│   - DDL Generator           │  → oracle_ddl.sql
│   - Index Advisor           │  → index_recommendations.sql
│   - Compatibility Scorer    │  → score / 100
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│   Oracle AI Advisor         │
│   Llama3 via Ollama         │  → migration advisory text
│   Oracle Select AI framing  │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│   Export Bundle             │
│   oracle_ddl.sql            │
│   index_recommendations.sql │
│   migration_notes.md        │
└─────────────────────────────┘
```

---

## Architecture

```
codemorph-db-ai/
│
├── backend/                         Django REST API
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   └── urls.py                  API route registry
│   │
│   └── apps/
│       ├── auth_app/                JWT + Google OAuth
│       ├── uploader/                ZIP upload, pipeline trigger, history
│       ├── parser/
│       │   └── services/
│       │       ├── model_parser.py       Django field → FieldIR (AST)
│       │       ├── relationship_extractor.py  Full SchemaIR builder
│       │       ├── url_parser.py
│       │       └── settings_parser.py
│       ├── ir/
│       │   └── schema.py            SchemaIR, TableSchema, ColumnSchema,
│       │                            ForeignKeySchema, IndexSchema data classes
│       ├── oracle_sql/
│       │   ├── ddl_gen.py           Oracle 23ai DDL generator
│       │   ├── index_advisor.py     FK / unique / lookup index rules
│       │   └── compat_scorer.py     0–100 compatibility score
│       ├── oracle_ai/
│       │   └── advisor.py           Llama3 Oracle Select AI advisory
│       ├── converter/
│       │   └── services/
│       │       └── claude_service.py  Ollama code conversion
│       ├── generator/               Output generation
│       └── validator/               Migration experiment tracking
│
└── frontend/                        React + Vite SPA
    └── src/
        └── pages/
            ├── Landing.jsx
            ├── Login.jsx
            ├── Upload.jsx           Upload ZIP + trigger pipeline
            ├── Pipeline.jsx         Live pipeline status
            ├── SchemaInsights.jsx   D3 relationship visualizer
            ├── SQLPreview.jsx       DDL preview + export
            ├── Metrics.jsx          Compatibility score + index recommendations
            ├── Dashboard.jsx
            └── History.jsx          Past migration runs
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | Django 4.2 + Django REST Framework |
| Authentication | JWT (djangorestframework-simplejwt) + Google OAuth |
| Database | MySQL |
| AST Parsing | Python `ast` module (stdlib) |
| DDL Generation | Custom Oracle 23ai DDL engine |
| AI Advisory | Ollama (Llama3) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Code Conversion | Ollama (Llama3) (`claude_service.py`) |
| Deployment | Gunicorn + Vercel (frontend) |

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register/` | Register new user |
| POST | `/api/v1/auth/login/` | Login, receive JWT tokens |
| GET | `/api/v1/auth/me/` | Get current user info |
| POST | `/api/v1/auth/logout/` | Logout |
| POST | `/api/v1/auth/token/refresh/` | Refresh JWT |

### Upload & Pipeline

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/uploader/upload/` | Upload Django project ZIP → returns `repo_id` |
| POST | `/api/v1/uploader/parse/<repo_id>/` | Run full migration pipeline |
| GET | `/api/v1/uploader/history/` | All past migration runs |
| DELETE | `/api/v1/uploader/delete/<repo_id>/` | Delete a migration |
| GET | `/api/v1/uploader/download/<repo_id>/` | Download generated output ZIP |

### Oracle SQL

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/oracle/analyze/<repo_id>/` | Full SchemaIR as JSON + D3 relationship graph data |
| GET | `/api/v1/oracle/ddl/<repo_id>/` | Generated Oracle DDL as text |
| GET | `/api/v1/oracle/export/<repo_id>/` | Download migration bundle ZIP |

### Oracle AI

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/oracle-ai/review/<repo_id>/` | Llama3 Oracle Select AI migration advisory |

### Converter

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/converter/convert/` | Convert code snippet between languages via Ollama |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL
- Ollama with `llama3` model pulled

### 1. Clone the repository

```bash
git clone https://github.com/tanu268/codemorph-db-ai.git
cd codemorph-db-ai
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in `backend/`:

```env
DJANGO_SECRET_KEY=your-secret-key-here
DB_NAME=codemorph
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=127.0.0.1
DB_PORT=3306
```

### 4. Run migrations and start the server

```bash
python manage.py migrate
python manage.py runserver
```

Backend runs at `http://localhost:8000`

### 5. Pull the Ollama model

```bash
ollama pull llama3
```

### 6. Set up the frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Environment Variables

| Variable | Description |
|---|---|
| `DJANGO_SECRET_KEY` | Django secret key |
| `DB_NAME` | MySQL database name |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_HOST` | MySQL host (default: `127.0.0.1`) |
| `DB_PORT` | MySQL port (default: `3306`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) |

---

## Frontend Pages

| Page | Route | Description |
|---|---|---|
| Landing | `/` | Product overview and getting started |
| Login | `/login` | JWT login + Google OAuth |
| Upload | `/upload` | Upload Django ZIP, trigger pipeline |
| Pipeline | `/pipeline` | Live pipeline status view |
| Schema Insights | `/schema` | D3 relationship visualizer, table/column explorer |
| SQL Preview | `/sql` | DDL preview with syntax highlighting + export |
| Metrics | `/metrics` | Compatibility score, index recommendations |
| Dashboard | `/dashboard` | Overview of all migrations |
| History | `/history` | Past migration runs with experiment tracking |

---

## Oracle Type Mapping

CodeMorph maps Django field types to Oracle 23ai-native types:

| Django Field | Oracle 23ai Type |
|---|---|
| `CharField(max_length=N)` | `VARCHAR2(N CHAR)` |
| `TextField` | `CLOB` |
| `IntegerField` | `NUMBER(10)` |
| `BigAutoField` | `NUMBER(19) GENERATED ALWAYS AS IDENTITY` |
| `DateTimeField` | `TIMESTAMP` |
| `BooleanField` | `NUMBER(1) CHECK(IN(0,1))` |
| `JSONField` | `JSON` |
| `UUIDField` | `VARCHAR2(36 CHAR)` |
| `ForeignKey` | `NUMBER(19)` + `ALTER TABLE FK CONSTRAINT` |
| `ManyToManyField` | Junction table with two FK columns |
| `DecimalField` | `NUMBER(19,4)` |
| `FloatField` | `BINARY_DOUBLE` |

---

## Future Roadmap

- [ ] Support for SQLAlchemy and Sequelize model parsing (beyond Django)
- [ ] Oracle Vector Search index recommendations for embedding columns
- [ ] Live diff view — compare original schema vs generated Oracle schema
- [ ] Multi-file repo parsing (models split across multiple files)
- [ ] Streaming AI advisory output
- [ ] GitHub integration — point to a repo URL instead of uploading a ZIP
- [ ] Support for PostgreSQL and SQLite as additional migration targets

---

## Author

Built by **Tanu Namdeo**  
📫 tnamdeo09@gmail.com  
🔗 [LinkedIn](https://www.linkedin.com/in/tanu-namdeo-b8286a2a1/) · [GitHub](https://github.com/tanu268)
