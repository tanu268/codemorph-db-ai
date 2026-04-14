from apps.validator.models import MigrationExperiment
from apps.uploader.models import UploadedRepository


def log_pipeline_metrics(
    repo_id,
    total_routes,
    converted,
    passed,
    execution_ms,
    experiment_name="auto-baseline",
    parser_version="v1",
    generator_version="v1",
    validator_version="v1",
):
    """
    Automatically create experiment metrics from pipeline stages.
    """

    repository = UploadedRepository.objects.get(id=repo_id)

    accuracy = 0
    if total_routes > 0:
        accuracy = (converted / total_routes) * 100

    return MigrationExperiment.objects.create(
        repository=repository,
        experiment_name=experiment_name,
        parser_version=parser_version,
        generator_version=generator_version,
        validator_version=validator_version,
        total_routes_found=total_routes,
        routes_converted=converted,
        validation_passed=passed,
        conversion_accuracy=accuracy,
        total_execution_ms=execution_ms,
    )

import time
from apps.validator.services.metrics_service import log_pipeline_metrics