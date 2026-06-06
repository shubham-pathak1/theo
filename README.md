# Theo

Theo is a full-stack AI workspace for chat, image generation, saved history, gallery publishing, usage limits, and paid plan upgrades.

## Stack

- **Client:** React, Vite, Tailwind CSS, React Router, Socket.io client
- **Server:** Node.js, Express.js, MongoDB, Mongoose
- **Auth:** JWT access tokens, refresh cookies, Google Sign-In
- **AI:** Gemini chat models, Cloudflare Workers AI image generation
- **Queue:** BullMQ with Redis, in-memory fallback for local development
- **Storage:** Cloudinary or local generated-image storage
- **Payments:** Razorpay Checkout orders with signature verification and webhooks

## Features

- Email/password auth, Google auth, password reset, email verification
- Streaming AI chat with saved conversations
- Theo model tiers: Low, Medium, High, XHigh
- Context compaction for longer chats
- Image generation queue with retry/backoff
- Generation history and gallery publishing
- Usage windows with plan-based limits
- Free, Pro, and Max plan structure
- Profile settings and custom chat instructions

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Client:

```text
http://localhost:5173
```

API:

```text
http://localhost:5000
```

## Environment

Minimum local values:

```env
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
COOKIE_SECRET=
GEMINI_API_KEY=
```

Redis queue:

```env
ENABLE_REDIS=true
REDIS_URL=redis://default:PASSWORD@HOST:PORT
START_WORKER=true
IMAGE_WORKER_CONCURRENCY=2
IMAGE_QUEUE_ATTEMPTS=3
IMAGE_QUEUE_BACKOFF_MS=5000
LOCAL_UPLOAD_RETENTION_DAYS=14
```

Image provider:

```env
IMAGE_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_IMAGE_MODEL=@cf/stabilityai/stable-diffusion-xl-base-1.0
```

Optional services:

```env
GOOGLE_CLIENT_ID=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

Razorpay billing:

```text
1. Create or reuse a Razorpay test key pair.
2. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server environment.
3. Add a webhook pointing to /api/billing/webhook.
4. Use the same webhook secret in RAZORPAY_WEBHOOK_SECRET.
```

## Running Separately

API only:

```bash
npm run dev:server
```

Client only:

```bash
npm run dev:client
```

Image worker only:

```bash
npm run worker:image
```

For a separate worker process, set this on the API process:

```env
START_WORKER=false
```

## Development Fallbacks

- Redis disabled: usage and image jobs use local memory fallback.
- Cloudinary missing: generated images are stored under `server/uploads`.
- Cloudflare missing in development: image requests return a local demo preview.
- Razorpay missing: billing returns a setup error until keys are configured.
- SMTP missing: reset links are returned in development responses.
