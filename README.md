# Task Control System (Microservices)

Микросервисная система для управления пользователями и заказами со шлюзом API.

## Сервисы
- `api_gateway` — единая точка входа, проверка JWT, CORS, rate limit, проксирование `/users` и `/orders`.
- `service_users` — регистрация, вход, профиль, список пользователей (admin).
- `service_orders` — создание, просмотр, изменение статуса и отмена заказов.

## Быстрый старт (Dev)
```bash
cp .env.example .env.development
docker compose up --build
# Шлюз: http://localhost:8080
```

## Переменные окружения
См. `.env.example` для всех сервисов. В проде используйте `.env.production`.

## Проверка
- Регистрация: `POST /users/v1/register`
- Вход: `POST /users/v1/login`
- Профиль: `GET /users/v1/profile`
- Создать заказ: `POST /orders/v1/orders`
- Список заказов: `GET /orders/v1/orders`

Документация API: `docs/openapi.yaml` (черновик).
