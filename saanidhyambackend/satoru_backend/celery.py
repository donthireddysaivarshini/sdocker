import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'satoru_backend.settings')

app = Celery('satoru_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
