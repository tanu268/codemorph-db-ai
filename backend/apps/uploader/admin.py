# apps/uploader/admin.py

from django.contrib import admin
from .models import UploadedRepository


@admin.register(UploadedRepository)
class UploadedRepositoryAdmin(admin.ModelAdmin):
    """
    Register our model with Django admin.
    This lets us inspect uploaded repositories visually during development.
    """
    list_display = ['id', 'original_filename', 'status', 'created_at']
    list_filter = ['status']
    readonly_fields = ['id', 'created_at', 'updated_at']