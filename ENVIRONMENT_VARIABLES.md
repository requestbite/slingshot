# Environment Variables Guide

This project uses Vite's built-in environment variable support for managing different configurations between development and production.

## How it Works

Vite automatically loads environment variables from:
- `.env.development` - Used when running `vite` (development mode)
- `.env.production` - Used when running `vite build` (production mode)
- `.env.local` - Local overrides (ignored by git)

## Variable Naming

All environment variables exposed to the client must be prefixed with `VITE_`:

```bash
VITE_API_URL=http://localhost:8000  # ✅ Accessible in client
API_SECRET=secret123                # ❌ Not accessible in client (server-only)
```

## Usage in Components

Access environment variables using `import.meta.env`:

```javascript
// Basic usage
const apiUrl = import.meta.env.VITE_API_URL;
const isProduction = import.meta.env.VITE_APP_ENV === 'production';
const debug = import.meta.env.VITE_DEBUG === 'true';

// Example in a component
export function ApiClient() {
  const baseURL = import.meta.env.VITE_API_URL;
  
  const fetchData = async () => {
    const response = await fetch(`${baseURL}/api/data`);
    return response.json();
  };

  return (
    <div>
      <p>Connected to: {baseURL}</p>
      {import.meta.env.VITE_DEBUG === 'true' && (
        <p>Debug mode enabled</p>
      )}
    </div>
  );
}
```

## Available Variables

### Development (.env.development)
- `VITE_API_URL=http://localhost:8000` - Local API server
- `VITE_APP_ENV=development` - Environment identifier
- `VITE_DEBUG=true` - Enable debug features
- `VITE_ENABLE_ANALYTICS=false` - Disable analytics in dev

### Production (.env.production)
- `VITE_API_URL=https://api.requestbite.com` - Production API
- `VITE_APP_ENV=production` - Environment identifier
- `VITE_DEBUG=false` - Disable debug features
- `VITE_ENABLE_ANALYTICS=true` - Enable analytics in prod

## Local Overrides

Create `.env.local` for developer-specific settings (this file is ignored by git):

```bash
# .env.local - Personal development overrides
VITE_API_URL=http://localhost:3001  # Use different port
VITE_DEBUG=true                     # Force debug mode
```

## Commands

```bash
# Development mode (uses .env.development)
npm run dev
# or
vite

# Production build (uses .env.production)  
npm run build
# or
vite build

# Preview production build
npm run preview
# or
vite preview
```

## Security Notes

- ⚠️ **Never put secrets in client-side environment variables**
- ✅ Only expose what the frontend needs to know
- ✅ API keys, database URLs, etc. should remain server-side
- ✅ `.env.local` is automatically ignored by git for personal overrides