from django.urls import path
from .views import RepositoryUploadView, RepositoryParseView, DownloadOutputView, MigrationHistoryView, MigrationDeleteView


urlpatterns = [
    path('upload/', RepositoryUploadView.as_view(), name='repository-upload'),
    path('parse/<uuid:repo_id>/', RepositoryParseView.as_view(), name='repository-parse'),
    path('download/<uuid:repo_id>/',   DownloadOutputView.as_view(),   name='repository-download'),
    path('history/',                 MigrationHistoryView.as_view()),
    path('history/<uuid:repo_id>/',  MigrationDeleteView.as_view()),
]