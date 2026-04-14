# apps/parser/services/relationship_extractor.py

import ast
import zipfile
from typing import List, Optional, Tuple

from apps.ir.schema import (
    SchemaIR, TableSchema, ColumnSchema, ForeignKeySchema, IndexSchema
)

ORACLE_TYPE_MAP = {
    'CharField':            lambda max_length: f'VARCHAR2({max_length or 255} CHAR)',
    'TextField':            lambda _: 'CLOB',
    'SlugField':            lambda max_length: f'VARCHAR2({max_length or 50} CHAR)',
    'EmailField':           lambda _: 'VARCHAR2(254 CHAR)',
    'URLField':             lambda _: 'VARCHAR2(200 CHAR)',
    'UUIDField':            lambda _: 'VARCHAR2(36 CHAR)',
    'FileField':            lambda _: 'VARCHAR2(100 CHAR)',
    'ImageField':           lambda _: 'VARCHAR2(100 CHAR)',
    'IPAddressField':       lambda _: 'VARCHAR2(39 CHAR)',
    'IntegerField':         lambda _: 'NUMBER(10)',
    'BigIntegerField':      lambda _: 'NUMBER(19)',
    'SmallIntegerField':    lambda _: 'NUMBER(5)',
    'PositiveIntegerField': lambda _: 'NUMBER(10)',
    'FloatField':           lambda _: 'BINARY_DOUBLE',
    'DecimalField':         lambda _: 'NUMBER(19,4)',
    'AutoField':            lambda _: 'NUMBER(10) GENERATED ALWAYS AS IDENTITY',
    'BigAutoField':         lambda _: 'NUMBER(19) GENERATED ALWAYS AS IDENTITY',
    'BooleanField':         lambda _: 'NUMBER(1)',
    'NullBooleanField':     lambda _: 'NUMBER(1)',
    'DateField':            lambda _: 'DATE',
    'DateTimeField':        lambda _: 'TIMESTAMP',
    'TimeField':            lambda _: 'INTERVAL DAY TO SECOND',
    'DurationField':        lambda _: 'INTERVAL DAY TO SECOND',
    'ForeignKey':           lambda _: 'NUMBER(19)',
    'OneToOneField':        lambda _: 'NUMBER(19)',
    'ManyToManyField':      lambda _: None,
    'JSONField':            lambda _: 'JSON',
}

LOSSY_TYPES = {
    'BooleanField': 'Oracle has no native BOOLEAN in SQL; mapped to NUMBER(1) with CHECK(IN(0,1))',
    'NullBooleanField': 'Oracle has no native BOOLEAN; mapped to NUMBER(1)',
    'DurationField': 'DurationField mapped to INTERVAL — manual migration required',
    'TimeField': 'TimeField mapped to INTERVAL DAY TO SECOND — verify precision',
    'UUIDField': 'UUID stored as VARCHAR2(36); consider RAW(16) for performance',
}

RELATIONSHIP_FIELDS = {'ForeignKey', 'OneToOneField', 'ManyToManyField'}

ON_DELETE_MAP = {
    'CASCADE':    'CASCADE',
    'SET_NULL':   'SET NULL',
    'PROTECT':    'NO ACTION',
    'DO_NOTHING': 'NO ACTION',
    'SET_DEFAULT':'SET DEFAULT',
}


def _get_oracle_type(django_type: str, max_length: Optional[int]) -> Optional[str]:
    mapper = ORACLE_TYPE_MAP.get(django_type)
    if mapper is None:
        return 'VARCHAR2(255 CHAR)'
    return mapper(max_length)


def _extract_kw(keywords: list, key: str) -> Optional[str]:
    """
    Extract keyword argument value from AST keywords list.
    Handles: Constant, Name, Attribute (e.g. models.CASCADE → 'CASCADE')
    """
    for kw in keywords:
        if kw.arg == key:
            v = kw.value
            if isinstance(v, ast.Constant):
                return str(v.value)
            if isinstance(v, ast.Name):
                return v.id                 # e.g. CASCADE (bare name)
            if isinstance(v, ast.Attribute):
                return v.attr               # e.g. models.CASCADE → 'CASCADE'
    return None


def _get_related_model(call: ast.Call) -> Optional[str]:
    """
    Extract related model name from ForeignKey(Model) or ForeignKey('Model') or ForeignKey(to=Model).
    Handles both positional arg and keyword 'to'.
    """
    # Positional first arg: ForeignKey(User, ...) or ForeignKey('User', ...)
    if call.args:
        arg = call.args[0]
        if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
            return arg.value.split('.')[-1].strip("'\"").lower()
        if isinstance(arg, ast.Name):
            return arg.id.lower()
        if isinstance(arg, ast.Attribute):
            return arg.attr.lower()

    # Keyword: ForeignKey(to='User') or ForeignKey(to=User)
    to_val = _extract_kw(call.keywords, 'to')
    if to_val:
        return to_val.split('.')[-1].strip("'\"").lower()

    return None


