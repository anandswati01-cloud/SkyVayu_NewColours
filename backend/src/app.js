const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

const { ALLOWED_ORIGINS, NODE_ENV, IS_PRODUCTION, TRUST_PROXY } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const queryRoutes = require('./routes/queryRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const fleetRoutes = require('./routes/fleetRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const operatorRoutes = require('./routes/operatorRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// -----------------------------------------------------------------------------
// Proxy
// -----------------------------------------------------------------------------
// Behind Render/Vercel, the client IP arrives in X-Forwarded-For. Without this
// the rate limiter would see the proxy IP and throttle every user as one.
app.set('trust proxy', TRUST_PROXY);

// -----------------------------------------------------------------------------
// Security
// -----------------------------------------------------------------------------
app.use(helmet());

// -----------------------------------------------------------------------------
// CORS
// -----------------------------------------------------------------------------
app.use(cors({
  origin: (origin, callback) => {

    // Allow requests without origin
    // (Postman, curl, mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    // Allow localhost on ANY port — development only. In production this would
    // let a page served from a developer's machine call the live API.
    if (
      !IS_PRODUCTION &&
      (/^http:\/\/localhost:\d+$/.test(origin) ||
       /^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
    ) {
      return callback(null, true);
    }

    // Allow origins configured via ALLOWED_ORIGINS
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    console.error(`[cors] Blocked origin: ${origin}`);

    // Without an explicit status this surfaces as a confusing 500.
    const err = new Error(`CORS policy: ${origin} is not allowed.`);
    err.status = 403;
    return callback(err);
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'apikey'
  ]
}));

// -----------------------------------------------------------------------------
// Body Parser
// -----------------------------------------------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({
  extended: true,
  limit: '1mb'
}));

// -----------------------------------------------------------------------------
// Compression
// -----------------------------------------------------------------------------
app.use(compression());

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------
if (NODE_ENV !== 'test') {
  app.use(
    morgan(
      NODE_ENV === 'production'
        ? 'combined'
        : 'dev'
    )
  );
}

// -----------------------------------------------------------------------------
// Rate Limiter
// -----------------------------------------------------------------------------
app.use('/api', apiLimiter);

// -----------------------------------------------------------------------------
// Health Check
// -----------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    env: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// -----------------------------------------------------------------------------
// 404
// -----------------------------------------------------------------------------
app.use(notFound);

// -----------------------------------------------------------------------------
// Error Handler
// -----------------------------------------------------------------------------
app.use(errorHandler);

module.exports = app;