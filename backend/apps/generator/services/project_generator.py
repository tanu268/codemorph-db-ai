# apps/generator/services/project_generator.py

"""
Generates the project-level files that make the Express output actually runnable:
  - package.json
  - app.js  (entry point)
  - config/database.js  (Sequelize connection)
  - .env.example
"""

import json
from apps.ir.schema import RepositoryIR, ProjectConfigIR


# ─── npm package version pinning ─────────────────────────────────────────────
# These are the stable versions we recommend for all generated projects.
# Updated here in one place — all generated projects stay consistent.

NPM_PACKAGE_VERSIONS = {
    'express':          '^4.18.2',
    'sequelize':        '^6.35.0',
    'dotenv':           '^16.3.1',
    'helmet':           '^7.1.0',
    'cors':             '^2.8.5',
    'express-session':  '^1.17.3',
    'csurf':            '^1.11.0',
    'passport':         '^0.6.0',
    'jsonwebtoken':     '^9.0.2',
    'basic-auth':       '^2.0.1',
    'compression':      '^1.7.4',
    'i18next':          '^23.7.6',
    'passport-oauth2':  '^1.7.0',
    # DB drivers — chosen based on db_engine
    'mysql2':           '^3.6.5',
    'pg':               '^8.11.3',
    'pg-hstore':        '^2.3.4',
    'sqlite3':          '^5.1.6',
}

# DB engine → npm driver package
DB_DRIVER_MAP = {
    'mysql':    ['mysql2'],
    'postgres': ['pg', 'pg-hstore'],
    'sqlite':   ['sqlite3'],
    'oracle':   [],  # requires manual setup
}

# DB engine → Sequelize dialect string
SEQUELIZE_DIALECT_MAP = {
    'mysql':    'mysql',
    'postgres': 'postgres',
    'sqlite':   'sqlite',
    'oracle':   'oracle',
    'sqlite3':  'sqlite',
}


def _collect_npm_packages(repo_ir: RepositoryIR) -> dict:
    """
    Collects all npm packages needed by the generated project.

    Sources:
    1. Express + Sequelize + dotenv — always required
    2. Middleware npm_package values
    3. Auth npm_package values
    4. DB driver based on project_config.db_engine

    Returns dict: { package_name: version_string }
    """
    packages = {
        'express': NPM_PACKAGE_VERSIONS['express'],
        'sequelize': NPM_PACKAGE_VERSIONS['sequelize'],
        'dotenv': NPM_PACKAGE_VERSIONS['dotenv'],
    }

    # Add middleware packages
    for mw in repo_ir.middleware:
        if mw.npm_package and mw.is_supported:
            pkg = mw.npm_package
            if pkg in NPM_PACKAGE_VERSIONS:
                packages[pkg] = NPM_PACKAGE_VERSIONS[pkg]

    # Add auth packages
    for auth in repo_ir.auth:
        if auth.npm_package and auth.is_supported:
            pkg = auth.npm_package
            if pkg in NPM_PACKAGE_VERSIONS:
                packages[pkg] = NPM_PACKAGE_VERSIONS[pkg]

    # Add DB driver packages
    if repo_ir.project_config:
        engine = repo_ir.project_config.db_engine
        for driver in DB_DRIVER_MAP.get(engine, []):
            if driver in NPM_PACKAGE_VERSIONS:
                packages[driver] = NPM_PACKAGE_VERSIONS[driver]

    return packages


def generate_package_json(repo_ir: RepositoryIR) -> str:
    """
    Generates a complete package.json for the Express project.

    Includes:
    - Project name and version (from ProjectConfigIR)
    - All npm dependencies collected from the IR
    - Standard scripts: start, dev, test
    - Node engine requirement

    Why JSON not a template string?
    Using json.dumps() guarantees valid JSON syntax — no typos,
    no missing commas, no trailing comma bugs.
    """
    config = repo_ir.project_config or ProjectConfigIR()
    packages = _collect_npm_packages(repo_ir)

    # Store collected packages back on the IR for reference
    config.required_npm_packages = packages

    package_data = {
        "name": config.project_name.lower().replace(' ', '-').replace('_', '-'),
        "version": "1.0.0",
        "description": f"Auto-generated Express.js migration of {config.project_name} (CodeMorph)",
        "main": "app.js",
        "scripts": {
            "start": "node app.js",
            "dev": "nodemon app.js",
            "test": "echo \"Error: no test specified\" && exit 1"
        },
        "engines": {
            "node": ">=18.0.0"
        },
        "dependencies": packages,
        "devDependencies": {
            "nodemon": "^3.0.2"
        },
        "keywords": ["express", "codemorph", "auto-generated"],
        "license": "ISC"
    }

    return json.dumps(package_data, indent=2)


