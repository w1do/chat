<?php

declare(strict_types=1);

namespace Vendor\Notifications\Infrastructure\Push;

use RuntimeException;

/** Push-сервис ответил ошибкой: задание будет повторено по политике очереди. */
final class PushDeliveryFailed extends RuntimeException {}
