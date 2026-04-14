from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse


@api_view(['GET'])
def api_root(request):
    return Response({
        'upload_repository': reverse('repository-upload', request=request),
        'converter': 'POST /api/v1/converter/convert/',
        'admin': reverse('admin:index', request=request),
        'version': '1.0.0',
        'description': 'CodeMorph — Django to Express.js migration API',
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/uploader/', include('apps.uploader.urls')),
    path('api/v1/validator/', include('apps.validator.urls')),
    path('api/v1/converter/', include('apps.converter.urls')),
    path('', api_root, name='api-root'),
    path('api/v1/auth/', include('apps.auth_app.urls')),
    path('api/v1/oracle/',    include('apps.oracle_sql.urls')),
    path('api/v1/oracle-ai/', include('apps.oracle_ai.urls')),
]