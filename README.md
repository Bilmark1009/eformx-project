# EFormX

A full-stack web application for electronic form management and processing. This project combines a **Laravel 12** backend API with a **React 19** frontend for a modern, scalable form management solution.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)
  - [Development](#development)
  - [Production](#production)
- [Environment Configuration](#environment-configuration)
- [Database](#database)
- [Email Configuration](#email-configuration)
- [Docker Deployment](#docker-deployment)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Project Structure](#project-structure-detailed)

---

## ✨ Features

- **User Management**: Admin and Creator roles with authentication
- **Form Management**: Create, manage, and process electronic forms
- **API-First Architecture**: RESTful API with Laravel Sanctum authentication
- **Real-time Processing**: Queue-based background job processing
- **Email Integration**: Send notifications and credentials via email
- **Database Migrations**: Schema versioning and seeding support
- **Docker Support**: Containerized deployment ready
- **Responsive UI**: Modern React frontend with Tailwind CSS
- **Excel Export**: Export data using PHPOffice/PHPSpreadsheet

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Laravel 12
- **Language**: PHP 8.2+
- **Authentication**: Laravel Sanctum
- **ORM**: Eloquent
- **Database**: PostgreSQL (production), SQLite (development)
- **Mail Drivers**: Brevo, Mailtrap, Gmail SMTP
- **Build Tool**: Vite
- **Testing**: PHPUnit

### Frontend
- **Framework**: React 19
- **Language**: JavaScript (ES6+)
- **Router**: React Router DOM v7
- **Styling**: Tailwind CSS v4
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Build Tool**: Webpack (via react-scripts)
- **Testing**: React Testing Library

### DevOps
- **Containerization**: Docker
- **Deployment**: Render (supports PostgreSQL)
- **Build Automation**: Docker Compose support

---

## 📁 Project Structure

```
eformx-project/
├── backend/                  # Laravel API server
│   ├── app/                 # Application logic
│   ├── config/              # Configuration files
│   ├── database/            # Migrations and seeders
│   ├── routes/              # API routes
│   ├── storage/             # Logs and files
│   ├── tests/               # Unit tests
│   ├── .env.example         # Environment template
│   ├── composer.json        # PHP dependencies
│   ├── package.json         # Node dependencies (Vite)
│   ├── Dockerfile           # Docker configuration
│   └── docker-entrypoint.sh # Docker entry script
│
├── frontend/                # React application
│   ├── public/              # Static assets
│   ├── src/                 # React components and logic
│   ├── build/               # Production build output
│   ├── node_modules/        # Node dependencies
│   ├── package.json         # Dependencies and scripts
│   └── .env                 # Environment variables
│
├── render.yaml              # Render deployment config
└── README.md               # This file
```

---

## 📦 Prerequisites

Before getting started, ensure you have the following installed:

- **PHP**: 8.2 or higher
- **Node.js**: 18 or higher
- **npm**: 8 or higher (comes with Node.js)
- **Composer**: Latest version (for PHP dependency management)
- **Docker** (optional): For containerized development
- **PostgreSQL** (optional): For production-like database setup

---

## 🚀 Installation & Setup

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install PHP dependencies**:
   ```bash
   composer install
   ```

3. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Generate application key**:
   ```bash
   php artisan key:generate
   ```

5. **Create database file** (for SQLite):
   ```bash
   touch database/database.sqlite
   ```

6. **Run migrations**:
   ```bash
   php artisan migrate
   ```

7. **Seed database** (optional):
   ```bash
   php artisan db:seed
   ```

8. **Install Node dependencies** (for Vite):
   ```bash
   npm install
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (already included):
   - Backend URL is configured in `.env` file
   - Ensure it matches your backend server URL

---

## ▶️ Running the Application

### Development

#### Option 1: Run Both Services Concurrently (Recommended)

From the **backend directory**, use the built-in dev script:

```bash
npm run dev
```

This command runs:
- **Laravel API server** on `http://localhost:8000`
- **Queue listener** for background jobs
- **Log viewer** (Pail) for real-time logs
- **Vite dev server** for frontend assets

#### Option 2: Run Services Separately

**Terminal 1 - Backend API**:
```bash
cd backend
php artisan serve
```

**Terminal 2 - Queue Worker** (handles background jobs):
```bash
cd backend
php artisan queue:listen --tries=1 --timeout=0
```

**Terminal 3 - Frontend**:
```bash
cd frontend
npm start
```

### Production

#### Build Backend Assets:
```bash
cd backend
npm run build
```

#### Build Frontend:
```bash
cd frontend
npm run build
```

#### Run with Docker:
```bash
docker-compose up -d
```

---

## ⚙️ Environment Configuration

### Backend (.env)

Copy `.env.example` to `.env` and configure:

```env
# Application
APP_NAME=EFormX
APP_ENV=local
APP_KEY=base64:xxxx...
APP_DEBUG=true

# Database
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# Or for PostgreSQL:
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=eformx
# DB_USERNAME=eformx_user
# DB_PASSWORD=your_password

# Email (see Email Configuration section)
MAIL_MAILER=log
MAIL_FROM_ADDRESS=noreply@eformx.test
MAIL_FROM_NAME=EFormX
```

### Frontend (.env)

The frontend `.env` should point to your backend:

```env
REACT_APP_API_URL=http://localhost:8000/api
```

---

## 📧 Email Configuration

### Gmail SMTP Setup

To send emails via Gmail:

1. **Enable 2FA** on your Google Account
2. **Create an App Password**:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Navigate to "App passwords"
   - Generate a password for "Mail" and "Windows Computer"

3. **Configure in .env**:
   ```env
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=your_gmail@gmail.com
   MAIL_PASSWORD=your_app_password
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS=your_gmail@gmail.com
   MAIL_FROM_NAME=EFormX
   ```

### Alternative Providers

**Brevo** (recommended for production):
```env
MAIL_MAILER=brevo
BREVO_API_KEY=your_api_key
```

**Mailtrap**:
```env
MAIL_MAILER=mailtrap
MAIL_HOST=live.mailtrap.io
MAIL_PORT=465
```

### Testing Email Locally

1. **Clear config cache**:
   ```bash
   php artisan config:clear
   php artisan config:cache
   ```

2. **Use log driver** (emails saved to storage/logs):
   ```env
   MAIL_MAILER=log
   ```

3. **Verify emails in logs**:
   ```bash
   tail -f storage/logs/laravel.log
   ```

---

## 🐳 Docker Deployment

### Local Docker Setup

1. **Build the Docker image**:
   ```bash
   docker build -t eformx-backend ./backend
   ```

2. **Run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

### Deploy to Render

The project is configured for Render deployment via `render.yaml`:

1. **Push to GitHub**
2. **Connect Render to GitHub**
3. **Deploy**:
   - Backend service runs on Render
   - PostgreSQL database auto-provisioned
   - Environment variables auto-configured

**Key Render Settings**:
- **Database**: PostgreSQL (auto-provisioned)
- **Region**: Singapore
- **Plan**: Free (can be upgraded)
- **Mail Provider**: Brevo (configured in render.yaml)

---

## 📚 API Documentation

### Authentication

All API endpoints (except login/register) require authentication using Laravel Sanctum tokens.

**Login**:
```bash
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

Response:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

### Key Endpoints

See `backend/routes/api.php` for all available endpoints.

Common endpoints:
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/user/profile` - Get current user

---

## 🧪 Testing

### Backend Tests

Run PHPUnit tests:
```bash
php artisan test
```

Or via composer:
```bash
npm run test
```

Test files are located in `backend/tests/`.

### Frontend Tests

Run React tests:
```bash
cd frontend
npm test
```

---

## 📝 Additional Notes

### Queue Processing

Background jobs (like email sending) are processed via Laravel's queue system:

```bash
# Start queue listener
php artisan queue:listen

# Or specific queue
php artisan queue:work
```

Jobs are stored in the database by default. Ensure migrations are run.

### Database Seeders

Populate the database with sample data:
```bash
php artisan db:seed
```

Or seed a specific seeder:
```bash
php artisan db:seed --class=UserSeeder
```

### Clear Cache

If encountering configuration issues:
```bash
php artisan cache:clear
php artisan config:clear
php artisan view:clear
php artisan route:clear
```

---

## 📄 License

This project is licensed under the **MIT License**. See LICENSE file for details.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Create a new branch for your feature
2. Commit your changes
3. Push to your branch
4. Submit a pull request

---

## 📞 Support

For issues or questions:
- Check existing GitHub issues
- Review the documentation
- Contact the development team

---

## 🔗 Useful Links

- [Laravel Documentation](https://laravel.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Laravel Sanctum](https://laravel.com/docs/sanctum)
- [Render Deployment](https://render.com)

---

**Last Updated**: February 2026
