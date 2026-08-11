# SkyVayu Backend — Phase 1

Node.js + Express.js REST API backend for the SkyVayu Charter Aviation Platform.

## Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** Supabase (accessed over the PostgREST HTTP API — see `src/config/supabase.js`)
- **Auth:** JWT (operator portal) + Google OAuth passthrough (customer portal)
- **Email:** Resend API

---

## Configuration

All configuration flows through **`src/config/env.js`**, which is the single
source of truth. No other file reads `process.env` directly — import the frozen
config object instead:

```js
const { PORT, IS_PRODUCTION } = require('./config/env');
```

Values are resolved in this order, first match wins:

1. Real process environment (Render dashboard, Docker, CI)
2. `.env.<NODE_ENV>.local`
3. `.env.<NODE_ENV>`
4. `.env`

Because the real environment wins, a `.env` file left on a production host can
never override a platform-set secret.

**Production boots fail fast.** If `JWT_SECRET`, `JWT_REFRESH_SECRET`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, or
`ALLOWED_ORIGINS` is missing — or a JWT secret is a placeholder or shorter than
32 characters — the process throws on startup with a list of every problem,
rather than serving traffic signed with a guessable key. In development the same
issues log a warning and fall back to insecure defaults.

Every variable is documented in [`.env.example`](.env.example).

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then fill in at minimum `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
Generate the JWT secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 3. Start the server

```bash
npm run dev     # development, auto-restart on changes
npm start       # production
```

---

## Database migrations

Schema changes live in `sql/migrations/` and are applied by a runner that tracks
what it has already run in a `schema_migrations` table.

```bash
npm run migrate:status   # what is applied vs pending — changes nothing
npm run migrate          # apply pending migrations
```

They also run **automatically at boot**. A migration failure aborts startup
rather than serving against a stale schema. Set `RUN_MIGRATIONS_ON_BOOT=false`
to apply them from a deploy step instead.

**Requires `DATABASE_URL`.** The app itself talks to Supabase over REST, but
PostgREST cannot execute DDL at any privilege level — `ALTER TABLE` needs a real
Postgres connection. Get it from Supabase → Project Settings → Database →
Connection string (URI), and use the **direct or session-mode** string: the
transaction pooler (port 6543) cannot hold the advisory lock that stops two
instances migrating at once. Without `DATABASE_URL` the runner logs a warning
and the server starts normally.

Rules:

- **Never edit an applied migration.** The runner stores a checksum and refuses
  to start if one changes, because that means environments have diverged
  silently. Add a new file instead.
- **Zero-pad filenames** (`003_…`) — they are applied in filename order.
- Each migration runs in a transaction, so a failure leaves nothing behind.

`sql/manual/` holds SQL that is deliberately *not* automated — currently the RLS
lockdown, whose ordering depends on the real service role key being in place
first. Read the header of each file before running it.

The API defaults to `http://localhost:5000` (override with `PORT`).
Health check: `GET /health`

---

## Deployment

`render.yaml` provisions the service. Every secret is declared `sync: false`,
so values are set in the Render dashboard and never committed. Set
`ALLOWED_ORIGINS` to the production frontend origins (comma-separated, no
trailing slash) — in production, localhost origins are **not** auto-allowed.

---

## Payments (Razorpay)

### The rule everything else follows

**The browser never states a price.** The client sends a `quoteId`; the amount
is read from the quote row, the order is created server-side, and after checkout
the payment is re-fetched from Razorpay and its captured amount compared to what
we asked for. A tampered client can change what it *displays*, never what it
*pays*. There is no code path to `status = 'confirmed'` that skips that check.

If `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET` is missing the endpoints return
**503, not a free booking**.

### How a booking gets confirmed

Three routes to the same place, all funnelling through one `confirmBooking()`:

1. **Checkout callback** (`POST /verify`) — the happy path. Depends on the
   customer's browser surviving the round trip to the bank, which it often does
   not.
2. **Webhook** (`POST /webhook`) — server to server, so a closed tab, a dead
   network or a locked phone no longer costs a confirmation. This is what makes
   the flow safe in production; without it, money gets taken for bookings that
   stay `pending_payment` forever.
