Security

- Frontend never connects to the database directly. All data access goes through API services in client/src/services/api.ts.
- Production builds strip console and debugger from client bundles via Vite esbuild drop.
- Server returns user-friendly error messages and logs errors server-side.
- Helmet enforces CSP and HSTS in production; referrerPolicy is set to no-referrer.
- JWT and env validation: in production or ENFORCE_ENV=1, server validates presence of critical envs and exits on failure.
- Rate limiting: auth, chat, and payments endpoints are protected with express-rate-limit.
- CI security scanning: GitHub Actions runs npm audit for client and server. Optional Snyk/Checkmarx/Invicti can be added with org credentials.


Local development with browser + mock auth

Backend
- server/.env:
  - PORT=8000
  - ORIGIN=http://localhost:5173
  - ALLOW_MOCK_AUTH=1
  - OPENAI_USE_MOCK=1
  - JWT_SECRET=your_long_dev_secret_min_32_chars
  - OPENAI_MODEL=gpt-4
  - MODEL_MAX_OUTPUT_TOKENS=700
  - MODEL_MAX_INPUT_TOKENS=3000
- Run: cd server && npm ci && npm run dev

Frontend
- client/.env (optional):
  - VITE_API_URL=http://localhost:8000
- Run: cd client && npm ci && npm run dev
- Open http://localhost:5173

How it works
- Client outside Telegram uses mock initData automatically (useTelegram).
- Server accepts it only when ALLOW_MOCK_AUTH=1 and issues JWT.
- All API calls are then authorized as a test user.
- To switch theme, call setTheme('dark'|'light') or set localStorage key ui_theme.

Security notes
- JWT HS256 explicitly set, expiry 15m.
- In production/ENFORCE_ENV=1, weak JWT_SECRET (<24) blocks startup.
- CORS/SSE restricted to ORIGIN.

Token economy
- Input context is trimmed on server by token budget (MODEL_MAX_INPUT_TOKENS) to reduce costs.
- Output tokens capped by MODEL_MAX_OUTPUT_TOKENS.

SSE protocol
- Server emits JSON SSE events with type: 'chunk' | 'done' | 'limit_reached' | 'error'.
- Client parses and finalizes only on 'done' or 'limit_reached'.
