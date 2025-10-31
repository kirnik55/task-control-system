import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pino from "pino";
import pinoHttp from "pino-http";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

dotenv.config();
  // Создание приложения
const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
// Логирование через pino-http запрос, ответы и ошибки записываем в логи
const logger = pino({ level: process.env.NODE_ENV === "production" ? "info" : "debug" }); // Создание логгера 
app.use(pinoHttp({ logger }));  

const users = new Map(); 
const emailIndex = new Map(); 

// Request ID и пользователь из шлюза 
app.use((req, res, next) => {
  req.id = req.header("X-Request-ID") || randomUUID();  // id из шлюза или новый
  const xuser = req.header("X-User");  // Шлюз может передавать пользователя в заголовке X-User base64-encoded JSON
  if (xuser) {
    try { req.user = JSON.parse(Buffer.from(xuser, "base64").toString("utf8")); } catch {} 
  }
  next();
});

// Функция проверки JWT токена, если пользователь не установлен из заголовка шлюза
function verifyJWT(req, res, next) {
  if (req.user) return next();
  const header = req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: { code: "NO_TOKEN", message: "Authorization required" } });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "dev_secret_key");
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Invalid token" } });
  }
}

// Cхемы валидации через Zod
const registerSchema = z.object({  // схема регистрации пользователя
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});
const loginSchema = z.object({ // схема логина пользователя
  email: z.string().email(),
  password: z.string().min(6),
});
const profilePatchSchema = z.object({ // схема обновления профиля пользователя
  name: z.string().min(1).optional(),
  roles: z.array(z.string()).optional(), // роли - изменить может только админ
});

// Маршруты для регистрации и логина
app.post("/v1/register", (req, res) => {   // регистрация нового пользователя 
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
  }
  const { email, password, name } = parsed.data;
  if (emailIndex.has(email)) {
    return res.status(409).json({ success: false, error: { code: "EMAIL_EXISTS", message: "Email already registered" } });
  }
  const id = randomUUID();
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const now = new Date().toISOString();
  const user = { id, email, passwordHash, name, roles: ["user"], createdAt: now, updatedAt: now };
  users.set(id, user);
  emailIndex.set(email, id);
  logger.info({ id, email }, "User created");
  return res.status(201).json({ success: true, data: { id } });
});
// Аутентификация пользователя и выдача JWT токена 
app.post("/v1/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });
  }
  const { email, password } = parsed.data; // Берем email и password из тела запроса
  const id = emailIndex.get(email); // ищем пользователя по email
  if (!id) return res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Wrong email or password" } }); // Если не найден, возвращаем ошибку
  const user = users.get(id);   // Получаем пользователя по id
  if (!bcrypt.compareSync(password, user.passwordHash)) {   // Сравниваем пароль с хешем
    return res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Wrong email or password" } });  // Неверные учетные данные
  }
  const token = jwt.sign({ sub: user.id, email: user.email, roles: user.roles, name: user.name }, process.env.JWT_SECRET || "dev_secret_key", { expiresIn: "2h" });  // создаем JWT токена , время жизни 2 часа
  return res.json({ success: true, data: { token } });  // Присваем токен пользователю 
});

// Маршруты для управления профилем пользователя
app.get("/v1/profile", verifyJWT, (req, res) => {   // получение профиля пользователя
  const user = users.get(req.user.sub); // получаем пользователя по id из токена
  if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } }); // если не найден, возвращаем ошибку
  const { passwordHash, ...safe } = user;  // исключаем passwordHash из ответа
  return res.json({ success: true, data: safe }); // возвращаем профиль пользователя
});
// Обновление профиля пользователя 
app.patch("/v1/profile", verifyJWT, (req, res) => {  // патч профиля пользователя
  const parsed = profilePatchSchema.safeParse(req.body);  // валидация входных данных через Zod
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } });// ошибка валидации
  }
  const user = users.get(req.user.sub);   // текущий пользователь 
  if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } }); // пользователь не найден
  // Только администратор может менять роли
  if (parsed.data.roles && !(req.user.roles || []).includes("admin")) {
    return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
  }
  Object.assign(user, parsed.data, { updatedAt: new Date().toISOString() });
  const { passwordHash, ...safe } = user;
  return res.json({ success: true, data: safe });
});

app.get("/v1/users", verifyJWT, (req, res) => { // Получение списка всех пользователей (только для админа)
  if (!((req.user.roles || []).includes("admin"))) {   // Проверка роли администратора
    return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Admin only" } }); // Доступ запрещен
  }
  // Пагинация и фильтры
  const page = Math.max(1, parseInt(req.query.page ?? "1", 10)); // Текущая страница
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? "10", 10))); // Лимит до 100 пользователей на страницу
  const offset = (page - 1) * limit;
  const list = Array.from(users.values()).slice(offset, offset + limit).map(u => {
    const { passwordHash, ...safe } = u;
    return safe;      
  });
  return res.json({ success: true, data: { items: list, page, limit, total: users.size } });
});
// Запуск сервера и логирование
const port = Number(process.env.USERS_PORT) || 3001;  
app.listen(port, () => {
  logger.info({ port }, "Users service started");
});
