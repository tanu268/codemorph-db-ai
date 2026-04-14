# apps/parser/services/url_parser.py

import ast
import zipfile
import re
from typing import List, Optional
from apps.ir.schema import RouteIR, RepositoryIR


def _convert_django_path_to_express(django_path: str) -> str:
    if not django_path.startswith('/'):
        django_path = '/' + django_path
    if django_path.endswith('/') and len(django_path) > 1:
        django_path = django_path.rstrip('/')
    express_path = re.sub(r'<(?:\w+:)?(\w+)>', r':\1', django_path)
    return express_path


def _extract_params_from_path(django_path: str) -> List[str]:
    return re.findall(r'<(?:\w+:)?(\w+)>', django_path)


def _extract_view_name(node: ast.expr) -> Optional[str]:
    """
    Handles these cases:
    1. views.UserListView.as_view() → 'UserListView'
    2. UserListView.as_view()       → 'UserListView'
    3. views.user_list              → 'user_list'
    4. user_list                    → 'user_list'
    """
    # Case: Something.as_view() call
    if isinstance(node, ast.Call):
        func = node.func
        if isinstance(func, ast.Attribute) and func.attr == 'as_view':
            inner = func.value
            # views.ClassName.as_view() → inner is Attribute
            if isinstance(inner, ast.Attribute):
                return inner.attr
            # ClassName.as_view() → inner is Name
            if isinstance(inner, ast.Name):
                return inner.id
        # Some other call
        if isinstance(func, ast.Attribute):
            return func.attr
        if isinstance(func, ast.Name):
            return func.id

    # Case: views.function_name
    if isinstance(node, ast.Attribute):
        return node.attr

    # Case: plain function name
    if isinstance(node, ast.Name):
        return node.id

    return None


def _parse_path_call(call_node: ast.Call) -> Optional[RouteIR]:
    if len(call_node.args) < 2:
        return None

    path_arg = call_node.args[0]
    if not isinstance(path_arg, ast.Constant):
        return None

    django_path = path_arg.value
    if not isinstance(django_path, str):
        return None

    view_node = call_node.args[1]
    view_name = _extract_view_name(view_node)

    route_name = None
    for keyword in call_node.keywords:
        if keyword.arg == 'name' and isinstance(keyword.value, ast.Constant):
            route_name = keyword.value.value

    express_path = _convert_django_path_to_express(django_path)
    params = _extract_params_from_path(django_path)

    return RouteIR(
        path=express_path,
        methods=['GET'],
        view_name=view_name,
        route_name=route_name,
        params=params,
    )


def parse_urls_from_zip(zip_path: str, repo_id: str) -> RepositoryIR:
    routes: List[RouteIR] = []
    urls_content: Optional[str] = None

    with zipfile.ZipFile(zip_path, 'r') as zf:
        all_files = zf.namelist()
        urls_file = None
        for f in all_files:
            if f.endswith('urls.py'):
                urls_file = f
                break

        if urls_file is None:
            raise FileNotFoundError(
                "No urls.py found in the uploaded ZIP file."
            )

        with zf.open(urls_file) as f:
            urls_content = f.read().decode('utf-8')

    try:
        tree = ast.parse(urls_content)
    except SyntaxError as e:
        raise SyntaxError(f"urls.py contains invalid Python syntax: {e}")

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue

        func = node.func
        func_name = None

        if isinstance(func, ast.Name):
            func_name = func.id
        elif isinstance(func, ast.Attribute):
            func_name = func.attr

        if func_name not in ('path', 're_path', 'url'):
            continue

        route = _parse_path_call(node)
        if route:
            routes.append(route)

    return RepositoryIR(repo_id=str(repo_id), routes=routes)