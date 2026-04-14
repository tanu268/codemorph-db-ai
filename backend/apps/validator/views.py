from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.uploader.models import UploadedRepository
from .models import MigrationExperiment
from .serializers import MigrationExperimentSerializer


class MigrationMetricsView(APIView):
    """
    POST /api/v1/metrics/<repo_id>/
    """

    def post(self, request, repo_id):
        try:
            repository = UploadedRepository.objects.get(id=repo_id)
        except UploadedRepository.DoesNotExist:
            return Response(
                {"error": "Repository not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        total_routes = request.data.get("total_routes_found", 0)
        converted = request.data.get("routes_converted", 0)
        passed = request.data.get("validation_passed", 0)
        execution_ms = request.data.get("total_execution_ms", 0)

        accuracy = 0
        if total_routes > 0:
            accuracy = (converted / total_routes) * 100

        experiment = MigrationExperiment.objects.create(
            repository=repository,
            experiment_name=request.data.get("experiment_name", "baseline-run"),
            parser_version=request.data.get("parser_version", "v1"),
            generator_version=request.data.get("generator_version", "v1"),
            validator_version=request.data.get("validator_version", "v1"),
            total_routes_found=total_routes,
            routes_converted=converted,
            validation_passed=passed,
            conversion_accuracy=accuracy,
            total_execution_ms=execution_ms,
        )

        serializer = MigrationExperimentSerializer(experiment)

        return Response(
            {
                "success": True,
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )