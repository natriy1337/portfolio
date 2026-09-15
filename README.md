Портфолио веб-работ.

https://natriy1337.github.io/portfolio/

## Автообновление превью

Раз в сутки скрипт снимает актуальные скриншоты клиентских сайтов (Playwright) и коммитит их в `images/`.

**Один раз включить Actions** (токен push не может создать workflow сам):

1. Открой репозиторий на GitHub → **Add file** → **Create new file**
2. Путь: `.github/workflows/update-previews.yml`
3. Вставь содержимое из [`scripts/update-previews.workflow.yml`](./scripts/update-previews.workflow.yml) → Commit
4. Actions → **Update project previews** → **Run workflow** (проверка)

Дальше снимки обновляются сами каждый день (~06:00 МСК). Локально: `npm install && npx playwright install chromium && npm run capture`.

Список сайтов: `scripts/projects.json`.