3. **Reconcile** (`POST /reconcile/:bookingId`, admin) — asks Razorpay directly
   about a stuck order. Available in the admin dashboard under **Payments →
   Needs attention**.

The webhook and the callback can arrive simultaneously. The `UPDATE` that
confirms a booking is conditional on it still being `pending_payment`, so
whichever arrives first wins and the other becomes a no-op — that is what stops
two confirmation emails going out for one booking. Redeliveries are also caught
earlier, by the primary key on `payment_events.id`.

### Razorpay dashboard setup

1. **API keys** — Account & Settings → API Keys. Test keys (`rzp_test_…`) work
   end to end without KYC; swap for live keys after activation.
2. **Webhook** — Settings → Webhooks → Add New Webhook:
   - URL: `https://<your-api-host>/api/payments/webhook`
   - Secret: any strong value you choose — set the same value as
     `RAZORPAY_WEBHOOK_SECRET`. It is **not** the API key secret.
   - Active events: `payment.captured`, `payment.failed`, `refund.processed`
3. **Verify it arrives** — admin dashboard → **Payments → Webhook log**. An
   empty log once payments are live means the URL or the secret is wrong.

Without `RAZORPAY_WEBHOOK_SECRET` the endpoint returns 503 and logs loudly
rather than trusting an unverified POST — anyone could otherwise confirm a
booking by hitting the URL.

### Activation checklist

Razorpay's review requires these pages to be live and reachable, each at its own
URL: Terms (`/terms`), Privacy (`/privacy`), **Refund & Cancellation**
(`/refunds`), **Contact Us** (`/contact`) with a real registered address and
phone, and pricing (`/fleet`). All exist; the `[BRACKETED]` placeholders in
`Terms.jsx`, `Refunds.jsx` and `Contact.jsx` must be filled with the registered
entity's real details first.

For GST invoices, set `VITE_COMPANY_LEGAL_NAME`, `VITE_COMPANY_ADDRESS`,
`VITE_COMPANY_GSTIN` and `VITE_COMPANY_STATE` in the frontend environment. Until
`VITE_COMPANY_GSTIN` is set the document prints as "INVOICE" rather than "TAX
INVOICE" and omits the GSTIN line.

### Refunds

`POST /api/payments/refund` (admin) refunds fully or partially. The ceiling is
computed server-side from `total_amount − refund_amount`, never taken from the
request. Refunds issued from the Razorpay dashboard instead of through this
endpoint arrive as a `refund.processed` webhook and land in the same state.

### Migrations this depends on

`001_payment_columns.sql` and `002_payment_webhooks_and_refunds.sql` must be
applied. Without 001, `payment_order_id` is never stored and the webhook cannot
match a payment to a booking. Without 002 the webhook still works — the confirm
path is independently idempotent — but replay protection and the webhook log are
gone, and the server logs a warning on every delivery saying so.

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Operator login (returns JWT) |
| POST | `/api/auth/logout` | Bearer | Logout |
| GET | `/api/auth/profile` | Bearer | Current user profile |
| POST | `/api/auth/refresh` | Public | Refresh access token |
| POST | `/api/auth/forgot-password` | Public | Send password reset email |
| POST | `/api/auth/reset-password` | Public | Apply new password |
| POST | `/api/auth/sync-profile` | Public | Upsert customer profile (after Google OAuth) |

### Queries — `/api/queries`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/queries` | Optional | Customer submits charter request |
| GET | `/api/queries` | Bearer | List queries (operator: open within 1hr) |
| GET | `/api/queries/:id` | Optional | Get single query with quotes |
| PATCH | `/api/queries/:id` | Bearer | Update query status |
| DELETE | `/api/queries/:id` | Admin | Delete query |

### Bookings — `/api/bookings`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/bookings` | Optional | Confirm a booking |
| GET | `/api/bookings` | Bearer | List bookings |
| GET | `/api/bookings/:id` | Bearer | Get single booking |
| PUT | `/api/bookings/:id` | Bearer | Update booking |
| DELETE | `/api/bookings/:id` | Admin | Delete booking |

