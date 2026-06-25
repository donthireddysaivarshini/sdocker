from django.db import models
from django.contrib.auth.models import User

class Ticket(models.Model):
    STATUS_CHOICES = [
        ('NEW', 'New'),
        ('CALLBACK_REQUIRED', 'Callback Required'),
        ('IN_PROGRESS', 'In Progress'),
        ('PAYMENT_PENDING', 'Payment Pending'),
        ('PAYMENT_VERIFIED', 'Payment Verified'),
        ('SENT_TO_CLIENT', 'Sent to Client'),
        ('FOLLOW_UP', 'Follow Up'),
        ('CLOSED', 'Closed'),
    ]

    # --- MAPPED TO SQL COLUMNS ---
    beneficiary = models.CharField(max_length=50, blank=True)
    user_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, db_column='user_phone')       # Correct Mapping
    email = models.EmailField(blank=True, null=True, db_column='user_email') # Correct Mapping
    age = models.IntegerField(null=True, blank=True, db_column='user_age')   # Correct Mapping
    gender = models.CharField(max_length=20, blank=True, null=True)
    alternate_phone = models.CharField(max_length=50, blank=True, null=True) 
    # User Address (Sender)
    user_country = models.CharField(max_length=100, default='India')
    user_country_other = models.CharField(max_length=100, null=True, blank=True)
    user_state = models.CharField(max_length=100, blank=True)
    user_district = models.CharField(max_length=100, blank=True)
    user_city = models.CharField(max_length=100, blank=True)
    user_area = models.TextField(blank=True)
    user_pincode = models.CharField(max_length=20, blank=True)
    
    # Specific Beneficiary Info
    father_age = models.IntegerField(null=True, blank=True)
    mother_age = models.IntegerField(null=True, blank=True)
    relation_type = models.CharField(max_length=100, blank=True)
    relative_name = models.CharField(max_length=255, blank=True)
    relative_age = models.IntegerField(null=True, blank=True)

    # Beneficiary Address
    client_country = models.CharField(max_length=100, default='India')
    client_country_other = models.CharField(max_length=100, null=True, blank=True)
    client_pincode = models.CharField(max_length=20, blank=True)
    client_state = models.CharField(max_length=100, blank=True)
    client_city = models.CharField(max_length=100, blank=True)
    client_district = models.CharField(max_length=100, blank=True)
    client_area = models.TextField(blank=True)
    
    # Health & Requirements
    # Note: Using health_condition from your SQL
    client_condition = models.CharField(max_length=255, blank=True, db_column='health_condition')
    
    client_condition_details = models.TextField(blank=True, null=True, db_column='health_condition_details')
    service_types = models.JSONField(default=list, blank=True)
    budget_min = models.IntegerField(null=True, blank=True)
    budget_max = models.IntegerField(null=True, blank=True)
    preferred_locations = models.JSONField(default=list, blank=True) 
    
    notes = models.TextField(blank=True, null=True)
    
    # Status & Payment
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='NEW')
    payment_status = models.CharField(max_length=50, default='PENDING')
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payment_link = models.URLField(max_length=500, blank=True, null=True)
    payment_link_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)

    # Links - Note: null=True allows importing existing leads without a user
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tickets', null=True, blank=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'saanidhyam_leads'
        managed = True


class TicketNote(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='history_notes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    # Payment fields REMOVED from here