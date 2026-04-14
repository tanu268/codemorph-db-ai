from django.urls import path
from . import views
 
urlpatterns = [
    path('analyze/<str:repo_id>/', views.analyze_schema, name='oracle-analyze'),
    path('ddl/<str:repo_id>/',     views.get_ddl,        name='oracle-ddl'),
    path('export/<str:repo_id>/',  views.export_sql_zip, name='oracle-export'),
]