# apps/parser/services/model_parser.py

import ast
import zipfile
from typing import List, Optional
from apps.ir.schema import ModelIR, FieldIR


# ─── Django field type → JavaScript/Sequelize type mapping ───────────────────

FIELD_TYPE_MAP = {
    # Text fields
    'CharField':        'STRING',
    'TextField':        'TEXT',
    'SlugField':        'STRING',
    'EmailField':       'STRING',
    'URLField':         'STRING',
    'UUIDField':        'UUID',
    'FileField':        'STRING',
    'ImageField':       'STRING',
    'IPAddressField':   'STRING',

    # Numeric fields
    'IntegerField':     'INTEGER',
    'BigIntegerField':  'BIGINT',
    'SmallIntegerField':'SMALLINT',
    'PositiveIntegerField': 'INTEGER',
    'FloatField':       'FLOAT',
    'DecimalField':     'DECIMAL',
    'AutoField':        'INTEGER',
    'BigAutoField':     'BIGINT',

    # Boolean
    'BooleanField':     'BOOLEAN',
    'NullBooleanField': 'BOOLEAN',

    # Date/Time
    'DateField':        'DATEONLY',
    'DateTimeField':    'DATE',
    'TimeField':        'TIME',
    'DurationField':    'BIGINT',

    # Relationships — stored as foreign keys
    'ForeignKey':       'INTEGER',
    'OneToOneField':    'INTEGER',
    'ManyToManyField':  'ARRAY',

    # JSON
    'JSONField':        'JSON',
}


def _get_js_type(django_type: str) -> str:
    """
    Maps a Django field type to its Sequelize equivalent.
    Returns 'STRING' as a safe default for unknown types.
    """
    return FIELD_TYPE_MAP.get(django_type, 'STRING')


def _extract_keyword_value(keywords: list, key: str) -> Optional[str]:
    """
    Extracts a keyword argument value from an AST call's keywords list.

    For example in: CharField(max_length=100, null=True)
    _extract_keyword_value(keywords, 'null') → 'True'
    _extract_keyword_value(keywords, 'max_length') → '100'

    We return strings because AST constants can be int, bool, str, None.
    The caller decides how to interpret the value.
    """
    for kw in keywords:
        if kw.arg == key:
            value = kw.value
            # Constant covers str, int, float, bool, None in Python 3.8+
            if isinstance(value, ast.Constant):
                return str(value.value)
            # Name covers True, False, None as Name nodes in older Python
            if isinstance(value, ast.Name):
                return value.id
    return None


def _parse_field(field_name: str, field_node: ast.Call) -> Optional[FieldIR]:
    """
    Parses a single Django model field assignment into a FieldIR.

    Handles this pattern in the AST:
        title = models.CharField(max_length=200, null=False)

    The AST for the right side (models.CharField(...)) is:
        Call(
            func=Attribute(value=Name('models'), attr='CharField'),
            keywords=[
                keyword(arg='max_length', value=Constant(200)),
                keyword(arg='null', value=Constant(False)),
            ]
        )

    Args:
        field_name: the variable name e.g. 'title'
        field_node: the AST Call node for the field constructor

    Returns:
        FieldIR or None if this isn't a recognized field
    """

    # Get the Django field type name from the AST
    func = field_node.func

    django_type = None
    if isinstance(func, ast.Attribute):
        # models.CharField → attr is 'CharField'
        django_type = func.attr
    elif isinstance(func, ast.Name):
        # CharField (imported directly) → id is 'CharField'
        django_type = func.id

    if not django_type:
        return None

    # Skip non-field attributes like Meta, objects, etc.
    if django_type not in FIELD_TYPE_MAP:
        return None

    # Extract common keyword arguments
    keywords = field_node.keywords

    # null=True means the field can be NULL in the database
    null_val = _extract_keyword_value(keywords, 'null')
    is_nullable = null_val == 'True'

    # blank=False means the field is required in forms
    blank_val = _extract_keyword_value(keywords, 'blank')
    is_required = blank_val != 'True'

    # max_length=100 — only on CharField and similar
    max_length_val = _extract_keyword_value(keywords, 'max_length')
    max_length = int(max_length_val) if max_length_val and max_length_val.isdigit() else None

    # default value
    default_val = _extract_keyword_value(keywords, 'default')

    return FieldIR(
        name=field_name,
        django_type=django_type,
        js_type=_get_js_type(django_type),
        is_nullable=is_nullable,
        is_required=is_required,
        max_length=max_length,
        default=default_val,
    )


def _parse_model_class(class_node: ast.ClassDef) -> Optional[ModelIR]:
    """
    Parses a single Django model class definition into a ModelIR.

    Looks for classes that:
    1. Inherit from models.Model or Model
    2. Have field assignments in their body

    Args:
        class_node: AST ClassDef node

    Returns:
        ModelIR or None if this class is not a Django model
    """

    # Check if this class inherits from models.Model or Model
    is_django_model = False
    for base in class_node.bases:
        # models.Model → Attribute node
        if isinstance(base, ast.Attribute) and base.attr == 'Model':
            is_django_model = True
            break
        # Model (imported directly) → Name node
        if isinstance(base, ast.Name) and base.id == 'Model':
            is_django_model = True
            break

    if not is_django_model:
        return None

    fields: List[FieldIR] = []

    # Walk through the class body looking for field assignments
    for node in class_node.body:
        # We're looking for: field_name = models.SomeField(...)
        # In AST this is an Assign node with a Call on the right side
        if not isinstance(node, ast.Assign):
            continue

        # Get the field name from the left side of the assignment
        if not node.targets or not isinstance(node.targets[0], ast.Name):
            continue

        field_name = node.targets[0].id

        # Skip Meta class and other non-field attributes
        if field_name.startswith('_') or field_name == 'objects':
            continue

        # Check if the right side is a function call (field constructor)
        if not isinstance(node.value, ast.Call):
            continue

        # Try to parse this as a field
        field_ir = _parse_field(field_name, node.value)
        if field_ir:
            fields.append(field_ir)

    # Only return if we found at least one field
    if not fields:
        return None

    return ModelIR(
        name=class_node.name,
        table_name=class_node.name.lower(),
        fields=fields,
    )


def parse_models_from_zip(zip_path: str) -> List[ModelIR]:
    """
    Main entry point for the model parser.

    Opens the ZIP, finds models.py, parses all Django model
    classes, and returns a list of ModelIR objects.

    Args:
        zip_path: Absolute path to the ZIP file on disk

    Returns:
        List of ModelIR objects (empty list if no models.py found)
    """

    models_content: Optional[str] = None

    with zipfile.ZipFile(zip_path, 'r') as zf:
        all_files = zf.namelist()

        # Find models.py — could be at any depth
        models_file = None
        for f in all_files:
            if f.endswith('models.py'):
                models_file = f
                break

        # models.py is optional — not all projects have custom models
        if models_file is None:
            return []

        with zf.open(models_file) as f:
            models_content = f.read().decode('utf-8')

    # Parse into AST
    try:
        tree = ast.parse(models_content)
    except SyntaxError:
        return []

    # Find all class definitions and try to parse them as models
    model_irs: List[ModelIR] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            model_ir = _parse_model_class(node)
            if model_ir:
                model_irs.append(model_ir)

    return model_irs