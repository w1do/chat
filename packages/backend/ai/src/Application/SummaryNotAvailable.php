<?php

declare(strict_types=1);

namespace Vendor\Ai\Application;

use RuntimeException;

/** Черновик ещё не готов, уже опубликован или операция не удалась. */
final class SummaryNotAvailable extends RuntimeException {}
