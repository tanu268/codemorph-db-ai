# apps/uploader/services/upload_service.py

from ..models import UploadedRepository


def save_uploaded_repository(zip_file) -> UploadedRepository:
    """
    Service function — handles the business logic of saving an upload.
    
    Why a service function instead of putting this in the view?
    
    Views should only handle HTTP — reading requests, returning responses.
    Business logic (creating records, calling other systems) belongs in
    services. This way you can call save_uploaded_repository() from:
    - A view (HTTP request)
    - A management command (CLI)
    - A test (without HTTP at all)
    
    This is the Single Responsibility Principle in practice.
    
    Args:
        zip_file: The validated file object from the request
        
    Returns:
        UploadedRepository: The newly created database record
    """

    # Create the database record
    # Django's FileField automatically saves the file to disk
    # using the upload_to_path() function we defined in models.py
    repo = UploadedRepository(
        original_filename=zip_file.name,
        zip_file=zip_file,
    )

    # full_clean() runs all model-level validators before saving
    # This is a safety net — the serializer already validated,
    # but defense in depth is good practice
    repo.full_clean()
    repo.save()

    return repo