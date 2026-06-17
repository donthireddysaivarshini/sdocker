from rest_framework import serializers
from .models import OldAgeHome, UploadJob


class OldAgeHomeSerializer(serializers.ModelSerializer):
    """Serializer for OldAgeHome model"""
    
    class Meta:
        model = OldAgeHome
        fields = '__all__'
        read_only_fields = ['data_hash', 'created_at', 'updated_at']


class UploadJobSerializer(serializers.ModelSerializer):
    """Serializer for Uploading exccel file """
    
    progress_percentage = serializers.ReadOnlyField()
    
    class Meta:
        model = UploadJob
        fields = '__all__'
        read_only_fields = [
            'status', 'total_rows', 'processed_rows', 'current_chunk',
            'total_chunks', 'inserted_count', 'updated_count', 
            'skipped_count', 'error_count', 'error_log',
            'started_at', 'completed_at'
        ]
