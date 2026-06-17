# Saanidhyam Frontend

React + Vite frontend application for the Saanidhyam elder care facility search and ticketing system.

## 📋 Prerequisites

- **Node.js 18+** (Node.js 20 LTS recommended)
- **npm** or **yarn** package manager

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd saanidhyam_frontend-main
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Variables Setup

Create a `.env` file in the frontend root directory:

```bash
# Copy the example file (if it exists)
cp .env.example .env

# Or create manually
```

**Required Environment Variables:**

Create a `.env` file with the following content:

```env
# Backend API Base URL
# Development: http://localhost:8000
# Production: https://api.yourdomain.com
VITE_API_URL=http://localhost:8000
```

**Important Notes:**
- Vite requires the `VITE_` prefix for environment variables
- Environment variables are embedded at **build time**, not runtime
- After changing `.env`, you must **rebuild** the application

### 4. Development Server

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173` (or the next available port)

## 🏗️ Building for Production

### 1. Set Production Environment Variables

Update `.env` with production API URL:

```env
VITE_API_URL=https://api.yourdomain.com
```

### 2. Build the Application

```bash
npm run build
# or
yarn build
```

The production build will be in the `dist/` directory.

### 3. Preview Production Build

```bash
npm run preview
# or
yarn preview
```

## 📦 Project Structure

```
saanidhyam_frontend-main/
├── src/
│   ├── components/        # React components
│   │   ├── HomePage.jsx
│   │   ├── SearchPage.jsx
│   │   ├── DetailPage.jsx
│   │   ├── MapView.jsx
│   │   └── FileUpload.jsx
│   ├── ticketing/         # Ticketing module
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── services/      # API services
│   │   └── types.ts       # TypeScript types
│   ├── services/          # API services
│   │   ├── api.js         # Main API client
│   │   └── authService.js # Authentication
│   ├── hooks/             # Custom React hooks
│   ├── App.jsx            # Main app component
│   └── main.jsx           # Entry point
├── public/                # Static assets
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json           # Dependencies
```

## 🔧 Configuration

### API Endpoint Configuration

The frontend uses `VITE_API_URL` environment variable to configure the backend API endpoint. This is set in `.env`:

```env
VITE_API_URL=http://localhost:8000
```

All API calls automatically use this base URL:
- `src/services/api.js` - Main search API
- `src/ticketing/apiClient.ts` - Ticketing API
- `src/components/SearchPage.jsx` - PDF export endpoint

### Environment Variables

**Development:**
```env
VITE_API_URL=http://localhost:8000
```

**Production:**
```env
VITE_API_URL=https://api.yourdomain.com
```

**Important:** After changing `.env`, restart the dev server or rebuild the application.

## 🎨 Styling

The project uses **Tailwind CSS** for styling. Configuration is in `tailwind.config.js`.

## 🔐 Security Notes

- **Never commit `.env` files** to version control
- **Never hardcode API URLs** in source code
- **Use environment variables** for all configuration
- **Validate API responses** before displaying data
- **Sanitize user inputs** before sending to API

## 🧪 Development

### Linting

```bash
npm run lint
# or
yarn lint
```

### Type Checking

The project uses TypeScript for type checking in the ticketing module.

## 📱 Features

- **Search Engine**: Search and filter elder care facilities
- **Map View**: Visualize facilities on an interactive map
- **Ticketing System**: Create and manage client tickets
- **File Upload**: Upload Excel files for bulk data import
- **PDF Export**: Export search results as PDF

## 🐛 Troubleshooting

### API Connection Issues

1. Verify backend server is running
2. Check `VITE_API_URL` in `.env` matches backend URL
3. Check CORS configuration on backend
4. Check browser console for errors

### Build Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

### Port Already in Use

Vite will automatically use the next available port, or you can specify:

```bash
npm run dev -- --port 3000
```

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)

## 👥 Support

For issues or questions, please contact the development team.
