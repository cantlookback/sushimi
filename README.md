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

На сервере нужны Docker Engine, Docker Compose, Nginx, открытые порты `80` и `443`, а также DNS-запись домена на IP сервера. Контейнер приложения публикуется только на `127.0.0.1:3000`; PostgreSQL и хранилище наружу не открываются.

```bash
cp .env.production.example .env
# Замените пароли в .env
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

Production использует отдельный `docker-compose.prod.yml` и готовый образ из `APP_IMAGE`. Контейнер `app` перед каждым запуском автоматически применяет только новые миграции и создаёт пустые базовые настройки доставки, если база новая. Seed и демонстрационные товары автоматически не запускаются.

Production-образ собирается с `basePath=/sushimi`, поэтому витрина доступна по `/sushimi/`, а CRM — по `/sushimi/admin`. Готовый Nginx-фрагмент находится в `deploy/nginx/sushimi.conf`. На сервере с ISPmanager подключите его к уже существующему виртуальному хосту `olddays.ru`:

```bash
cp deploy/nginx/sushimi.conf /etc/nginx/vhosts-resources/olddays.ru/sushimi.conf
nginx -t
systemctl reload nginx
```

Существующий сертификат `olddays.ru` продолжает использоваться общим виртуальным хостом. WordPress остаётся на `/`, а n8n и CloudBeaver сохраняют свои текущие пути. Если порт `3000` занят, измените `APP_PORT` в `.env` и тот же порт в `proxy_pass` Nginx.

Обновление приложения:

```bash
sh update_site.sh
```

Резервная копия PostgreSQL и изображений создаётся в едином переносимом формате:

```bash
sh scripts/backup.sh
```

Появится каталог `./backups/production-YYYYMMDD-HHMMSS` с файлами `database.dump` и `media.tar.gz`. Изображения экспортируются через S3 API, поэтому резервная копия не зависит от внутреннего формата Docker volume SeaweedFS. Храните копии не только на самом сервере.

## Перенос локальных данных на сервер

Полный перенос выполняется одной командой из PowerShell в корне проекта. Она соберёт и опубликует образ, экспортирует данные, отправит необходимые файлы и запустит импорт:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/transfer-to-server.ps1 `
  -Server root@SERVER_IP `
  -ConfirmReplace
```

Если образ уже опубликован, добавьте `-SkipImagePublish`.

Для ручного переноса сначала экспортируйте локальную PostgreSQL-базу и фотографии:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/export-local-data.ps1
scp backups/local-transfer/database.dump backups/local-transfer/media.tar.gz root@SERVER_IP:/home/sushimi/local-transfer/
```

На сервере выполните импорт:

```bash
cd /home/sushimi
sh scripts/import-production-data.sh --confirm-replace /home/sushimi/local-transfer
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 app
```

Импорт полностью заменяет production-базу и содержимое S3-бакета локальными данными. Перед заменой скрипт автоматически создаёт совместимую резервную копию в `./backups/before-import-*`.

## Перенос production на другой сервер

На старом сервере создайте переносимую копию PostgreSQL и фотографий:

```bash
cd /home/sushimi
sh scripts/backup.sh /tmp/sushimi-transfer
scp -r /tmp/sushimi-transfer root@NEW_SERVER_IP:/home/sushimi/
```

На новом сервере сначала разместите проект и заполните `.env`, затем поднимите инфраструктуру и импортируйте пакет:

```bash
cd /home/sushimi
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d postgres object-storage
sh scripts/import-production-data.sh --confirm-replace /home/sushimi/sushimi-transfer
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 app
```

Если `olddays.ru` уже направлен на новый сервер, менять DNS не требуется. Старый сервер Sushimi не выключайте до проверки `/sushimi/`, `/sushimi/admin`, изображений и создания тестового заказа.
