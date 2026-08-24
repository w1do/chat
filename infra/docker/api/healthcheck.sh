#!/bin/sh
# Liveness-проверка Octane API изнутри контейнера (без секретов).
set -eu

exec php -r '
$ch = curl_init("http://127.0.0.1:8000/up");
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 3]);
curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
exit($code === 200 ? 0 : 1);
'
