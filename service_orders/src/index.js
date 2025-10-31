import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pino from "pino";
import pinoHttp from "pino-http";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

dotenv.config();
// Создание приложения 
const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

const logger = pino({ level: process.env.NODE_ENV === "production" ? "info" : "debug" });
app.use(pinoHttp({ logger })); // Логирование через pino-http запрос, ответы и ошибки записываем в логи

const orders = new Map(); // id -> order
// Request ID и пользователь из шлюза
app.use((req, res, next) => {
  req.id = req.header("X-Request-ID") || randomUUID(); // Берем от шлюза или генерируем новый
  const xuser = req.header("X-User"); // Шлюз может передавать пользователя в заголовке X-User base64-encoded JSON
  if (xuser) {
    try { req.user = JSON.parse(Buffer.from(xuser, "base64").toString("utf8")); } catch {} // base 64 -> utf8 - JSON.parse
  }
  next();
});

function verifyJWT(req, res, next) { // проверка JWT токена, если пользователь не установлен из заголовка шлюза
  if (req.user) return next(); // уже есть пользователь из заголовка шлюза
  const header = req.header("Authorization") || ""; // Получаем заголовок авторизации 
  const token = header.startsWith("Bearer ") ? header.slice(7) : null; // Извлекаем токен
  if (!token) return res.status(401).json({ success: false, error: { code: "NO_TOKEN", message: "Authorization required" } }); // Нет токена
  try { 
    req.user = jwt.verify(token, process.env.JWT_SECRET || "dev_secret_key"); // Проверяем токен
    next(); // Валидный токен
  } catch (e) {
    return res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Invalid token" } }); // Невалидный токен
  }
}
// Валидация входных данных через Zod
const orderItemSchema = z.object({  // схема элемента заказа
  product: z.string().min(1),  // product не меньше 1 символа 
  quantity: z.number().int().positive(), // quantity положительное целое число
  price: z.number().nonnegative().optional(), // price неотрицательное число
});
const createOrderSchema = z.object({  // схема создания заказа
  items: z.array(orderItemSchema).nonempty(), // массив элементов заказа, не пустой
});

const updateStatusSchema = z.object({  // схема обновления статуса заказа
  status: z.enum(["created", "in_progress", "done", "canceled"]), // статус заказа 
});


function computeTotal(items) {  // Функция вычисления общей стоимости заказа
  return items.reduce((sum, it) => sum + (it.price ? it.price * it.quantity : 0), 0);  
}

// Маршруты для управления заказами
app.post("/v1/orders", verifyJWT, (req, res) => { // post /v1/orders - создание заказа требует аутентификации
  const parsed = createOrderSchema.safeParse(req.body); // валидация входных данных через Zod 
  if (!parsed.success) {  // Ошибка валидации 
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } }); // Возвращаем ошибку 400 с сообщением об ошибке
  }
  const id = randomUUID();  // Генерируем уникальный идентификатор заказа
  const now = new Date().toISOString();  // Текущее время в ISO формате
  const total = computeTotal(parsed.data.items);   // Вычисляем общую стоимость заказа
  const order = {   // Создаем объект заказа
    id,
    userId: req.user.sub,
    items: parsed.data.items,
    status: "created",
    total,
    createdAt: now,
    updatedAt: now,
  };
  orders.set(id, order);
  logger.info({ id, userId: req.user.sub }, "Order created");  // Логируем создание заказа
  return res.status(201).json({ success: true, data: order }); // Возвращаем созданный заказ с кодом 201
});
 // Получение списка заказов с пагинацией
app.get("/v1/orders", verifyJWT, (req, res) => {    
  const page = Math.max(1, parseInt(req.query.page ?? "1", 6));
  const limit = Math.min(5, Math.max(1, parseInt(req.query.limit ?? "6", 6))); // максимум 5 заказов на страницу
  const offset = (page - 1) * limit;
  const isAdmin = (req.user.roles || []).includes("admin");
  const all = Array.from(orders.values()).filter(o => isAdmin ? true : o.userId === req.user.sub);
  const slice = all.slice(offset, offset + limit);
  return res.json({ success: true, data: { items: slice, page, limit, total: all.length } });
});
// Получение конкретного заказа по ID 
app.get("/v1/orders/:id", verifyJWT, (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Order not found" } });
  const isAdmin = (req.user.roles || []).includes("admin");
  if (!isAdmin && order.userId !== req.user.sub) {
    return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }
  return res.json({ success: true, data: order });
});
// Обновление статуса заказа
app.patch("/v1/orders/:id", verifyJWT, (req, res) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
  }
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Order not found" } });
  const isAdmin = (req.user.roles || []).includes("admin");
  if (!isAdmin && order.userId !== req.user.sub) {
    return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } });
  }
  order.status = parsed.data.status;
  order.updatedAt = new Date().toISOString();
  return res.json({ success: true, data: order });
});
// Отмена заказа
app.delete("/v1/orders/:id", verifyJWT, (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Order not found" } });
  if (order.userId !== req.user.sub) {
    return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only owner can cancel" } });
  }
  order.status = "canceled";
  order.updatedAt = new Date().toISOString();
  return res.json({ success: true, data: order });
});
// Запуск сервера
const port = Number(process.env.ORDERS_PORT) || 3002;
app.listen(port, () => {
  logger.info({ port }, "Orders service started");
});
