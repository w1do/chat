# Supervisor (Linux/VM-профиль)

Статус: in progress

Версионируемые конфиги — `infra/supervisor/*.conf`: `octane.conf`,
`horizon.conf`, `scheduler.conf`, `reverb.conf` + корневой `supervisord.conf`.

Принципы (CLAUDE.md §14):

- процессы от непривилегированного пользователя `chat`;
- `autostart`/`autorestart`, `stopasgroup=true`, `killasgroup=true`;
- `stopwaitsecs` Horizon (120s) превышает самую долгую job;
- раздельные логи в `/var/log/chat/`.

Установка: скопируйте конфиги в `/etc/supervisor/conf.d/`, создайте
пользователя `chat` и каталог логов, затем `supervisorctl reread && update`.

Не путайте Supervisor ОС с supervisor-группами Horizon в `config/horizon.php`.

Проверка синтаксиса: `./tools/chat supervisor check`.
