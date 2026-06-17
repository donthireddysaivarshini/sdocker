from celery import shared_task
from django.utils import timezone
from .models import UploadJob
from .services.data_processor import DataProcessor


@shared_task
def process_upload_job(job_id):
    try:
        job = UploadJob.objects.get(id=job_id)
        job.status = 'processing'
        job.started_at = timezone.now()
        job.save()
        
        processor = DataProcessor(chunk_size=5)
        results = processor.process_excel_file(job.file.path, job=job)
        
        job.status = 'completed'
        job.completed_at = timezone.now()
        job.save()
        
        return f"Processed {results['processed']} rows"
    except Exception as e:
        job.status = 'failed'
        job.error_log = [{'error': str(e)}]
        job.save()
        raise
