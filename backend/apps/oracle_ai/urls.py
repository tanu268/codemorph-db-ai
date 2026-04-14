# apps/oracle_ai/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('review/<str:repo_id>/', views.ai_review, name='oracle-ai-review'),
]