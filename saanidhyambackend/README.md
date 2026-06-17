# Saanidhyam Backend API

Django REST Framework backend for the Saanidhyam elder care facility search and ticketing system.

## 📋 Prerequisites

- **Python 3.10+** (Python 3.11 or 3.12 recommended)
- **PostgreSQL 12+** (or compatible database)
- **Redis** (optional, for Celery task queue)
- **pip** (Python package manager)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd saanidhyam_backend-main
```

### 2. Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Environment Variables Setup

Create a `.env` file in the backend root directory:

```bash
# Copy the example file (if it exists)
cp .env.example .env

# Or create manually
```

**Required Environment Variables:**

Create a `.env` file with the following content:

```env
# REQUIRED SETTINGS
SECRET_KEY=your-secret-key-here-CHANGE-IN-PRODUCTION
PGDATABASE=your_database_name
PGUSER=your_database_user
PGPASSWORD=your_database_password
PGHOST=your_database_host
PGPORT=5432
DJANGO_ENV=development

# OPTIONAL SETTINGS (with defaults)
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173

# THIRD-PARTY API KEYS (optional)
GEMINI_API_KEY=your-gemini-api-key-here

# CELERY CONFIGURATION (if using Celery)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

**Generate a Secret Key:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 5. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE your_database_name;
CREATE USER your_database_user WITH PASSWORD 'your_database_password';
GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_database_user;
```

### 6. Run Migrations

```bash
python manage.py migrate
```

### 7. Create Superuser (Optional)

```bash
python manage.py createsuperuser
```

### 8. Collect Static Files

```bash
python manage.py collectstatic --noinput
```

## 🏃 Running the Development Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

API endpoints:
- Admin: `http://localhost:8000/admin/`
- API Root: `http://localhost:8000/api/`
- Homes API: `http://localhost:8000/api/homes/`
- Ticketing API: `http://localhost:8000/api/tickets/`
- Authentication: `http://localhost:8000/api/token/`

## 🔧 Configuration

### Environment Modes

The application uses different settings based on `DJANGO_ENV`:

- **development** (default): Uses `settings/development.py`
- **production**: Uses `settings/production.py`

Set the environment variable:
```bash
export DJANGO_ENV=production  # Linux/Mac
set DJANGO_ENV=production      # Windows
```

### Production Deployment

For production, ensure:

1. **Set DJANGO_ENV=production**
2. **Set DEBUG=False** (or omit DEBUG, defaults to False)
3. **Set ALLOWED_HOSTS** to your domain(s)
4. **Set CORS_ALLOWED_ORIGINS** to your frontend URL(s)
5. **Set SECRET_KEY** to a strong random value
6. **Use HTTPS** (configure reverse proxy/load balancer)

Example production `.env`:
```env
DJANGO_ENV=production
DEBUG=False
SECRET_KEY=<strong-random-secret-key>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
PGDATABASE=production_db
PGUSER=production_user
PGPASSWORD=<secure-password>
PGHOST=your-db-host
PGPORT=5432
```

## 📦 Project Structure

```
saanidhyam_backend-main/
├── homes/              # Old age homes search app
│   ├── models.py       # Database models
│   ├── views.py        # API views
│   ├── serializers.py  # DRF serializers
│   └── services/       # Business logic services
├── ticketing/          # Ticketing system app
│   ├── models.py       # Ticket models
│   ├── views.py        # Ticket API views
│   └── serializers.py  # Ticket serializers
├── satoru_backend/     # Main Django project
│   ├── settings/       # Settings modules
│   │   ├── base.py     # Base settings
│   │   ├── development.py
│   │   └── production.py
│   └── urls.py         # URL routing
├── manage.py           # Django management script
└── requirements.txt    # Python dependencies
```

## 🔐 Security Notes

- **Never commit `.env` files** to version control
- **Always use strong SECRET_KEY** in production
- **Keep DEBUG=False** in production
- **Configure ALLOWED_HOSTS** properly
- **Use HTTPS** in production
- **Regularly update dependencies**: `pip install --upgrade -r requirements.txt`

## 🧪 Testing

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test homes
python manage.py test ticketing
```

## 📝 API Documentation

Once the server is running, visit:
- Django Admin: `http://localhost:8000/admin/`
- DRF Browsable API: `http://localhost:8000/api/`

## 🐛 Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists and user has permissions

### Migration Issues
```bash
# Reset migrations (development only!)
python manage.py migrate --run-syncdb
```

### Static Files Not Loading
```bash
python manage.py collectstatic
```

### Port Already in Use
```bash
# Use a different port
python manage.py runserver 8001
```

## 📚 Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 👥 Support

For issues or questions, please contact the development team.

installations
pip install razorpay


