# Proxy Configuration Guide

## Overview
This application is configured to run both frontend and backend on the same port using a proxy setup.

## Development Mode (Recommended)

In development, the application runs on **two separate ports** with Vite's proxy handling the communication:

- **Frontend (Vite)**: `http://localhost:5173`
- **Backend (Express)**: `http://localhost:3000`

### How it works:
1. You access the app at `http://localhost:5173`
2. All `/api/*` requests are automatically proxied to `http://localhost:3000`
3. This avoids CORS issues and makes it appear as if everything runs on one port

### Running in Development:
```bash
npm run dev
```

This command runs both frontend and backend concurrently. You'll see:
- 🟦 **API** (Backend on port 3000)
- 🟩 **UI** (Frontend on port 5173)

**Access the app at**: `http://localhost:5173`

## Production Mode

In production, **everything runs on port 3000**:

### How it works:
1. Frontend is built into static files (`dist` folder)
2. Backend serves these static files
3. Backend also handles all `/api/*` routes
4. Single port for both frontend and backend

### Building and Running in Production:

```bash
# Build the frontend
npm run build:full

# Start the production server
npm start
```

**Access the app at**: `http://localhost:3000`

## Configuration Files

### `vite.config.js`
- Configures the proxy to forward `/api` requests to backend
- Includes WebSocket support
- Adds error logging for debugging

### `backend/app.js`
- Serves static files in production mode
- Handles client-side routing (SPA support)
- CORS configured for both dev and production

### `package.json`
- `npm run dev`: Development mode (both servers)
- `npm run build:full`: Build for production
- `npm start`: Run production server

## Port Configuration

To change ports, update these files:

### Backend Port (default: 3000)
Update `.env`:
```env
PORT=3000
```

### Frontend Dev Port (default: 5173)
Update `vite.config.js`:
```javascript
server: {
  port: 5173,
  // ...
}
```

## Troubleshooting

### CORS Errors
- In development, ensure backend is running on port 3000
- Check that CORS_ORIGIN in `.env` is set correctly

### Proxy Not Working
- Verify backend is running: `http://localhost:3000/api/health`
- Check Vite console for proxy logs (🔄 Proxying messages)
- Ensure API routes start with `/api`

### Production Build Issues
- Run `npm run build` to create the `dist` folder
- Ensure `NODE_ENV=production` is set when running `npm start`
- Check that `dist` folder exists in the project root

## Benefits of This Setup

✅ **Development**: Hot reload, better debugging, separate logs
✅ **Production**: Single port, simplified deployment, better performance
✅ **No CORS Issues**: Proxy handles cross-origin requests in dev
✅ **Easy Deployment**: Build once, deploy the entire app