### Quotes — `/api/quotes`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/quotes` | Operator | Submit a quote |
| GET | `/api/quotes` | Operator | List quotes (operator: own; customer: by queryId) |
| GET | `/api/quotes/:id` | Operator | Get single quote |
| PATCH | `/api/quotes/:id` | Operator | Revise a quote (within window) |
| DELETE | `/api/quotes/:id` | Operator | Retract a quote |
| POST | `/api/quotes/claim` | Operator | Lock a query for 20 min |
| DELETE | `/api/quotes/claims/:claimId` | Operator | Release a claim |

### Fleet — `/api/fleet`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/fleet` | Operator | List aircraft |
| GET | `/api/fleet/:id` | Operator | Get single aircraft |
| POST | `/api/fleet` | Operator | Add aircraft |
| PUT | `/api/fleet/:id` | Operator | Update aircraft / upload docs |
| DELETE | `/api/fleet/:id` | Operator | Remove aircraft |
| PATCH | `/api/fleet/:id/status` | Admin | Approve/reject aircraft documents |

### Feedback — `/api/feedback`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/feedback` | Public | Submit feedback |
| GET | `/api/feedback` | Admin | List all feedback |
| DELETE | `/api/feedback/:id` | Admin | Delete feedback |
| POST | `/api/feedback/newsletter` | Public | Newsletter subscription |
| POST | `/api/feedback/contact` | Public | Contact form submission |

### Payments — `/api/payments`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payments/order` | Optional | Open a Razorpay order for a quote (price read from DB) |
| POST | `/api/payments/verify` | Optional | Verify the checkout callback and confirm the booking |
| POST | `/api/payments/webhook` | Signature | Razorpay server-to-server confirmation |
| POST | `/api/payments/refund` | Admin | Refund a booking, fully or partially |
| POST | `/api/payments/reconcile/:bookingId` | Admin | Ask Razorpay what happened to a stuck booking |

See [Payments](#payments-razorpay) below for the flow and the dashboard setup.

### Operators — `/api/operators`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/operators` | Public | Register operator |
| GET | `/api/operators` | Admin | List all operators |
| GET | `/api/operators/:id` | Bearer | Get operator profile |
| PUT | `/api/operators/:id` | Bearer | Update operator profile |
| PATCH | `/api/operators/:id/approval` | Admin | Approve/reject operator |
| GET | `/api/operators/:id/users` | Bearer | List employees |
| POST | `/api/operators/:id/users` | Owner | Add employee |
| PATCH | `/api/operators/:id/users/:uid` | Owner/Admin | Update employee |
| DELETE | `/api/operators/:id/users/:uid` | Owner/Admin | Remove employee |

---

## Project Structure

```
src/
├── config/
│   ├── env.js          # Environment config
│   └── prisma.js       # Prisma client singleton
├── controllers/        # Business logic handlers
├── routes/             # Express routers
├── middleware/
│   ├── auth.js         # JWT authentication
│   ├── validate.js     # express-validator runner
│   ├── rateLimiter.js  # Rate limiting
│   └── errorHandler.js # Central error + 404 handlers
├── services/
│   └── emailService.js # Transactional email via Resend
├── helpers/
│   └── bookingRef.js   # Booking reference generator
├── utils/
│   ├── jwt.js          # Sign/verify JWT helpers
│   └── response.js     # Standardised response helpers
├── validations/        # express-validator rule sets
├── app.js              # Express app setup
└── server.js           # Entry point
prisma/
└── schema.prisma       # Database schema
```

---

## Migration Notes (Phase 1)

The frontend HTML/CSS pages are **unchanged**. The backend runs alongside the existing Supabase integration.

To gradually switch API calls from Supabase REST to this backend:

1. Deploy this backend (Render / Railway / EC2).
2. Add `VITE_API_URL=https://your-backend.com` to the frontend config.
3. Replace individual `fetch(SUPABASE_URL + '/rest/v1/...')` calls in the JS files with `fetch(API_URL + '/api/...')`.
4. Keep Supabase Auth (Google OAuth) running as-is — use `/api/auth/sync-profile` to mirror profiles.
