from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
 
from apps.uploader.models import UploadedRepository
from apps.parser.services.relationship_extractor import extract_schema_from_zip
from apps.oracle_sql.index_advisor import recommend_indexes
from apps.oracle_sql.compat_scorer import compute_compatibility_score
from apps.oracle_ai.advisor import get_schema_advisory
 
 
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_review(request, repo_id):
    '''
    GET /api/v1/oracle-ai/review/<repo_id>/
    Returns Oracle AI advisory for the schema.
    '''
    try:
        repo = UploadedRepository.objects.get(id=repo_id)
    except UploadedRepository.DoesNotExist:
        return Response({'error': 'Repository not found'}, status=status.HTTP_404_NOT_FOUND)
 
    zip_path = repo.zip_file.path
    schema_ir = extract_schema_from_zip(zip_path=zip_path, repo_id=str(repo_id))
    recommend_indexes(schema_ir)
    schema_ir.compatibility_score = compute_compatibility_score(schema_ir)
 
    advisory = get_schema_advisory(schema_ir)
    return Response(advisory)