from django.urls import path
from .views import MigrationMetricsView

urlpatterns = [
    path(
        "metrics/<uuid:repo_id>/",
        MigrationMetricsView.as_view(),
        name="migration-metrics"
    ),
]