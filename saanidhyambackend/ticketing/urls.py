from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TicketViewSet, 
    UserViewSet, 
    NoteViewSet, 
    CustomTokenObtainPairView,
    razorpay_webhook # <--- Import the new view
)

router = DefaultRouter()
router.register(r'tickets', TicketViewSet)
router.register(r'notes', NoteViewSet)
router.register(r'users', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    # --- Add this line for the Webhook ---
    path('webhooks/razorpay/', razorpay_webhook, name='razorpay_webhook'),
]