from .base import *

# === Production settings ===
# All values MUST come from environment variables

DEBUG = False 

# Security: Hosts that can serve this app
ALLOWED_HOSTS = get_env_list('ALLOWED_HOSTS', required=True)

# Security: Frontend domains that can talk to this API
CORS_ALLOWED_ORIGINS = get_env_list('CORS_ALLOWED_ORIGINS', required=True)
CORS_ALLOW_ALL_ORIGINS = False

# Security: Trusted domains for form submissions (CRITICAL for Production)
# This prevents "CSRF verification failed" errors
CSRF_TRUSTED_ORIGINS = get_env_list('CSRF_TRUSTED_ORIGINS', required=True)

# SSL/HTTPS Settings (Force HTTPS)
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Proxies (Required because you will likely use Nginx or a Load Balancer)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Logging (Only log Warnings and Errors to keep logs clean)
LOGGING['root']['level'] = 'WARNING'
LOGGING['loggers']['django'] = {
    'handlers': ['console'],
    'level': 'WARNING',
    'propagate': False,
}