from django.db import models
from django.contrib.postgres.fields import ArrayField
import hashlib


class OldAgeHomeManager(models.Manager):
    """Custom manager with PostGIS queries"""
    
    def nearby(self, latitude, longitude, radius_km=10):
        """
        Find homes within radius using PostGIS on NeonDB
        No local GDAL needed - PostGIS runs on database server!
        """
        from django.db import connection
        
        with connection.cursor() as cursor:
            # Use PostGIS ST_DWithin function on NeonDB
            cursor.execute("""
                SELECT 
                    id,
                    organisation_name,
                    state,
                    district,
                    city_town_mandal,
                    address,
                    latitude,
                    longitude,
                    contact_number,
                    costing_type,
                    monthly_charges_minimum,
                    monthly_charges_maximum,
                    ST_Distance(
                        ST_MakePoint(longitude, latitude)::geography,
                        ST_MakePoint(%s, %s)::geography
                    ) / 1000 as distance_km
                FROM old_age_homes
                WHERE 
                    latitude IS NOT NULL 
                    AND longitude IS NOT NULL
                    AND ST_DWithin(
                        ST_MakePoint(longitude, latitude)::geography,
                        ST_MakePoint(%s, %s)::geography,
                        %s * 1000  -- Convert km to meters
                    )
                ORDER BY distance_km
                LIMIT 50
            """, [longitude, latitude, longitude, latitude, radius_km])
            
            columns = [col[0] for col in cursor.description]
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            return results


class OldAgeHome(models.Model):
    """Old Age Home facility"""
    
    # Custom manager with PostGIS queries
    objects = OldAgeHomeManager()
    
    organisation_name = models.CharField(max_length=500, db_index=True)
    
    # Location
    state = models.CharField(max_length=100, db_index=True)
    district = models.CharField(max_length=100, blank=True)
    city_town_mandal = models.CharField(max_length=200, blank=True)
    po_locality_village = models.CharField(max_length=200, blank=True)
    address = models.TextField(blank=True)
    pincode = models.CharField(max_length=6, blank=True)
    
    # Simple lat/lng fields - PostGIS calculations happen on NeonDB
    latitude = models.FloatField(null=True, blank=True, db_index=True)
    longitude = models.FloatField(null=True, blank=True, db_index=True)
    map_location = models.URLField(max_length=1000, blank=True)
    
    # Services
    services_type = models.CharField(max_length=100, default='Old Age Home')
    
    # Costing
    COSTING_CHOICES = [
        ('free', 'Free'),
        ('pay', 'Pay'),
        ('pay_stay', 'Pay & Stay'),
    ]
    costing_type = models.CharField(max_length=20, choices=COSTING_CHOICES, blank=True)
    monthly_charges_minimum = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    monthly_charges_maximum = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Demographics
    GENDER_CHOICES = [
        ('men', 'Men'),
        ('women', 'Women'),
        ('both', 'Men & Women'),
    ]
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True)
    
    CARE_CHOICES = [
        ('basic', 'Basic Care'),
        ('nursing', 'Nursing Care'),
        ('day', 'Day Care'),
        ('residential', 'Residential Care'),
        ('palliative', 'Palliative Care'),
    ]
    care_type = models.CharField(max_length=30, choices=CARE_CHOICES, blank=True)
    
    # Contact
    contact_number = ArrayField(
        models.CharField(max_length=20),
        blank=True,
        default=list
    )
    email = ArrayField(models.EmailField(), blank=True, null=True, default=None)
    website = ArrayField(models.URLField(max_length=1000), blank=True, null=True, default=None)
    
    # Verification
    VERIFICATION_CHOICES = [
        ('call_verified', 'Call Verified'),
        ('call_not_verified', 'Call Not Verified'),
        ('online_verified', 'Online Verified'),
    ]
    call_verification = models.CharField(max_length=30, choices=VERIFICATION_CHOICES, blank=True)
    notes = models.TextField(blank=True)
    
    # ✓ Batch tracking for rollback capability
    batch_no = models.CharField(
        max_length=50, 
        null=True,
        blank=True,
        db_index=True,
        help_text="Batch identifier for upload tracking and rollback"
    )
    
    # Metadata
    data_hash = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'old_age_homes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['state', 'district']),
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['batch_no']),
        ]
    
    def __str__(self):
        return f"{self.organisation_name} - {self.state}"
    
    @staticmethod
    def generate_hash(org_name, state, district, pincode):
        """Generate unique hash for duplicate detection"""
        hash_string = f"{org_name}|{state}|{district}|{pincode}".lower().strip()
        return hashlib.sha256(hash_string.encode()).hexdigest()


class UploadJob(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('rolled_back', 'Rolled Back'),
    ]
    
    file = models.FileField(upload_to='uploads/%Y/%m/%d/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # ✓ FIX: Make nullable to avoid migration issues
    batch_no = models.CharField(
        max_length=50, 
        unique=True,
        null=True,  # ✓ CHANGED: Allow null for existing records
        blank=True,
        db_index=True,
        help_text="Unique batch identifier for this upload job"
    )
    
    total_rows = models.IntegerField(default=0)
    processed_rows = models.IntegerField(default=0)
    current_chunk = models.IntegerField(default=0)
    total_chunks = models.IntegerField(default=0)
    
    inserted_count = models.IntegerField(default=0)
    updated_count = models.IntegerField(default=0)
    skipped_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    error_log = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'upload_jobs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Job #{self.id} - {self.status}" + (f" - {self.batch_no}" if self.batch_no else "")
    
    @property
    def progress_percentage(self):
        if self.total_rows > 0:
            return round((self.processed_rows / self.total_rows) * 100, 2)
        return 0
    
    def can_rollback(self):
        """Check if this job can be rolled back"""
        return self.status in ['completed', 'failed'] and self.batch_no is not None
