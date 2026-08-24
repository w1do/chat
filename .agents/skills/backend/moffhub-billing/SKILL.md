# Moffhub Billing

Feature-based subscription billing for Laravel with first-class African payment provider support.

Define plans, gate features, track usage, and accept payments through a unified interface.

## Why This Package?

This package provides:

- **Feature gating** — Gate routes by feature slug, not plan name. Plans are bundles of features.
- **Usage metering** — Track and enforce limits on metered features (API calls, storage, etc.).
- **Provider-agnostic payments** — Supports various drivers behind one interface.
- **Subscription lifecycle** — Trials, renewals, cancellations, and plan upgrades with proration.
- **Data Integrity** — Uses **Money Value Object** (integers) for all financial fields to prevent precision issues.

## Implementation Guide (BotSync Standard)

### 1. Add the Billable Trait
Add `Billable` to the model representing your paying entity (User, Team, Company):

```php
use Moffhub\Billing\Traits\Billable;

class User extends Model
{
    use Billable;
}
```

### 2. Money and Units
**Crucial**: All amounts in the database are stored as **integers** (e.g., kopecks/cents).
- `base_price` of 750000 represents 7,500.00.
- Use `round($amount * 100)` when converting from main currency units.

### 3. Gating Features

**Middleware** — Protect routes by feature or plan:

```php
// Require a specific feature
Route::middleware(['feature:premium_search'])->group(function () {
    Route::post('search', SearchController::class);
});

// Enforce usage limits
Route::middleware(['feature:ai_ask', 'usage:ai_ask'])->group(function () {
    Route::post('assistant/ask', AskController::class);
});
```

**Blade** — Show/hide UI elements:

```blade
@feature('premium_search')
    <div id="search-advanced">...</div>
@endfeature
```

### 4. Tracking Usage

```php
use Moffhub\Billing\Services\UsageService;

$usage = app(UsageService::class);

// Record a usage event (idempotent with transactionId)
$usage->record($user, 'ai_ask', quantity: 1, transactionId: 'request-uuid');

// Check limits
if (!$usage->isWithinLimit($user, 'ai_ask')) {
    throw new UsageLimitExceededException();
}
```

## Security and Integrity Rules

1. **Transactional Operations**: Always wrap balance-modifying or subscription-changing logic in a database transaction.
2. **Concurrency**: Use `lockForUpdate()` when modifying sensitive user balances or usage counters.
3. **Record Ownership**: Always verify that the current user owns the `billable` entity before performing actions.
4. **Idempotency**: Use `transactionId` in `UsageService::record()` to prevent double-counting of metered events.
5. **No Floats**: Never use floating-point numbers for money calculations. Use the `Money` VO or integer math.

## API Resources

The package includes a full REST API for:
- Plans and Features CRUD.
- Subscription management.
- Usage tracking and summaries.
- Payment initiation and webhook handling.

See the internal `API.md` for full endpoint documentation.
