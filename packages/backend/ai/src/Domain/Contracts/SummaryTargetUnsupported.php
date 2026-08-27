<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Contracts;

use RuntimeException;

/** У сообщения нет ровно одного поддерживаемого документа в пределах лимитов. */
final class SummaryTargetUnsupported extends RuntimeException {}
