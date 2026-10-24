# OmniPOS — Environment Variables Configuration

## Backend (`server/.env`)

| Variable | Description | Required in Production | Sample Value |
| :--- | :--- | :--- | :--- |
| `PORT` | HTTP port for the Express application | No (Defaults to 5000) | `5000` |
| `NODE_ENV` | Application environment (`development` or `production`) | Yes | `production` |
| `DATABASE_URL` | MongoDB Atlas replica set connection string | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/billing_db` |
| `JWT_SECRET` | Cryptographically random secret (>= 32 chars) for signing auth tokens | Yes (Fails fast if missing) | `v8N#mK9!pL2$wQ5^zR7*tY1(uI4)oP6_` |
| `FRONTEND_URLS` | Comma-separated list of permitted CORS frontend domains | Yes | `https://omnipos.onrender.com,http://localhost:5173` |

## Frontend (`client/.env`)

| Variable | Description | Sample Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend REST API base URL | `https://api.omnipos.yourdomain.com/api` |
| `VITE_SOCKET_URL` | WebSocket server URL for KDS & real-time order sync | `https://api.omnipos.yourdomain.com` |
