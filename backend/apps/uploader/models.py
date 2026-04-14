# apps/uploader/models.py

import uuid
from django.db import models


def upload_to_path(instance, filename):
    """
    Generates a unique storage path for each uploaded ZIP.
    
    Why uuid4? Because two users might upload 'project.zip' at the same time.
    Without unique paths, they'd overwrite each other.
    
    Result: uploads/repos/abc123-def456.../project.zip
    """
    return f"repos/{instance.id}/{filename}"


class UploadedRepository(models.Model):
    """
    Represents one migration job — one uploaded Django repository.
    
    Every stage of the pipeline (parser, IR, generator, validator)
    references this model via its id (repo_id).
    """

    class Status(models.TextChoices):
        """
        Pipeline status — tracks where this repo is in the migration process.
        TextChoices gives us both the DB value and a human-readable label.
        
        UPLOADED   → file received, not yet parsed
        PARSING    → parser is running
        PARSED     → parser finished, IR ready
        GENERATING → generator is running
        COMPLETED  → Express.js code generated
        FAILED     → something went wrong
        """
        UPLOADED   = 'uploaded',   'Uploaded'
        PARSING    = 'parsing',    'Parsing'
        PARSED     = 'parsed',     'Parsed'
        GENERATING = 'generating', 'Generating'
        COMPLETED  = 'completed',  'Completed'
        FAILED     = 'failed',     'Failed'

    # UUIDField as primary key — globally unique, safe to expose in API responses
    # This becomes the repo_id that flows through the whole pipeline
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # Original filename — so we remember what the user uploaded
    original_filename = models.CharField(max_length=255)

    # FileField stores the file and saves its path in the database
    # upload_to_path() function determines where it goes on disk
    zip_file = models.FileField(upload_to=upload_to_path)

    # Current pipeline status — starts as UPLOADED
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UPLOADED
    )

    # Timestamps — auto_now_add sets once on creation, auto_now updates on every save
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Most recent uploads appear first in querysets
        ordering = ['-created_at']
        verbose_name = 'Uploaded Repository'
        verbose_name_plural = 'Uploaded Repositories'

    def __str__(self):
        return f"{self.original_filename} ({self.status})"


class GeneratedOutput(models.Model):
    """Stores the generated Express.js files for a migration."""
    repository = models.OneToOneField(
        UploadedRepository,
        on_delete=models.CASCADE,
        related_name='output'
    )
    app_js          = models.TextField(blank=True)
    routes          = models.TextField(blank=True)
    models_js       = models.TextField(blank=True)
    middleware      = models.TextField(blank=True)
    database_js     = models.TextField(blank=True)
    package_json    = models.TextField(blank=True)
    env_example     = models.TextField(blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Output for {self.repository.original_filename}"