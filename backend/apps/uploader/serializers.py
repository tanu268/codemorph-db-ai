# apps/uploader/serializers.py

from rest_framework import serializers
from .models import UploadedRepository


class UploadedRepositorySerializer(serializers.ModelSerializer):
    """
    Serializer for the UploadedRepository model.
    
    A serializer does two things:
    1. INBOUND: validates incoming request data (is this really a ZIP?)
    2. OUTBOUND: converts model instances to JSON for API responses
    
    Think of it as the contract between HTTP and your database model.
    """

    class Meta:
        model = UploadedRepository
        # Fields we expose in the API response
        fields = ['id', 'original_filename', 'status', 'created_at']
        # id and status are set by the server, never by the client
        read_only_fields = ['id', 'status', 'created_at']


class RepositoryUploadRequestSerializer(serializers.Serializer):
    """
    Separate serializer just for validating the incoming upload request.
    
    Why separate from UploadedRepositorySerializer?
    Because the request shape (zip_file field) is different from
    the response shape (id, status, created_at).
    Mixing them causes confusion and tight coupling.
    """

    zip_file = serializers.FileField(
        help_text="A valid .zip file containing a Django project"
    )

    def validate_zip_file(self, value):
        """
        Custom field-level validator.
        Django REST Framework calls validate_<fieldname>() automatically.
        
        We check two things:
        1. File extension must be .zip
        2. File must start with the ZIP magic bytes (PK\x03\x04)
           — this prevents someone renaming 'malware.exe' to 'project.zip'
        """
        # Check extension
        if not value.name.endswith('.zip'):
            raise serializers.ValidationError(
                "Only .zip files are accepted."
            )

        # Check ZIP magic bytes — first 4 bytes of every valid ZIP file
        # are PK\x03\x04 (the ZIP format signature)
        header = value.read(4)
        value.seek(0)  # Reset file pointer after reading

        if header != b'PK\x03\x04':
            raise serializers.ValidationError(
                "File does not appear to be a valid ZIP archive."
            )

        return value