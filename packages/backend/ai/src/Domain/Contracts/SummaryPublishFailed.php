<?php

declare(strict_types=1);

namespace Vendor\Ai\Domain\Contracts;

use RuntimeException;

/** Комната архивирована, удалена или человек в ней больше не состоит. */
final class SummaryPublishFailed extends RuntimeException {}