def _parse_model_to_table(class_node: ast.ClassDef) -> Optional[Tuple[TableSchema, List[str]]]:
    is_model = any(
        (isinstance(b, ast.Attribute) and b.attr == 'Model') or
        (isinstance(b, ast.Name) and b.id == 'Model')
        for b in class_node.bases
    )
    if not is_model:
        return None

    table_name = class_node.name.lower()
    columns: List[ColumnSchema] = []
    foreign_keys: List[ForeignKeySchema] = []
    warnings: List[str] = []

    # Implicit PK
    columns.append(ColumnSchema(
        name='id',
        django_type='BigAutoField',
        oracle_type='NUMBER(19) GENERATED ALWAYS AS IDENTITY',
        is_primary_key=True,
        is_nullable=False,
    ))

    for node in class_node.body:
        if not isinstance(node, ast.Assign):
            continue
        if not node.targets or not isinstance(node.targets[0], ast.Name):
            continue

        field_name = node.targets[0].id
        if field_name.startswith('_') or field_name == 'objects':
            continue
        if not isinstance(node.value, ast.Call):
            continue

        call = node.value
        func = call.func
        django_type = None

        if isinstance(func, ast.Attribute):
            django_type = func.attr
        elif isinstance(func, ast.Name):
            django_type = func.id

        if not django_type or django_type not in ORACLE_TYPE_MAP:
            continue

        keywords = call.keywords
        max_length_raw = _extract_kw(keywords, 'max_length')
        max_length = int(max_length_raw) if max_length_raw and str(max_length_raw).isdigit() else None
        null_val = _extract_kw(keywords, 'null')
        is_nullable = null_val == 'True'
        unique_val = _extract_kw(keywords, 'unique')
        is_unique = unique_val == 'True'
        default_val = _extract_kw(keywords, 'default')

        if django_type in LOSSY_TYPES:
            warnings.append(f'{class_node.name}.{field_name}: {LOSSY_TYPES[django_type]}')

        if django_type in RELATIONSHIP_FIELDS:
            if django_type == 'ManyToManyField':
                related = _get_related_model(call)
                if related:
                    foreign_keys.append(ForeignKeySchema(
                        from_table=table_name,
                        from_column=f'{field_name}_id',
                        to_table=related,
                        relationship_type='ManyToManyField',
                        on_delete='CASCADE',
                    ))
                continue

            related = _get_related_model(call)
            on_delete_raw = _extract_kw(keywords, 'on_delete')
            on_delete = ON_DELETE_MAP.get(on_delete_raw or 'CASCADE', 'CASCADE')
            col_name = f'{field_name}_id'

            columns.append(ColumnSchema(
                name=col_name,
                django_type=django_type,
                oracle_type='NUMBER(19)',
                is_nullable=is_nullable,
                is_unique=(django_type == 'OneToOneField'),
                default=default_val,
            ))

            if related:
                foreign_keys.append(ForeignKeySchema(
                    from_table=table_name,
                    from_column=col_name,
                    to_table=related,
                    relationship_type=django_type,
                    on_delete=on_delete,
                ))
        else:
            oracle_type = _get_oracle_type(django_type, max_length)
            if oracle_type:
                columns.append(ColumnSchema(
                    name=field_name,
                    django_type=django_type,
                    oracle_type=oracle_type,
                    is_nullable=is_nullable,
                    is_primary_key=False,
                    max_length=max_length,
                    default=default_val,
                    is_unique=is_unique,
                ))

    if len(columns) <= 1:
        return None

    table = TableSchema(
        name=class_node.name,
        table_name=table_name,
        columns=columns,
        foreign_keys=foreign_keys,
    )
    return table, warnings


def extract_schema_from_zip(zip_path: str, repo_id: str) -> SchemaIR:
    schema = SchemaIR(repo_id=repo_id)

    models_content: Optional[str] = None
    with zipfile.ZipFile(zip_path, 'r') as zf:
        all_files = zf.namelist()
        models_file = next(
            (f for f in all_files if f.endswith('models.py')), None
        )
        if models_file is None:
            schema.warnings.append('No models.py found in ZIP')
            return schema

        with zf.open(models_file) as f:
            models_content = f.read().decode('utf-8')

    try:
        tree = ast.parse(models_content)
    except SyntaxError as e:
        schema.warnings.append(f'Syntax error in models.py: {e}')
        return schema

    all_warnings: List[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            result = _parse_model_to_table(node)
            if result:
                table, table_warnings = result
                schema.tables.append(table)
                all_warnings.extend(table_warnings)

    schema.warnings = all_warnings

    # Build D3-ready relationship edges
    for table in schema.tables:
        for fk in table.foreign_keys:
            schema.relationship_edges.append({
                'from': fk.from_table,
                'to': fk.to_table,
                'label': fk.from_column,
                'type': fk.relationship_type,
            })

    return schema