# Sushimi

Платформа сайта и CRM для локальной доставки суши. Проект строится как модульный монолит на Next.js, TypeScript и PostgreSQL.

## Локальная разработка

```powershell
Copy-Item .env.example .env.local
npm ci
docker compose --env-file .env.local up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Локальный `docker-compose.yml` запускает только PostgreSQL и SeaweedFS. Next.js работает напрямую на компьютере через `npm run dev`, поэтому изменения кода сразу появляются в браузере. `db:seed` выполняется только один раз для тестового наполнения. При следующих запусках достаточно выполнить `docker compose --env-file .env.local up -d` и `npm run dev`. Остановить локальную инфраструктуру можно командой `docker compose down`.

- Витрина: http://localhost:3000
- Каркас CRM: http://localhost:3000/admin
- Проверка процесса: http://localhost:3000/api/health

`db:seed` нужен только для первоначального демонстрационного наполнения. Не запускайте его в рабочей базе: удалённые демонстрационные позиции будут созданы повторно.

Витрина читает меню из PostgreSQL. Оформленный заказ проходит серверную проверку, сохраняется вместе со снимком названий и цен и сразу появляется в CRM. Архитектурные решения описаны в `docs/architecture.md`.

## CRM

- `/admin/orders` — живая доска кухни и выдачи со статусами заказов.
- `/admin/customers` — клиенты, повторные покупки, средний чек и сегменты.
- `/admin/analytics` — выручка, популярные позиции и способы получения.
- `/admin/catalog` — товары, фотографии, цены и оперативный стоп-лист.
- `/admin/ingredients` — закупочные цены, упаковки и ингредиенты для расчёта себестоимости.
- `/admin/settings` — параметры магазина, заказов и доставки.

CRM пока работает в демонстрационном режиме без авторизации. До размещения в интернете административные маршруты и API необходимо закрыть сессиями и проверкой ролей.

## Изображения

Фотографии товаров загружаются из CRM в локальное S3-совместимое хранилище SeaweedFS. В PostgreSQL сохраняется только ключ объекта, а сами файлы находятся в Docker volume `media_data` и переживают обычные перезапуски контейнеров.

Для production достаточно изменить переменные `S3_*` на реквизиты облачного S3-хранилища. Код загрузки и данные товаров менять не потребуется. Не используйте `docker compose down -v`, если хотите сохранить локальную базу и изображения.

## Развёртывание на сервере

На сервере нужны Docker Engine, Docker Compose, открытые порты `80` и `443`, а также DNS-запись домена на IP сервера.

```bash
cp .env.production.example .env
# Укажите домен и замените пароли в .env
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app caddy
```

Production использует отдельный `docker-compose.prod.yml` и готовый образ из `APP_IMAGE`. Контейнер `app` перед каждым запуском автоматически применяет только новые миграции и создаёт пустые базовые настройки доставки, если база новая. Seed и демонстрационные товары автоматически не запускаются. Caddy получает и обновляет HTTPS-сертификат, если `SITE_ADDRESS` содержит домен. Для первого запуска по IP задайте `SITE_ADDRESS=http://SERVER_IP`.

Обновление приложения:

```bash
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d
```

Резервная копия PostgreSQL и загруженных изображений:

```bash
sh scripts/backup.sh
```

Архивы появятся в `./backups`. Храните их не только на самом сервере.

## Перенос локальных данных на сервер

Экспортируйте локальную PostgreSQL-базу и фотографии из корня проекта:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/export-local-data.ps1
scp -r backups/local-transfer root@SERVER_IP:/home/sushimi/local-transfer
```

На сервере выполните импорт:

```bash
cd /home/sushimi
sh scripts/import-production-data.sh --confirm-replace /home/sushimi/local-transfer
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 app
```

Импорт полностью заменяет production-базу локальной. Перед заменой скрипт автоматически сохраняет текущую базу и медиа в `./backups`. Медиаархив нужен обязательно: без него записи товаров перенесутся, но их фотографии не будут доступны.