def generate_app_js(repo_ir: RepositoryIR) -> str:
    """
    Generates app.js — the Express application entry point.

    This file wires together:
    - dotenv config loading
    - Middleware setup (from generated middleware file)
    - Route mounting (from generated routes file)
    - Server start

    Why generate this separately from middleware.js?
    app.js is the composition root — it imports and connects everything.
    Keeping it separate means you can regenerate middleware.js without
    touching app.js, and vice versa.
    """
    config = repo_ir.project_config or ProjectConfigIR()

    lines = []
    lines.append("// Auto-generated by CodeMorph")
    lines.append(f"// Project: {config.project_name}")
    lines.append("// DO NOT EDIT — regenerate by re-running CodeMorph")
    lines.append("")
    lines.append("require('dotenv').config();")
    lines.append("")
    lines.append("const express = require('express');")
    lines.append("const app = express();")
    lines.append("")

    # ── Middleware imports ────────────────────────────────────────────────────
    lines.append("// ── Middleware ───────────────────────────────────────────")

    # Collect unique supported packages
    imported_packages = set()
    for mw in sorted(repo_ir.middleware, key=lambda m: m.order):
        if mw.npm_package and mw.is_supported and mw.npm_package not in imported_packages:
            var = _pkg_to_var(mw.npm_package)
            lines.append(f"const {var} = require('{mw.npm_package}');")
            imported_packages.add(mw.npm_package)

    lines.append("")

    # ── Built-in Express middleware ───────────────────────────────────────────
    lines.append("app.use(express.json());")
    lines.append("app.use(express.urlencoded({ extended: true }));")
    lines.append("")

    # ── Third-party middleware in order ──────────────────────────────────────
    for mw in sorted(repo_ir.middleware, key=lambda m: m.order):
        if mw.is_supported and mw.express_equivalent != 'express.urlencoded({ extended: true })':
            lines.append(f"// {mw.django_class}")
            lines.append(f"app.use({mw.express_equivalent});")
    lines.append("")

    # ── Route mounting ────────────────────────────────────────────────────────
    lines.append("// ── Routes ──────────────────────────────────────────────")
    lines.append("const routes = require('./routes');")
    lines.append("app.use('/api/v1', routes);")
    lines.append("")

    # ── Health check ─────────────────────────────────────────────────────────
    lines.append("// Health check endpoint")
    lines.append("app.get('/health', (req, res) => {")
    lines.append("  res.json({ status: 'ok', project: process.env.PROJECT_NAME });")
    lines.append("});")
    lines.append("")

    # ── 404 handler ──────────────────────────────────────────────────────────
    lines.append("// 404 handler")
    lines.append("app.use((req, res) => {")
    lines.append("  res.status(404).json({ error: 'Route not found' });")
    lines.append("});")
    lines.append("")

    # ── Global error handler ─────────────────────────────────────────────────
    lines.append("// Global error handler")
    lines.append("app.use((err, req, res, next) => {")
    lines.append("  console.error(err.stack);")
    lines.append("  res.status(500).json({ error: err.message });")
    lines.append("});")
    lines.append("")

    # ── Server start ─────────────────────────────────────────────────────────
    lines.append("const PORT = process.env.PORT || 3000;")
    lines.append("app.listen(PORT, () => {")
    lines.append(f"  console.log(`{config.project_name} running on port ${{PORT}}`);")
    lines.append("});")
    lines.append("")
    lines.append("module.exports = app;")

    return '\n'.join(lines)


