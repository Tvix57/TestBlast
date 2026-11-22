# TestBlast

Прототип головоломки «Blast» на Cocos Creator 2.4.15 + автотесты чистой логики на Jest.

## Требования

- Cocos Creator **2.4.15** (путь к редактору можно переопределить переменной `COCOS_CREATOR_BIN`);
- Node.js 18+;
- Python 3 (только для `npm run assets:check`).

## Команды

| Команда | Что делает |
| --- | --- |
| `npm test` | Jest-тесты логики (`assets/scripts/core`, layout) |
| `npm run test:coverage` | Тесты с покрытием (порог 95/90) |
| `npm run typecheck` / `typecheck:assets` / `typecheck:test` | Проверка типов |
| `npm run assets:check` | Валидация метаданных ассетов |
| `npm run verify` | typecheck + тесты + валидация ассетов |
| `npm run build:web` | Сборка web-mobile через CLI Cocos Creator → `build/web-mobile` |
| `npm run pages:prepare` | Копирование сборки в `docs/` + `.nojekyll` (артефакт Pages) |
| `npm run pages:build` | `build:web` + `pages:prepare` — полная сборка для GitHub Pages |
| `npm run pages:serve` | Локальный предпросмотр `docs/` на http://localhost:8080 |

## Публикация на GitHub Pages

1. Собрать артефакт локально:

   ```bash
   npm run pages:build
   ```

   Появятся `build/web-mobile` (сборка `debug=false`, `md5Cache=true`) и `docs/` — готовый статический сайт.
   Все пути в нём относительные, поэтому он корректно работает из подпапки `/TestBlast/`.

2. Закоммитить `docs/` и workflow:

   ```bash
   git add docs .github/workflows/deploy-pages.yml
   git commit -m "build: web build for GitHub Pages"
   git push
   ```

3. В настройках репозитория: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   Workflow `.github/workflows/deploy-pages.yml` опубликует `docs/` при каждом пуше в `main`, который меняет `docs/`.
   Игра будет доступна по адресу https://tvix57.github.io/TestBlast/

   Альтернатива без Actions: **Source: Deploy from a branch → ветка `main`, папка `/docs`**.

`docs/` — генерируемый каталог, но он хранится в репозитории намеренно: Cocos Creator
не собирается в CI без установленного редактора, поэтому сборка делается локально, а CI только публикует готовые файлы.
