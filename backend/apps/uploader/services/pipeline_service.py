# apps/uploader/services/pipeline_service.py

import time
from apps.validator.services.metrics_service import log_pipeline_metrics
from apps.uploader.models import UploadedRepository, GeneratedOutput
from apps.parser.services.url_parser import parse_urls_from_zip
from apps.parser.services.model_parser import parse_models_from_zip
from apps.parser.services.settings_parser import parse_settings_from_zip
from apps.parser.services.relationship_extractor import extract_schema_from_zip  # ← NEW
from apps.oracle_sql.index_advisor import recommend_indexes                       # ← NEW
from apps.oracle_sql.compat_scorer import compute_compatibility_score             # ← NEW
from apps.generator.services.express_generator import generate_express_routes
from apps.generator.services.sequelize_generator import generate_sequelize_models
from apps.generator.services.middleware_generator import generate_express_middleware
from apps.generator.services.project_generator import (
    generate_package_json, generate_app_js, generate_database_js, generate_env_example,
)
from apps.validator.services.route_validator import (
    validate_repository_ir, validate_models_ir, validate_middleware_ir,
)


def run_pipeline(repo_id: str) -> dict:
    start_time = time.perf_counter()

    try:
        repo = UploadedRepository.objects.get(id=repo_id)
    except UploadedRepository.DoesNotExist:
        raise ValueError(f"Repository {repo_id} not found.")

    repo.status = UploadedRepository.Status.PARSING
    repo.save()

    try:
        zip_path = repo.zip_file.path

        # ── Parse ─────────────────────────────────────────────
        repo_ir = parse_urls_from_zip(zip_path=zip_path, repo_id=str(repo.id))
        repo_ir.models = parse_models_from_zip(zip_path=zip_path)
        middleware_list, auth_list, project_config = parse_settings_from_zip(zip_path=zip_path)
        repo_ir.middleware = middleware_list
        repo_ir.auth = auth_list
        repo_ir.project_config = project_config

        # ── Oracle Schema IR ──────────────────────────────────  ← NEW BLOCK
        schema_ir = extract_schema_from_zip(zip_path=zip_path, repo_id=str(repo.id))
        recommend_indexes(schema_ir)
        schema_ir.compatibility_score = compute_compatibility_score(schema_ir)
        repo_ir.schema_ir = schema_ir

        # ── Generate ──────────────────────────────────────────
        generated_routes     = generate_express_routes(repo_ir)
        generated_models     = generate_sequelize_models(repo_ir)
        generated_middleware = generate_express_middleware(repo_ir)
        generated_package    = generate_package_json(repo_ir)
        generated_app_js     = generate_app_js(repo_ir)
        generated_db_js      = generate_database_js(repo_ir)
        generated_env        = generate_env_example(repo_ir)

        # ── Validate ──────────────────────────────────────────
        route_validation      = validate_repository_ir(repo_ir)
        model_validation      = validate_models_ir(repo_ir)
        middleware_validation = validate_middleware_ir(repo_ir)

        # ── Metrics ───────────────────────────────────────────
        total_routes     = len(repo_ir.routes)
        routes_converted = len(repo_ir.routes)
        validation_passed = sum([
            1 if route_validation.get("is_valid") else 0,
            1 if model_validation.get("is_valid") else 0,
            1 if middleware_validation.get("is_valid") else 0,
        ])
        execution_ms = (time.perf_counter() - start_time) * 1000

        log_pipeline_metrics(
            repo_id=str(repo.id),
            total_routes=total_routes,
            converted=routes_converted,
            passed=validation_passed,
            execution_ms=execution_ms,
            experiment_name="pipeline-auto-v1",
            parser_version="v4",
            generator_version="v4",
            validator_version="v4",
        )

        # ── Save generated files to DB ────────────────────────
        GeneratedOutput.objects.update_or_create(
            repository=repo,
            defaults={
                'app_js':       generated_app_js,
                'routes':       generated_routes,
                'models_js':    generated_models,
                'middleware':   generated_middleware,
                'database_js':  generated_db_js,
                'package_json': generated_package,
                'env_example':  generated_env,
            }
        )

        # ── Complete ──────────────────────────────────────────
        repo.status = UploadedRepository.Status.COMPLETED
        repo.save()

        return {
            "repo_id": str(repo.id),
            "status": repo.status,
            "ir": repo_ir.to_dict(),
            "generated_code": {
                "routes":       generated_routes,
                "models":       generated_models,
                "middleware":   generated_middleware,
                "package_json": generated_package,
                "app_js":       generated_app_js,
                "database_js":  generated_db_js,
                "env_example":  generated_env,
            },
            "validation": {
                "routes":     route_validation,
                "models":     model_validation,
                "middleware": middleware_validation,
            },
            "metrics": {
                "total_routes":        total_routes,
                "routes_converted":    routes_converted,
                "validation_passed":   validation_passed,
                "execution_ms":        execution_ms,
                "ir_route_nodes":      len(repo_ir.routes),
                "ir_model_nodes":      len(repo_ir.models),
                "generated_route_loc": len(generated_routes.splitlines()),
            }
        }

    except Exception as e:
        repo.status = UploadedRepository.Status.FAILED
        repo.save()
        raise e