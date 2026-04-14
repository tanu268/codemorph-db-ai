# apps/validator/services/route_validator.py

import re
from typing import List, Dict
from apps.ir.schema import RouteIR, RepositoryIR


VALID_HTTP_METHODS = {'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'}


def _validate_single_route(route: RouteIR) -> List[str]:
    """
    Validates one RouteIR and returns a list of error messages.
    Empty list means the route is valid.
    
    We check:
    1. Path starts with /
    2. Path contains no spaces
    3. All HTTP methods are valid
    4. Path params in IR match params declared in path
    """
    errors = []

    # Check 1: path must start with /
    if not route.path.startswith('/'):
        errors.append(
            f"Route path '{route.path}' must start with '/'"
        )

    # Check 2: path must not contain spaces
    if ' ' in route.path:
        errors.append(
            f"Route path '{route.path}' contains spaces"
        )

    # Check 3: all HTTP methods must be valid
    for method in route.methods:
        if method.upper() not in VALID_HTTP_METHODS:
            errors.append(
                f"Invalid HTTP method '{method}' in route '{route.path}'"
            )

    # Check 4: params in path must match params list
    # Extract :param patterns from Express path
    path_params = set(re.findall(r':(\w+)', route.path))
    declared_params = set(route.params)

    missing = path_params - declared_params
    extra = declared_params - path_params

    if missing:
        errors.append(
            f"Params {missing} found in path but missing from params list"
        )
    if extra:
        errors.append(
            f"Params {extra} declared in params list but not found in path"
        )

    return errors


def validate_repository_ir(repo_ir: RepositoryIR) -> Dict:
    """
    Validates all routes in a RepositoryIR.
    
    Returns a validation report dict:
    {
        'is_valid': True/False,
        'total_routes': 3,
        'valid_routes': 2,
        'invalid_routes': 1,
        'errors': {
            '/users/:pk': ['error message 1'],
            ...
        }
    }
    
    Why return a dict instead of raising an exception?
    Because validation errors are expected — they're data, not crashes.
    The caller decides what to do with invalid routes.
    """
    all_errors: Dict[str, List[str]] = {}

    for route in repo_ir.routes:
        errors = _validate_single_route(route)
        if errors:
            all_errors[route.path] = errors

    valid_count = len(repo_ir.routes) - len(all_errors)

    return {
        'is_valid': len(all_errors) == 0,
        'total_routes': len(repo_ir.routes),
        'valid_routes': valid_count,
        'invalid_routes': len(all_errors),
        'errors': all_errors,
    }


    # Add this to the bottom of route_validator.py

VALID_JS_TYPES = {
    'STRING', 'TEXT', 'INTEGER', 'BIGINT', 'SMALLINT',
    'FLOAT', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATEONLY',
    'TIME', 'UUID', 'JSON', 'ARRAY', 'BIGINT'
}


def validate_models_ir(repo_ir) -> dict:
    """
    Validates all ModelIR objects in the RepositoryIR.

    Checks:
    1. Model name starts with uppercase
    2. Each field has a valid JS type
    3. No duplicate field names in a model
    4. Model has at least one field

    Returns a validation report dict.
    """
    all_errors = {}

    for model in repo_ir.models:
        errors = []

        # Check 1: model name should start with uppercase
        if not model.name[0].isupper():
            errors.append(
                f"Model name '{model.name}' should start with uppercase"
            )

        # Check 2: must have at least one field
        if not model.fields:
            errors.append(f"Model '{model.name}' has no fields")

        # Check 3: no duplicate field names
        field_names = [f.name for f in model.fields]
        duplicates = set(
            [n for n in field_names if field_names.count(n) > 1]
        )
        if duplicates:
            errors.append(
                f"Duplicate fields in '{model.name}': {duplicates}"
            )

        # Check 4: all JS types must be valid Sequelize types
        for field in model.fields:
            if field.js_type not in VALID_JS_TYPES:
                errors.append(
                    f"Field '{field.name}' has unknown JS type '{field.js_type}'"
                )

        if errors:
            all_errors[model.name] = errors

    valid_count = len(repo_ir.models) - len(all_errors)

    return {
        'is_valid': len(all_errors) == 0,
        'total_models': len(repo_ir.models),
        'valid_models': valid_count,
        'invalid_models': len(all_errors),
        'errors': all_errors,
    }

# Add at the bottom of route_validator.py

def validate_middleware_ir(repo_ir) -> dict:
    """
    Validates all MiddlewareIR objects.

    Checks:
    1. No duplicate middleware
    2. SecurityMiddleware is first (Django best practice)
    3. AuthenticationMiddleware comes after SessionMiddleware
    4. Counts unsupported middleware
    """
    errors = {}
    warnings = []

    middleware_classes = [m.django_class for m in repo_ir.middleware]

    # Check 1: No duplicates
    seen = set()
    for mw in repo_ir.middleware:
        if mw.django_class in seen:
            errors[mw.django_class] = [
                f"Duplicate middleware: {mw.django_class}"
            ]
        seen.add(mw.django_class)

    # Check 2: SecurityMiddleware should be first
    if middleware_classes and middleware_classes[0] != 'SecurityMiddleware':
        warnings.append(
            "SecurityMiddleware should be first in MIDDLEWARE list"
        )

    # Check 3: AuthenticationMiddleware after SessionMiddleware
    if ('AuthenticationMiddleware' in middleware_classes and
            'SessionMiddleware' in middleware_classes):
        auth_idx = middleware_classes.index('AuthenticationMiddleware')
        session_idx = middleware_classes.index('SessionMiddleware')
        if auth_idx < session_idx:
            warnings.append(
                "AuthenticationMiddleware should come after SessionMiddleware"
            )

    # Count unsupported
    unsupported = [
        m.django_class for m in repo_ir.middleware
        if not m.is_supported
    ]

    supported_count = len(repo_ir.middleware) - len(unsupported)

    return {
        'is_valid': len(errors) == 0,
        'total_middleware': len(repo_ir.middleware),
        'supported_middleware': supported_count,
        'unsupported_middleware': unsupported,
        'warnings': warnings,
        'errors': errors,
    }