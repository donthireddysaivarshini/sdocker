import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env early so DJANGO_ENV can be configured from it.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(os.path.join(BASE_DIR, '.env'))

environment = (os.environ.get('DJANGO_ENV') or 'development').strip().lower()

if environment == 'production':
    from .production import *
elif environment == 'staging':
    # Staging settings are optional in this repo.
    # If missing, fall back to production defaults (safer than dev).
    try:
        from .staging import *
    except ModuleNotFoundError:
        from .production import *
else:
    from .development import *
