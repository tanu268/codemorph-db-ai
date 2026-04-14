from django.urls import path
from .views import ConvertCodeView

urlpatterns = [
    path("convert/", ConvertCodeView.as_view(), name="convert-code"),
]