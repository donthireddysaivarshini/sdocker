from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OldAgeHomeViewSet, UploadJobViewSet, export_homes_pdf

router = DefaultRouter()
router.register(r'homes', OldAgeHomeViewSet, basename='home')
router.register(r'uploads', UploadJobViewSet, basename='upload')

urlpatterns = [
    path('', include(router.urls)),
    path('export/pdf/', export_homes_pdf, name='export-pdf'),
]
