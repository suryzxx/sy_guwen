# WeCom test API

This is a minimal backend for validating WeCom OAuth login.

Required environment variables:

- `WECOM_CORP_ID`
- `WECOM_AGENT_ID`
- `WECOM_CORP_SECRET`
- `FRONTEND_ORIGIN`

Local run:

```bash
PORT=8787 \
HOST=127.0.0.1 \
FRONTEND_ORIGIN=http://localhost:5173 \
WECOM_CORP_ID=wwxxxxxxxxxxxxxxxx \
WECOM_AGENT_ID=1000002 \
WECOM_CORP_SECRET=xxxxxxxxxxxxxxxx \
npm run server
```

Frontend real-mode run:

```bash
VITE_USE_MOCK=false VITE_API_BASE_URL=http://localhost:8787 npm run dev
```
