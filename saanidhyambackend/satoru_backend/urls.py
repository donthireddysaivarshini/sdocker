from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

# --- IMPORT YOUR NEW VIEW ---
from ticketing.views import CustomTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    path('api/', include('homes.urls')),
    path('api/', include('ticketing.urls')),
    
    # --- UPDATE THESE PATHS TO USE YOUR NEW VIEW ---
    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'), 
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair_alt'), 
    
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)