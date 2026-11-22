# TestBlast

Прототип головоломки «Blast» на Cocos Creator 2.4.15 + автотесты чистой логики на Jest.

Игра: https://tvix57.github.io/TestBlast/

## Требования

- Cocos Creator **2.4.15** (путь к редактору можно переопределить переменной `COCOS_CREATOR_BIN`);
- Node.js 18+;
- Python 3 (только для `npm run assets:check` и локального предпросмотра).

## Команды

| Команда | Что делает |
| --- | --- |
| `npm test` | Jest-тесты логики (`assets/scripts/core`, layout) |
| `npm run test:coverage` | Тесты с покрытием (порог 95/90) |
| `npm run typecheck` / `typecheck:assets` / `typecheck:test` | Проверка типов |
| `npm run assets:check` | Валидация метаданных ассетов |
| `npm run verify` | typecheck + тесты + валидация ассетов |
| `npm run build:web` | Сборка web-mobile через CLI Cocos Creator → `build/web-mobile` |
| `npm run pages:prepare` | Копирование сборки в `docs/` + `.nojekyll` |
| `npm run pages:build` | `build:web` + `pages:prepare` |
| `npm run pages:publish` | `pages:build` + публикация `docs/` в ветку `build` (её корень раздаёт GitHub Pages) |
| `npm run pages:serve` | Локальный предпросмотр `docs/` на http://localhost:8080 |

## Публикация на GitHub Pages

Pages в репозитории настроен на ветку **`build`**, папка **`/`** (Settings → Pages → Deploy from a branch).
Ветка `build` — это чистый артефакт: в её корне лежат `index.html`, `assets/`, `cocos2d-js-min.*.js` и `.nojekyll`.

Полный цикл одной командой:

```bash
npm run pages:publish
```

Что происходит:

1. Cocos Creator собирает `web-mobile` (`debug=false`, `md5Cache=true`) в `build/web-mobile`;
2. сборка копируется в `docs/` и дополняется `.nojekyll`;
3. `tools/publish-pages.mjs` создаёт коммит поверх `origin/build`, полностью заменяя содержимое ветки файлами из `docs/`, и делает `git push`. Рабочая копия и текущая ветка при этом не меняются.

Pages пересобирает сайт примерно за минуту после пуша. Все пути в сборке относительные,
поэтому она корректно работает из подпапки `/TestBlast/`.

`docs/` в git не хранится (см. `.gitignore`) — источник правды для сайта это ветка `build`.
