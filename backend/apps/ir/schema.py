# apps/ir/schema.py

from dataclasses import dataclass, field
from typing import List, Optional, Dict


# ─── ROUTE IR (Iteration 1) ──────────────────────────────────────────────────

@dataclass
class RouteIR:
    path: str
    methods: List[str] = field(default_factory=lambda: ['GET'])
    view_name: Optional[str] = None
    route_name: Optional[str] = None
    params: List[str] = field(default_factory=list)

    def to_dict(self):
        return {
            'path': self.path,
            'methods': self.methods,
            'view_name': self.view_name,
            'route_name': self.route_name,
            'params': self.params,
        }


# ─── MODEL IR (Iteration 2) ──────────────────────────────────────────────────

@dataclass
class FieldIR:
    name: str
    django_type: str
    js_type: str
    is_nullable: bool = False
    is_required: bool = True
    max_length: Optional[int] = None
    default: Optional[str] = None

    def to_dict(self):
        return {
            'name': self.name,
            'django_type': self.django_type,
            'js_type': self.js_type,
            'is_nullable': self.is_nullable,
            'is_required': self.is_required,
            'max_length': self.max_length,
            'default': self.default,
        }


@dataclass
class ModelIR:
    name: str
    table_name: str
    fields: List[FieldIR] = field(default_factory=list)

    def to_dict(self):
        return {
            'name': self.name,
            'table_name': self.table_name,
            'fields': [f.to_dict() for f in self.fields],
        }


# ─── MIDDLEWARE IR (Iteration 3) ─────────────────────────────────────────────

@dataclass
class MiddlewareIR:
    django_class: str
    django_path: str
    express_equivalent: str
    npm_package: Optional[str]
    is_supported: bool = True
    order: int = 0

    def to_dict(self):
        return {
            'django_class': self.django_class,
            'django_path': self.django_path,
            'express_equivalent': self.express_equivalent,
            'npm_package': self.npm_package,
            'is_supported': self.is_supported,
            'order': self.order,
        }


@dataclass
class AuthIR:
    django_class: str
    django_path: str
    express_strategy: str
    npm_package: Optional[str]
    is_supported: bool = True

    def to_dict(self):
        return {
            'django_class': self.django_class,
            'django_path': self.django_path,
            'express_strategy': self.express_strategy,
            'npm_package': self.npm_package,
            'is_supported': self.is_supported,
        }


# ─── PROJECT CONFIG IR (Iteration 4 — NEW) ───────────────────────────────────

@dataclass
class ProjectConfigIR:
    """
    Captures project-level settings extracted from Django's settings.py.

    Why a separate dataclass?
    Because project config (name, version, DB engine) is different in nature
    from per-feature IR (routes, models, middleware). It describes the
    project as a whole, not individual components.

    This feeds into:
    - package.json generation (project name, version)
    - database.js generation (DB engine → Sequelize dialect)
    - .env.example generation (which env vars are needed)
    - app.js generation (port, debug flag)
    """

    # Project identity
    project_name: str = 'my-express-app'
    django_version: Optional[str] = None

    # Database config extracted from DATABASES['default']
    db_engine: str = 'sqlite3'          # 'sqlite3', 'postgresql', 'mysql'
    db_name: Optional[str] = None
    db_host: str = 'localhost'
    db_port: Optional[str] = None

    # Installed Django apps (third-party ones tell us what features are used)
    installed_apps: List[str] = field(default_factory=list)

    # Settings flags
    debug: bool = True
    allowed_hosts: List[str] = field(default_factory=list)
    time_zone: str = 'UTC'
    use_i18n: bool = False

    # Collected npm packages needed (populated by pipeline_service)
    # This is the union of all npm_package values from MiddlewareIR + AuthIR
    required_npm_packages: Dict[str, str] = field(default_factory=dict)
    # key = package name, value = suggested version e.g. {"helmet": "^7.0.0"}

    def to_dict(self):
        return {
            'project_name': self.project_name,
            'django_version': self.django_version,
            'db_engine': self.db_engine,
            'db_name': self.db_name,
            'db_host': self.db_host,
            'db_port': self.db_port,
            'installed_apps': self.installed_apps,
            'debug': self.debug,
            'allowed_hosts': self.allowed_hosts,
            'time_zone': self.time_zone,
            'use_i18n': self.use_i18n,
            'required_npm_packages': self.required_npm_packages,
        }


# ─── REPOSITORY IR (Iteration 4 update) ──────────────────────────────────────

@dataclass
class RepositoryIR:
    """
    IR for the entire Django repository.

    Iteration 1: routes
    Iteration 2: routes + models
    Iteration 3: routes + models + middleware + auth
    Iteration 4: all above + project_config
    """
    repo_id: str
    routes: List[RouteIR] = field(default_factory=list)
    models: List[ModelIR] = field(default_factory=list)
    middleware: List[MiddlewareIR] = field(default_factory=list)
    auth: List[AuthIR] = field(default_factory=list)
    project_config: Optional[ProjectConfigIR] = None              # NEW
    schema_ir: Optional['SchemaIR'] = None     

    def to_dict(self):
        return {
            'repo_id': self.repo_id,
            'routes': [r.to_dict() for r in self.routes],
            'models': [m.to_dict() for m in self.models],
            'middleware': [m.to_dict() for m in self.middleware],
            'auth': [a.to_dict() for a in self.auth],
            'project_config': self.project_config.to_dict() if self.project_config else None,
            'schema_ir': self.schema_ir.to_dict() if self.schema_ir else None,
        }


