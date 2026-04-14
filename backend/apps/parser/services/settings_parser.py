# apps/parser/services/settings_parser.py

import ast
import zipfile
from typing import List, Optional, Tuple
from apps.ir.schema import MiddlewareIR, AuthIR, ProjectConfigIR


# ─── Middleware mapping (unchanged from Iteration 3) ─────────────────────────

MIDDLEWARE_MAP = {
    'SecurityMiddleware':      {'express_equivalent': 'helmet()',                                                             'npm_package': 'helmet',          'is_supported': True},
    'CorsMiddleware':          {'express_equivalent': 'cors()',                                                               'npm_package': 'cors',            'is_supported': True},
    'SessionMiddleware':       {'express_equivalent': "session({ secret: process.env.SECRET_KEY, resave: false, saveUninitialized: false })", 'npm_package': 'express-session', 'is_supported': True},
    'CommonMiddleware':        {'express_equivalent': 'express.urlencoded({ extended: true })',                               'npm_package': None,              'is_supported': True},
    'CsrfViewMiddleware':      {'express_equivalent': 'csrf()',                                                               'npm_package': 'csurf',           'is_supported': True},
    'AuthenticationMiddleware':{'express_equivalent': 'passport.initialize()',                                                'npm_package': 'passport',        'is_supported': True},
    'MessageMiddleware':       {'express_equivalent': '// MessageMiddleware has no direct Express equivalent',                'npm_package': None,              'is_supported': False},
    'XFrameOptionsMiddleware': {'express_equivalent': "helmet.frameguard({ action: 'deny' })",                               'npm_package': 'helmet',          'is_supported': True},
    'GZipMiddleware':          {'express_equivalent': 'compression()',                                                        'npm_package': 'compression',     'is_supported': True},
    'LocaleMiddleware':        {'express_equivalent': 'i18next.init()',                                                       'npm_package': 'i18next',         'is_supported': True},
}

AUTH_CLASS_MAP = {
    'SessionAuthentication': {'express_strategy': 'session', 'npm_package': 'express-session',  'is_supported': True},
    'TokenAuthentication':   {'express_strategy': 'jwt',     'npm_package': 'jsonwebtoken',      'is_supported': True},
    'BasicAuthentication':   {'express_strategy': 'basic',   'npm_package': 'basic-auth',        'is_supported': True},
    'JWTAuthentication':     {'express_strategy': 'jwt',     'npm_package': 'jsonwebtoken',      'is_supported': True},
    'OAuth2Authentication':  {'express_strategy': 'oauth2',  'npm_package': 'passport-oauth2',   'is_supported': True},
}

# ─── DB engine → Sequelize dialect mapping (NEW) ─────────────────────────────

DB_ENGINE_MAP = {
    'django.db.backends.sqlite3':    'sqlite',
    'django.db.backends.postgresql': 'postgres',
    'django.db.backends.mysql':      'mysql',
    'django.db.backends.oracle':     'oracle',
}


def _extract_class_name(dotted_path: str) -> str:
    return dotted_path.split('.')[-1]


def _parse_string_list(node: ast.List) -> List[str]:
    result = []
    for elt in node.elts:
        if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
            result.append(elt.value)
    return result


def _find_assignment(tree: ast.Module, variable_name: str) -> Optional[ast.AST]:
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == variable_name:
                    return node.value
    return None


def _extract_auth_classes_from_drf_settings(tree: ast.Module) -> List[str]:
    rest_framework_node = _find_assignment(tree, 'REST_FRAMEWORK')
    if not rest_framework_node or not isinstance(rest_framework_node, ast.Dict):
        return []
    for key, value in zip(rest_framework_node.keys, rest_framework_node.values):
        if isinstance(key, ast.Constant) and key.value == 'DEFAULT_AUTHENTICATION_CLASSES':
            if isinstance(value, ast.List):
                return _parse_string_list(value)
    return []


def _extract_database_config(tree: ast.Module) -> dict:
    """
    Extracts the DATABASES['default'] config from settings.py AST.

    Django DATABASES looks like:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.mysql',
                'NAME': os.getenv('DB_NAME'),
                'HOST': 'localhost',
                'PORT': '3306',
            }
        }

    We walk the outer dict looking for 'default', then walk the
    inner dict for 'ENGINE', 'NAME', 'HOST', 'PORT'.

    Returns a plain dict with the extracted values (strings only —
    os.getenv() calls are skipped since we can't evaluate them).
    """
    result = {'engine': 'sqlite3', 'name': None, 'host': 'localhost', 'port': None}

    databases_node = _find_assignment(tree, 'DATABASES')
    if not databases_node or not isinstance(databases_node, ast.Dict):
        return result

    # Find the 'default' key in DATABASES
    for key, value in zip(databases_node.keys, databases_node.values):
        if isinstance(key, ast.Constant) and key.value == 'default':
            if not isinstance(value, ast.Dict):
                break

            # Walk inner dict for ENGINE, NAME, HOST, PORT
            for inner_key, inner_value in zip(value.keys, value.values):
                if not isinstance(inner_key, ast.Constant):
                    continue
                k = inner_key.value

                # Only extract plain string values — skip os.getenv() calls
                if isinstance(inner_value, ast.Constant) and isinstance(inner_value.value, str):
                    v = inner_value.value
                    if k == 'ENGINE':
                        # Map full dotted engine path to short name
                        result['engine'] = DB_ENGINE_MAP.get(v, v.split('.')[-1])
                    elif k == 'NAME':
                        result['name'] = v
                    elif k == 'HOST':
                        result['host'] = v
                    elif k == 'PORT':
                        result['port'] = v
            break

    return result


