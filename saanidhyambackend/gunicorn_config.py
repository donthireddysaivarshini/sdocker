# Gunicorn configuration file
import multiprocessing

# The socket to bind
bind = "0.0.0.0:8000"

# Worker processes (usually 2 x CPU cores + 1)
workers = multiprocessing.cpu_count() * 2 + 1

# Worker class
worker_class = 'sync'

# Logging
accesslog = '-'  # Print to console
errorlog = '-'   # Print to console
loglevel = 'info'

# Timeouts (Important for image uploads or slow connections)
timeout = 120
keepalive = 5

#GUIDE:
# 1. Install dependencies
# pip install -r requirements.txt

# 2. Collect static files (CSS/Images for Admin panel)
# This puts all static files into the 'staticfiles' folder
# python manage.py collectstatic --noinput

# 3. Apply database migrations
# python manage.py migrate

# 4. Start the Production Server using Gunicorn
# gunicorn -c gunicorn_config.py satoru_backend.wsgi:application