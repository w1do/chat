# Чек-лист релиза

Статус: implemented

Каждый пункт — команда или шаг workflow. Ручных действий без описания здесь
быть не должно.

## 1. До тега

```bash
./tools/chat ci                 # линт, анализ, тесты, границы, статусы, контракты
./tools/chat build images       # production-образы api и web
./tools/chat compose config     # оба профиля
./tools/chat e2e critical       # регистрация, переписка двоих, real-time, помощник
```

- `CHANGELOG.md` дополнен по Keep a Changelog, версия проставлена;
- `SUMMARY.md` отражает фактическое состояние модулей;
- upgrade notes для релиза написаны (`docs/operations/upgrade.md` + текст релиза);
- миграции только forward-совместимые.

## 2. Тег

```bash
git tag -s vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

Подписанный тег запускает `release.yml`, который делает:

- сборку образов на linux/amd64 и linux/arm64 с тегами `vX.Y.Z` (без `latest`
  в качестве версии установки);
- SBOM (CycloneDX) для каждого образа;
- SHA256-checksum образов и compose-бандла;
- provenance/подпись (cosign, keyless OIDC);
- публикацию GitHub Release с changelog, upgrade notes и бандлом
  `compose.prod.yaml` + `.env.example`.

## 3. Staging

`deploy-staging.yml` разворачивает тег на staging и запускает
`./tools/chat smoke runtime`, `smoke websocket` и `e2e critical`.

## 4. Production

`deploy-production.yml` — защищённый environment с ручным одобрением:

1. резервная копия БД (`docs/operations/backup-restore.md`);
2. `docker compose pull && up -d`;
3. `php artisan migrate --force`;
4. `./tools/chat deploy reload`;
5. `./tools/chat smoke runtime` и проверка реальной доставки события.

Откат — предыдущие теги образов в `.env` и `up -d`; при несовместимой миграции
восстановление БД из копии шага 1.

## 5. После релиза

- проверить, что advisory (если были исправления безопасности) опубликованы;
- отметить в `SUMMARY.md` статусы `verified` там, где прошли smoke/E2E.
