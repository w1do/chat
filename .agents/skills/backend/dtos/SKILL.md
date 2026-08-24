---
name: dtos
description: "Typed DTOs for data transfer between layers"
license: MIT
metadata:
  author: UNIQDEVELOPER
---

# Typed DTOs via `spatie/laravel-data`

This project uses `spatie/laravel-data` to enforce strict typing for data transfer between layers (Presentation, Application, and Domain). DTOs replace raw arrays and standard Eloquent API Resources.

## Core Principles

- **Single Source of Truth**: A single class can act as a Request (validation), a DTO (transfer), and a Resource (response).
- **Strict Typing**: All properties must have explicit types. Use nullable types (`?string`) where appropriate.
- **Constructor Property Promotion**: Always use PHP 8 promotion for clarity.
- **Validation via Attributes**: Define validation rules directly on properties using attributes like `#[Min(0)]`, `#[Max(100)]`, or `#[Email]`.

## Usage Patterns

### 1. Creating a Data Class

```php
namespace App\Application\DTOs;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Min;

class TransactionData extends Data
{
    public function __construct(
        public string $id,
        #[Min(1)]
        public int $amount, // Always in cents/kopecks (integers)
        public string $currency = 'RUB',
        public ?string $description = null,
    ) {}
}
```

### 2. Using as a Request (Auto-validation)
Inject the Data class directly into a Controller method to trigger automatic validation.

```php
public function store(TransactionData $data)
{
    // $data is already validated and instantiated
    $this->handler->handle($data);
}
```

### 3. Using as a Response (Resource replacement)
Return the Data class from a Controller to automatically transform it into a JSON response.

```php
public function show(string $id): TransactionData
{
    $transaction = Transaction::findOrFail($id);
    return TransactionData::from($transaction);
}
```

### 4. Lazy Properties and Relationships
Use `Lazy` to include related data only when explicitly requested via the `include` query parameter.

```php
public function __construct(
    public string $id,
    public Lazy|UserData $user,
) {}
```

## Transformation Rules

- **From Model**: Use `TransactionData::from($model)`.
- **From Request**: Handled automatically by Laravel if injected, or use `TransactionData::from($request)`.
- **Collections**: Use `TransactionData::collect($collection)`.

## BotSync Specific Rules

1. **Money**: Properties representing money must always be `int` (cents/kopecks).
2. **Naming**: Use the `Data` suffix for these classes (e.g., `UserData`, `PaymentData`).
3. **Location**: Place DTOs in `app/Application/DTOs` or module-specific subfolders.
