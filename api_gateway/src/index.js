import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import pino from "pino";
import pinoHttp from "pino-http";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

dotenv.config();
// Создание приложения
const app = express();
// Логгер 
const logger = pino({ level: process.env.NODE_ENV === "production" ? "info" : "debug" });
app.use(pinoHttp({ logger }));

// CORS
app.use(cors({ origin: true, credentials: true })); // credentials - для cookies  

// Присвоение Request ID
app.use((req, res, next) => {
  const id = req.header("X-Request-ID") || randomUUID();
  req.id = id;
  res.setHeader("X-Request-ID", id);
  next();
});

// Лиммитер 
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,// max запросов с одного IP в минуту
  standardHeaders: true, 
  legacyHeaders: false, 
});
app.use(limiter);

// Health
app.get("/health", (req, res) => res.json({ success: true, data: { status: "ok" } }));

app.get("/", (req, res) => {
  res.type("text/plain").send(
    "API Gateway is running.\n" +
    "Health: /health\n" +
    "Users API: /users/v1/...\n" +
    "Orders API: /orders/v1/..."
  );
});

// ПРОВЕРКА JWT: публичные — /users/v1/register и /users/v1/login
function isProtected(req) {
  // baseUrl = "/users" или "/orders" при монтировании; path = "/v1/..."
  const fullPath = `${req.baseUrl || ""}${req.path || ""}`;
  const publicEndpoints = [
    { method: "POST", pattern: /^\/users\/v1\/register$/ },
    { method: "POST", pattern: /^\/users\/v1\/login$/ },
    { method: "GET",  pattern: /^\/health$/ },
  ];
  const isPublic = publicEndpoints.some(e => e.method === req.method && e.pattern.test(fullPath));
  return !isPublic;
}

function verifyJWT(req, res, next) {
  if (!isProtected(req)) return next();
  const header = req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: { code: "NO_TOKEN", message: "Authorization required" } });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret_key");
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Invalid token" } });
  }
}
// Внутренние сервисы, пути 
const usersTarget = process.env.USERS_URL || "http://service_users:3001";
const ordersTarget = process.env.ORDERS_URL || "http://service_orders:3002";
// Настройки прокси 
const commonProxyOptions = (target) => ({
  target,
  changeOrigin: true,
  pathRewrite: (path) => path.replace(/^\/(users|orders)/, ""), 
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader("X-Request-ID", req.id);
    if (req.user) proxyReq.setHeader("X-User", Buffer.from(JSON.stringify(req.user)).toString("base64"));
  },
  logProvider: () => ({
    log: logger.info.bind(logger),
    debug: logger.debug.bind(logger),
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
  }),
});

// Защита и прокси 
app.use("/users", verifyJWT, createProxyMiddleware(commonProxyOptions(usersTarget)));
app.use("/orders", verifyJWT, createProxyMiddleware(commonProxyOptions(ordersTarget)));

const port = Number(process.env.GATEWAY_PORT) || 8080;
//  8080 внутри контейнера порт проброшен наружу как 8080:8080)
app.listen(8080, () => {
  logger.info({ port: 8080 }, "API Gateway started");
});