def _extract_bool_setting(tree: ast.Module, name: str, default: bool) -> bool:
    """Extracts a True/False setting like DEBUG or USE_I18N."""
    node = _find_assignment(tree, name)
    if node is None:
        return default
    if isinstance(node, ast.Constant):
        return bool(node.value)
    # Name node covers bare True/False
    if isinstance(node, ast.Name):
        return node.id == 'True'
    return default


def _extract_string_setting(tree: ast.Module, name: str, default: str) -> str:
    """Extracts a plain string setting like TIME_ZONE."""
    node = _find_assignment(tree, name)
    if node and isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return default


def parse_settings_from_zip(
    zip_path: str,
) -> Tuple[List[MiddlewareIR], List[AuthIR], ProjectConfigIR]:
    """
    Main entry point — now returns a 3-tuple:
      (middleware_list, auth_list, project_config)

    ProjectConfigIR is NEW in Iteration 4.

    NOTE: The return signature changed from Iteration 3's 2-tuple.
    pipeline_service.py is updated to match.
    """
    settings_content: Optional[str] = None
    project_name = 'my-express-app'

    with zipfile.ZipFile(zip_path, 'r') as zf:
        all_files = zf.namelist()

        # Try to infer project name from folder structure
        # e.g. 'myblog/settings.py' → project name is 'myblog'
        settings_file = None
        for f in all_files:
            if f.endswith('settings.py'):
                settings_file = f
                parts = f.split('/')
                if len(parts) > 1:
                    project_name = parts[0]
                break

        if settings_file is None:
            empty_config = ProjectConfigIR(project_name=project_name)
            return [], [], empty_config

        with zf.open(settings_file) as f:
            settings_content = f.read().decode('utf-8')

    try:
        tree = ast.parse(settings_content)
    except SyntaxError:
        empty_config = ProjectConfigIR(project_name=project_name)
        return [], [], empty_config

    # ── Middleware ────────────────────────────────────────────────────────────
    middleware_list: List[MiddlewareIR] = []
    middleware_node = _find_assignment(tree, 'MIDDLEWARE')
    if middleware_node and isinstance(middleware_node, ast.List):
        for order, path in enumerate(_parse_string_list(middleware_node)):
            class_name = _extract_class_name(path)
            mapping = MIDDLEWARE_MAP.get(class_name, {
                'express_equivalent': f'// {class_name} — no Express equivalent found',
                'npm_package': None,
                'is_supported': False,
            })
            middleware_list.append(MiddlewareIR(
                django_class=class_name,
                django_path=path,
                express_equivalent=mapping['express_equivalent'],
                npm_package=mapping['npm_package'],
                is_supported=mapping['is_supported'],
                order=order,
            ))

    # ── Auth ──────────────────────────────────────────────────────────────────
    auth_list: List[AuthIR] = []
    for path in _extract_auth_classes_from_drf_settings(tree):
        class_name = _extract_class_name(path)
        mapping = AUTH_CLASS_MAP.get(class_name, {
            'express_strategy': 'custom',
            'npm_package': None,
            'is_supported': False,
        })
        auth_list.append(AuthIR(
            django_class=class_name,
            django_path=path,
            express_strategy=mapping['express_strategy'],
            npm_package=mapping['npm_package'],
            is_supported=mapping['is_supported'],
        ))

    # ── Project Config (NEW) ──────────────────────────────────────────────────
    db_config = _extract_database_config(tree)

    installed_apps_node = _find_assignment(tree, 'INSTALLED_APPS')
    installed_apps = []
    if installed_apps_node and isinstance(installed_apps_node, ast.List):
        installed_apps = _parse_string_list(installed_apps_node)

    allowed_hosts_node = _find_assignment(tree, 'ALLOWED_HOSTS')
    allowed_hosts = []
    if allowed_hosts_node and isinstance(allowed_hosts_node, ast.List):
        allowed_hosts = _parse_string_list(allowed_hosts_node)

    project_config = ProjectConfigIR(
        project_name=project_name,
        db_engine=db_config['engine'],
        db_name=db_config['name'],
        db_host=db_config['host'],
        db_port=db_config['port'],
        installed_apps=installed_apps,
        debug=_extract_bool_setting(tree, 'DEBUG', True),
        allowed_hosts=allowed_hosts,
        time_zone=_extract_string_setting(tree, 'TIME_ZONE', 'UTC'),
        use_i18n=_extract_bool_setting(tree, 'USE_I18N', False),
    )

    return middleware_list, auth_list, project_config