from django.contrib import admin
from .models import OldAgeHome, UploadJob


@admin.register(OldAgeHome)
class OldAgeHomeAdmin(admin.ModelAdmin): 
    list_display = ['organisation_name', 'state', 'district', 'costing_type', 'call_verification']
    list_filter = ['state', 'services_type', 'costing_type', 'gender', 'care_type']
    search_fields = ['organisation_name', 'address', 'state', 'district']
    readonly_fields = ['created_at', 'updated_at', 'data_hash']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('serial_number', 'organisation_name', 'services_type')
        }),
        ('Location', {
            'fields': ('state', 'district', 'city_town_mandal', 'po_locality_village', 
                      'address', 'pincode', 'latitude', 'longitude', 'map_location')
        }),
        ('Costing', {
            'fields': ('costing_type', 'monthly_charges_minimum', 'monthly_charges_maximum')
        }),
        ('Demographics', {
            'fields': ('gender', 'care_type')
        }),
        ('Contact', {
            'fields': ('contact_number', 'email', 'website')
        }),
        ('Verification', {
            'fields': ('call_verification', 'notes')
        }),
        ('Metadata', {
            'fields': ('data_hash', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UploadJob)
class UploadJobAdmin(admin.ModelAdmin):
    list_display = ['id', 'status', 'processed_rows', 'total_rows', 'progress_display', 'created_at']
    list_filter = ['status', 'created_at']
    readonly_fields = [
        'status', 'total_rows', 'processed_rows', 'current_chunk', 
        'total_chunks', 'inserted_count', 'updated_count', 'skipped_count',
        'error_count', 'error_log', 'started_at', 'completed_at'
    ]
    
    def progress_display(self, obj):
        if obj.total_rows > 0:
            percentage = (obj.processed_rows / obj.total_rows) * 100
            return f"{percentage:.1f}%"
        return "0%"
    progress_display.short_description = 'Progress'
