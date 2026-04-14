from django.db import models
from apps.uploader.models import UploadedRepository


class MigrationExperiment(models.Model):
    """
    One full measurable migration run.
    Every repo can have multiple experiments.
    """

    repository = models.ForeignKey(
        UploadedRepository,
        on_delete=models.CASCADE,
        related_name="experiments"
    )

    experiment_name = models.CharField(max_length=100)

    parser_version = models.CharField(max_length=50, default="v1")
    generator_version = models.CharField(max_length=50, default="v1")
    validator_version = models.CharField(max_length=50, default="v1")

    total_routes_found = models.IntegerField(default=0)
    routes_converted = models.IntegerField(default=0)
    validation_passed = models.IntegerField(default=0)

    conversion_accuracy = models.FloatField(default=0.0)
    total_execution_ms = models.FloatField(default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.experiment_name} - {self.repository.id}"