# apps/uploader/views.py

import uuid

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser

from .serializers import (
    RepositoryUploadRequestSerializer,
    UploadedRepositorySerializer
)
from .services.upload_service import save_uploaded_repository


class RepositoryUploadView(APIView):
    """
    POST /api/v1/upload/
    
    Accepts a ZIP file, validates it, saves it, returns a repo_id.
    
    Why APIView instead of a generic view?
    Generic views (ListCreateAPIView etc.) are great for standard CRUD.
    But our upload has custom logic (ZIP validation, service call) that
    is cleaner in a plain APIView where we control every step explicitly.
    This also makes it easier to teach — you can see exactly what happens.
    """

    # Tell DRF this view accepts multipart form data (file uploads)
    # Without these parsers, request.FILES will be empty
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        """
        Handle the ZIP upload.
        
        Flow:
        1. Validate incoming request with RepositoryUploadRequestSerializer
        2. Call service to save the file + create DB record
        3. Serialize the created record for the response
        4. Return 201 Created with repo_id and status
        """

        # Step 1: Validate the incoming request
        # request.FILES contains uploaded files
        # request.data contains form fields
        request_serializer = RepositoryUploadRequestSerializer(
            data=request.FILES
        )

        if not request_serializer.is_valid():
            # Return 400 Bad Request with validation errors
            return Response(
                {
                    'success': False,
                    'errors': request_serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Step 2: Call service to save the file and create DB record
        # validated_data['zip_file'] is the clean, validated file object
        try:
            repo = save_uploaded_repository(
                zip_file=request_serializer.validated_data['zip_file']
            )
        except Exception as e:
            return Response(
                {
                    'success': False,
                    'errors': {'detail': str(e)}
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Step 3: Serialize the created record for the response
        response_serializer = UploadedRepositorySerializer(repo)

        # Step 4: Return 201 Created
        # 201 means "resource was created" — more precise than 200 OK
        return Response(
            {
                'success': True,
                'message': 'Repository uploaded successfully. Ready for parsing.',
                'data': response_serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    

from .services.pipeline_service import run_pipeline
from django.shortcuts import get_object_or_404

class RepositoryParseView(APIView):
    """
    POST /api/v1/parse/<repo_id>/
    
    Triggers the full pipeline for an uploaded repository.
    Parser → IR → Generator → Validator
    """

    def post(self, request, repo_id):
        try:
            result = run_pipeline(str(repo_id))
        except ValueError as e:
            return Response(
                {'success': False, 'errors': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'success': False, 'errors': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {'success': True, 'data': result},
            status=status.HTTP_200_OK
        )

import zipfile
import io
from django.http import HttpResponse
from .models import UploadedRepository, GeneratedOutput

class DownloadOutputView(APIView):
    def get(self, request, repo_id):
        try:
            repo   = UploadedRepository.objects.get(id=repo_id)
            output = GeneratedOutput.objects.get(repository=repo)
        except (UploadedRepository.DoesNotExist, GeneratedOutput.DoesNotExist):
            return Response({'error': 'Output not found. Run the pipeline first.'}, status=404)

        # Build ZIP in memory
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            files = {
                'app.js':              output.app_js,
                'routes/index.js':     output.routes,
                'models/index.js':     output.models_js,
                'middleware/index.js': output.middleware,
                'database.js':         output.database_js,
                'package.json':        output.package_json,
                '.env.example':        output.env_example,
            }
            for filename, content in files.items():
                if content:
                    zf.writestr(filename, content)

        buffer.seek(0)
        repo_name = repo.original_filename.replace('.zip', '')
        response = HttpResponse(buffer.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{repo_name}-express.zip"'
        return response


class MigrationHistoryView(APIView):
    def get(self, request):
        from apps.validator.models import MigrationExperiment
        from apps.validator.serializers import MigrationExperimentSerializer
        repos = UploadedRepository.objects.prefetch_related('experiments').order_by('-created_at')
        data = []
        for repo in repos:
            experiments = list(MigrationExperiment.objects.filter(repository=repo).order_by('-created_at').values())
            data.append({
                'id':                str(repo.id),
                'original_filename': repo.original_filename,
                'status':            repo.status,
                'created_at':        repo.created_at.isoformat(),
                'updated_at':        repo.updated_at.isoformat(),
                'experiments':       experiments,
            })
        return Response(data)

class MigrationDeleteView(APIView):
    def delete(self, request, repo_id):
        repo = get_object_or_404(UploadedRepository, id=repo_id)
        repo.delete()
        return Response({'message': 'Deleted'}, status=204)