# ─── SCHEMA IR (Oracle Hackathon — Iteration 5) ──────────────────────────────
#
# This is a NEW addition. It sits alongside RepositoryIR and does NOT change
# any existing dataclasses. RepositoryIR gets one new optional field: schema_ir.
#
# Data flow:
#   model_parser.py → RelationshipExtractor → SchemaIR
#   SchemaIR → DDLGenerator → Oracle DDL string
#   SchemaIR → IndexAdvisor → index recommendations
#   SchemaIR → CompatScorer → 0-100 compatibility score


@dataclass
class ColumnSchema:
    """
    Represents one column in a database table.
    Extends FieldIR with Oracle-specific metadata.
    """
    name: str
    django_type: str                    # raw Django field type e.g. 'CharField'
    oracle_type: str                    # mapped Oracle type e.g. 'VARCHAR2(255 CHAR)'
    is_nullable: bool = False
    is_primary_key: bool = False
    max_length: Optional[int] = None
    default: Optional[str] = None
    is_unique: bool = False

    def to_dict(self):
        return {
            'name': self.name,
            'django_type': self.django_type,
            'oracle_type': self.oracle_type,
            'is_nullable': self.is_nullable,
            'is_primary_key': self.is_primary_key,
            'max_length': self.max_length,
            'default': self.default,
            'is_unique': self.is_unique,
        }


@dataclass
class ForeignKeySchema:
    """
    Represents a FK relationship between two tables.
    Used by the D3 relationship visualizer and DDL generator.
    """
    from_table: str                     # e.g. 'order'
    from_column: str                    # e.g. 'customer_id'
    to_table: str                       # e.g. 'customer'
    relationship_type: str = 'ForeignKey'   # 'ForeignKey' | 'OneToOneField' | 'ManyToManyField'
    on_delete: str = 'CASCADE'          # CASCADE | SET NULL | PROTECT | DO NOTHING

    def to_dict(self):
        return {
            'from_table': self.from_table,
            'from_column': self.from_column,
            'to_table': self.to_table,
            'relationship_type': self.relationship_type,
            'on_delete': self.on_delete,
        }


@dataclass
class IndexSchema:
    """
    Represents a recommended or existing index.
    """
    table_name: str
    column_name: str
    index_name: str
    reason: str                         # Why this index is recommended
    is_unique: bool = False

    def to_dict(self):
        return {
            'table_name': self.table_name,
            'column_name': self.column_name,
            'index_name': self.index_name,
            'reason': self.reason,
            'is_unique': self.is_unique,
        }


@dataclass
class TableSchema:
    """
    Represents one database table with all Oracle-relevant metadata.
    """
    name: str                           # model class name e.g. 'Order'
    table_name: str                     # DB table name e.g. 'order'
    columns: List[ColumnSchema] = field(default_factory=list)
    foreign_keys: List[ForeignKeySchema] = field(default_factory=list)
    indexes: List[IndexSchema] = field(default_factory=list)
    unique_together: List[List[str]] = field(default_factory=list)

    def to_dict(self):
        return {
            'name': self.name,
            'table_name': self.table_name,
            'columns': [c.to_dict() for c in self.columns],
            'foreign_keys': [fk.to_dict() for fk in self.foreign_keys],
            'indexes': [i.to_dict() for i in self.indexes],
            'unique_together': self.unique_together,
        }


@dataclass
class SchemaIR:
    """
    Oracle-focused schema representation of an entire Django project.

    This is the central data structure for the Oracle hackathon features:
    - DDL generator reads this to produce Oracle CREATE TABLE statements
    - Index advisor reads this to recommend missing indexes
    - Compatibility scorer reads this to produce a 0-100 score
    - Relationship visualizer reads this to build the D3 graph

    It is populated by RelationshipExtractor which re-reads the same
    models.py AST that model_parser.py already parsed — no double ZIP open.
    """
    repo_id: str
    tables: List[TableSchema] = field(default_factory=list)
    compatibility_score: Optional[float] = None
    warnings: List[str] = field(default_factory=list)   # type mapping warnings

    # Computed graph edges for D3 visualizer
    # Each edge: {"from": "order", "to": "customer", "label": "customer_id"}
    relationship_edges: List[Dict] = field(default_factory=list)

    def to_dict(self):
        return {
            'repo_id': self.repo_id,
            'tables': [t.to_dict() for t in self.tables],
            'compatibility_score': self.compatibility_score,
            'warnings': self.warnings,
            'relationship_edges': self.relationship_edges,
            'summary': {
                'total_tables': len(self.tables),
                'total_columns': sum(len(t.columns) for t in self.tables),
                'total_fk_relationships': sum(len(t.foreign_keys) for t in self.tables),
                'total_indexes': sum(len(t.indexes) for t in self.tables),
            }
        }
    