def generate_database_js(repo_ir: RepositoryIR) -> str:
    """
    Generates config/database.js — the Sequelize connection setup.

    Reads DB credentials from environment variables (never hardcoded).
    Dialect is determined from the Django db_engine in ProjectConfigIR.
    """
    config = repo_ir.project_config or ProjectConfigIR()
    dialect = SEQUELIZE_DIALECT_MAP.get(config.db_engine, 'mysql')

    lines = []
    lines.append("// Auto-generated by CodeMorph")
    lines.append("// Sequelize database connection")
    lines.append("")
    lines.append("const { Sequelize } = require('sequelize');")
    lines.append("")

    if dialect == 'sqlite':
        # SQLite uses a file path, not host/port
        lines.append("const sequelize = new Sequelize({")
        lines.append("  dialect: 'sqlite',")
        lines.append("  storage: process.env.DB_PATH || './database.sqlite',")
        lines.append("  logging: process.env.NODE_ENV !== 'production',")
        lines.append("});")
    else:
        lines.append("const sequelize = new Sequelize(")
        lines.append("  process.env.DB_NAME,")
        lines.append("  process.env.DB_USER,")
        lines.append("  process.env.DB_PASSWORD,")
        lines.append("  {")
        lines.append(f"    dialect: '{dialect}',")
        lines.append("    host: process.env.DB_HOST || 'localhost',")
        lines.append("    port: process.env.DB_PORT,")
        lines.append("    logging: process.env.NODE_ENV !== 'production',")
        lines.append("    pool: {")
        lines.append("      max: 5,")
        lines.append("      min: 0,")
        lines.append("      acquire: 30000,")
        lines.append("      idle: 10000,")
        lines.append("    },")
        lines.append("  }")
        lines.append(");")

    lines.append("")
    lines.append("// Test the connection on startup")
    lines.append("sequelize.authenticate()")
    lines.append("  .then(() => console.log('Database connected.'))")
    lines.append("  .catch(err => console.error('Database connection failed:', err));")
    lines.append("")
    lines.append("module.exports = sequelize;")

    return '\n'.join(lines)


def generate_env_example(repo_ir: RepositoryIR) -> str:
    """
    Generates a .env.example file listing all required environment variables.

    .env.example is committed to git (unlike .env which is gitignored).
    It documents what env vars a developer needs to set up the project.

    Variables included:
    - App config (PORT, NODE_ENV, PROJECT_NAME, SECRET_KEY)
    - DB credentials (based on db_engine)
    - Auth secrets (based on auth strategies found)
    """
    config = repo_ir.project_config or ProjectConfigIR()
    auth_strategies = {a.express_strategy for a in repo_ir.auth}

    lines = []
    lines.append("# Auto-generated by CodeMorph")
    lines.append("# Copy this file to .env and fill in your values")
    lines.append("# NEVER commit .env to git")
    lines.append("")

    # ── App config ────────────────────────────────────────────────────────────
    lines.append("# ── App ──────────────────────────────────────────────────")
    lines.append("PORT=3000")
    lines.append("NODE_ENV=development")
    lines.append(f"PROJECT_NAME={config.project_name}")
    lines.append("SECRET_KEY=your-secret-key-change-this-in-production")
    lines.append("")

    # ── Database ──────────────────────────────────────────────────────────────
    lines.append("# ── Database ─────────────────────────────────────────────")
    if config.db_engine == 'sqlite':
        lines.append("DB_PATH=./database.sqlite")
    else:
        lines.append(f"DB_NAME={config.db_name or 'your_database_name'}")
        lines.append("DB_USER=your_db_user")
        lines.append("DB_PASSWORD=your_db_password")
        lines.append(f"DB_HOST={config.db_host or 'localhost'}")
        lines.append(f"DB_PORT={config.db_port or ('3306' if config.db_engine == 'mysql' else '5432')}")
    lines.append("")

    # ── Auth secrets ──────────────────────────────────────────────────────────
    if 'jwt' in auth_strategies:
        lines.append("# ── JWT ──────────────────────────────────────────────")
        lines.append("JWT_SECRET=your-jwt-secret-key-change-this")
        lines.append("JWT_EXPIRY=24h")
        lines.append("")

    if 'oauth2' in auth_strategies:
        lines.append("# ── OAuth2 ───────────────────────────────────────────")
        lines.append("OAUTH2_CLIENT_ID=your-oauth2-client-id")
        lines.append("OAUTH2_CLIENT_SECRET=your-oauth2-client-secret")
        lines.append("")

    return '\n'.join(lines)


def _pkg_to_var(package: str) -> str:
    """Converts npm package name to JS variable name."""
    name_map = {
        'express-session': 'session',
        'jsonwebtoken':    'jwt',
        'basic-auth':      'basicAuth',
        'passport-oauth2': 'oauth2',
    }
    return name_map.get(package, package.replace('-', '_'))