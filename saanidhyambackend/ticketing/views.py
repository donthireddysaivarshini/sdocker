import razorpay
import json
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status, viewsets, permissions, filters
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Ticket, TicketNote
from .serializers import TicketSerializer, NoteSerializer, UserSerializer, CustomTokenObtainPairSerializer


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.select_related('created_by', 'assigned_to').all().order_by('-created_at')
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_status', 'beneficiary', 'assigned_to']
    search_fields = ['user_name', 'phone', 'email', 'user_city', 'user_state', 'user_pincode', 'relative_name']
    ordering_fields = ['created_at', 'updated_at', 'budget_min']

    def perform_create(self, serializer):
        """
        Handles both creation paths:
        - Manual (from ticketing UI): request.user is authenticated → set as created_by.
        - Automatic (from Next.js /api/save-lead): writes directly to DB via pool,
          so this method is NOT called for auto-created tickets.
          If you ever route auto-creation through the API instead, pass
          `created_by=None` explicitly and it will still work.
        """
        ticket = serializer.save(created_by=self.request.user)

        # Auto-create a system note so agents can see this was a manual entry
        TicketNote.objects.create(
            ticket=ticket,
            user=self.request.user,
            content=f"✏️ Ticket created manually by {self.request.user.get_full_name() or self.request.user.username}."
        )

    @action(detail=True, methods=['post'])
    def generate_payment_link(self, request, pk=None):
        ticket = self.get_object()
        amount = request.data.get('amount')

        if not amount:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

            clean_phone = str(ticket.phone).replace(" ", "").replace("-", "")
            if not clean_phone.startswith('+'):
                clean_phone = f'+91{clean_phone}'

            custom_description = f"Saanidhyam - Service Request #{ticket.id} for {ticket.user_name}"

            payment_data = {
                "amount": int(float(amount) * 100),
                "currency": "INR",
                "accept_partial": False,
                "description": custom_description,
                "customer": {
                    "contact": clean_phone,
                    "email": ticket.email or "customer@example.com",
                    "name": ticket.user_name,
                },
                "notify": {"sms": True, "email": True},
                "reminder_enable": True,
            }

            response = client.payment_link.create(payment_data)

            ticket.payment_amount = amount
            ticket.payment_link = response['short_url']
            ticket.payment_link_id = response['id']
            ticket.status = 'PAYMENT_PENDING'
            ticket.save()

            TicketNote.objects.create(
                ticket=ticket,
                user=request.user,
                content=f"Payment link generated for ₹{amount}. Link: {response['short_url']}"
            )

            return Response({
                'payment_link': ticket.payment_link,
                'payment_amount': str(ticket.payment_amount),
                'status': 'success'
            })

        except Exception as e:
            print(f"Razorpay Error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Manual override to mark payment as received/verified."""
        ticket = self.get_object()
        ticket.payment_status = 'RECEIVED'
        ticket.status = 'PAYMENT_VERIFIED'
        ticket.save()

        TicketNote.objects.create(
            ticket=ticket,
            user=request.user,
            content=f"Payment manually marked as verified by {request.user.get_full_name() or request.user.username}."
        )

        serializer = self.get_serializer(ticket)
        return Response(serializer.data)


class NoteViewSet(viewsets.ModelViewSet):
    queryset = TicketNote.objects.select_related('user').all().order_by('created_at')
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        ticket_id = self.request.query_params.get('ticket') or self.request.query_params.get('ticket_id')
        if ticket_id:
            return self.queryset.filter(ticket_id=ticket_id)
        return self.queryset


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@csrf_exempt
def razorpay_webhook(request):
    if request.method == "POST":
        webhook_signature = request.headers.get('X-Razorpay-Signature')
        if not webhook_signature:
            return HttpResponse(status=400)
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            client.utility.verify_webhook_signature(
                request.body.decode('utf-8'),
                webhook_signature,
                settings.RAZORPAY_WEBHOOK_SECRET
            )
            payload = json.loads(request.body)
            event_type = payload.get('event')

            if event_type == 'payment_link.paid':
                payment_link_entity = payload['payload']['payment_link']['entity']
                plink_id = payment_link_entity['id']
                try:
                    ticket = Ticket.objects.get(payment_link_id=plink_id)
                    admin_user = ticket.created_by or User.objects.filter(is_superuser=True).first()
                    TicketNote.objects.create(
                        ticket=ticket,
                        user=admin_user,
                        content=f"⚠️ SYSTEM ALERT: Payment received for link {plink_id}. Please verify funds in Razorpay dashboard and click 'Mark Paid' to confirm."
                    )
                except Ticket.DoesNotExist:
                    pass

            return HttpResponse(status=200)
        except Exception as e:
            print(f"Webhook Error: {str(e)}")
            return HttpResponse(status=400)
    return HttpResponse(status=405)