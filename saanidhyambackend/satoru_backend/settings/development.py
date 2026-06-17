from .base import *

# Development-specific overrides
# These can still be overridden by environment variables
DEBUG = get_env('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = get_env_list('ALLOWED_HOSTS', 'localhost,127.0.0.1')

# Allow CORS from common development ports
CORS_ALLOWED_ORIGINS = get_env_list(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173'
)
CORS_ALLOW_ALL_ORIGINS = False  # Still restrict to known origins
