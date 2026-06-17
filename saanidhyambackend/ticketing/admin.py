from django.contrib import admin
from .models import Ticket, TicketNote


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'beneficiary', 'user_name', 'phone', 'email',
        'user_city', 'user_state', 'status', 'payment_status',
        'payment_amount', 'assigned_to', 'created_at'
    )
    list_filter = ('status', 'payment_status', 'beneficiary', 'user_state', 'created_at')
    search_fields = ('user_name', 'phone', 'email', 'user_city', 'user_pincode', 'relative_name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)

    fieldsets = (
        ('Requester Info', {
            'fields': ('beneficiary', 'user_name', 'age', 'phone', 'email',
                       'user_country', 'user_country_other', 'user_area',
                       'user_city', 'user_district', 'user_state', 'user_pincode')
        }),
        ('Beneficiary Info (non-Myself)', {
            'fields': ('father_age', 'mother_age', 'relation_type', 'relative_name', 'relative_age',
                       'client_country', 'client_country_other', 'client_area',
                       'client_city', 'client_district', 'client_state', 'client_pincode'),
            'classes': ('collapse',),
        }),
        ('Clinical & Requirements', {
            'fields': ('client_condition', 'client_condition_details', 'service_types',
                       'budget_min', 'budget_max', 'preferred_locations', 'notes')
        }),
        ('Workflow', {
            'fields': ('status', 'assigned_to', 'created_by', 'created_at', 'updated_at')
        }),
        ('Payment', {
            'fields': ('payment_status', 'payment_amount', 'payment_link',
                       'payment_link_id', 'razorpay_payment_id')
        }),
    )


@admin.register(TicketNote)
class TicketNoteAdmin(admin.ModelAdmin):
    list_display = ('id', 'ticket', 'user', 'content', 'created_at')
    list_filter = ('created_at', 'user')
    search_fields = ('content', 'ticket__user_name', 'user__username')