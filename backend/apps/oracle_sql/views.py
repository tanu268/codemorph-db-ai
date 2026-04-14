from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
 
from apps.uploader.models import UploadedRepository
from apps.parser.services.relationship_extractor import extract_schema_from_zip
from apps.oracle_sql.ddl_gen import generate_oracle_ddl
from apps.oracle_sql.index_advisor import recommend_indexes
from apps.oracle_sql.compat_scorer import compute_compatibility_score
 
 
def _get_schema(repo_id: str):
    """Helper: load repo, extract SchemaIR, run advisor + scorer."""
    try:
        repo = UploadedRepository.objects.get(id=repo_id)
    except UploadedRepository.DoesNotExist:
        return None, None
 
    zip_path = repo.zip_file.path
    schema_ir = extract_schema_from_zip(zip_path=zip_path, repo_id=str(repo_id))
    recommend_indexes(schema_ir)
    schema_ir.compatibility_score = compute_compatibility_score(schema_ir)
    return repo, schema_ir
 
 
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analyze_schema(request, repo_id):
    """
    GET /api/v1/oracle/analyze/<repo_id>/
 
    Returns full SchemaIR as JSON — used by Schema Insights page and
    the D3 relationship visualizer.
    """
    repo, schema_ir = _get_schema(repo_id)
    if repo is None:
        return Response({'error': 'Repository not found'}, status=status.HTTP_404_NOT_FOUND)
 
    return Response({
        'repo_id': str(repo_id),
        'schema': schema_ir.to_dict(),
    })
 
 
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ddl(request, repo_id):
    """
    GET /api/v1/oracle/ddl/<repo_id>/
 
    Returns generated Oracle DDL as plain text string.
    Used by the SQL Preview page.
    """
    repo, schema_ir = _get_schema(repo_id)
    if repo is None:
        return Response({'error': 'Repository not found'}, status=status.HTTP_404_NOT_FOUND)
 
    ddl = generate_oracle_ddl(schema_ir)
    return Response({
        'repo_id': str(repo_id),
        'ddl': ddl,
        'table_count': len(schema_ir.tables),
        'warnings': schema_ir.warnings,
        'compatibility_score': schema_ir.compatibility_score,
    })
 
 
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_sql_zip(request, repo_id):
    """
    GET /api/v1/oracle/export/<repo_id>/
 
    Streams a ZIP file containing:
      - oracle_ddl.sql
      - index_recommendations.sql
      - migration_notes.md
    """
    import zipfile
    import io
 
    repo, schema_ir = _get_schema(repo_id)
    if repo is None:
        return Response({'error': 'Repository not found'}, status=status.HTTP_404_NOT_FOUND)
 
    ddl = generate_oracle_ddl(schema_ir)
 
    # Build index SQL separately
    index_lines = ['-- Oracle Index Recommendations by CodeMorph DB-AI', '']
    for table in schema_ir.tables:
        for idx in table.indexes:
            unique = 'UNIQUE ' if idx.is_unique else ''
            index_lines.append(f'-- {idx.reason}')
            index_lines.append(
                f'CREATE {unique}INDEX {idx.index_name} ON '
                f'{idx.table_name.upper()}({idx.column_name.upper()});'
            )
            index_lines.append('')
    index_sql = '\n'.join(index_lines)
 
    # Migration notes markdown
    notes = ['# Migration Notes — CodeMorph DB-AI', '',
             f'**Tables:** {len(schema_ir.tables)}',
             f'**Relationships:** {len(schema_ir.relationship_edges)}',
             f'**Compatibility Score:** {schema_ir.compatibility_score}/100',
             '', '## Warnings', '']
    for w in schema_ir.warnings:
        notes.append(f'- {w}')
    notes_md = '\n'.join(notes)
 
    # Pack into ZIP in memory
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('oracle_ddl.sql', ddl)
        zf.writestr('index_recommendations.sql', index_sql)
        zf.writestr('migration_notes.md', notes_md)
    buffer.seek(0)
 
    response = HttpResponse(buffer.read(), content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="oracle_migration_{repo_id}.zip"'
    return response
 