// Must run first — validates all required env vars and exits if any are missing
const config = require("./config");

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");
const morgan = require("morgan");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const allowedOrigins = require("./config/allowedOrigins");
const logger = require("./utils/logger");
const { generalLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler } = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./routes/authRoutes");
const diagnosisRoutes = require("./routes/diagnosisRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

// Passport config
require("./config/passport");

const app = express();

// ── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ── Compression (gzip all responses) ─────────────────────────────────────────
app.use(compression());

// ── Request logging ───────────────────────────────────────────────────────────
if (config.NODE_ENV === "production") {
  app.use(morgan("combined", { stream: logger.accessStream }));
} else {
  app.use(morgan("dev"));
}

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
    },
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── Paystack webhook: raw body MUST be registered before express.json ─────────
// express.raw() captures the raw body so HMAC can be verified in the handler.
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

// ── Body parsing (tight limits) ───────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ── NoSQL injection prevention ────────────────────────────────────────────────
app.use(mongoSanitize());

// ── XSS sanitization ─────────────────────────────────────────────────────────
app.use(xssClean());

// ── HTTP parameter pollution ──────────────────────────────────────────────────
app.use(hpp({ whitelist: ["sort", "filter", "page", "limit"] }));

// ── General rate limiter ──────────────────────────────────────────────────────
app.use("/api/", generalLimiter);

// ── Passport ─────────────────────────────────────────────────────────────────
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/diagnosis", diagnosisRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date() }),
);

// ── Error handling ────────────────────────────────────────────────────────────
app.use("*", notFound);
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () =>
  logger.info(`CropIntel server running on port ${PORT} [${config.NODE_ENV}]`),
);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received. Closing server...`);
  server.close(async () => {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed. Exiting.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = app;
