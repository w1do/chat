# Refactoring to DDD, CQRS, and DTO Standards

This skill provides a systematic approach for refactoring legacy Laravel code into a four-layer DDD architecture using CQRS patterns and typed DTOs.

## Core Principles

### 1. Four-Layer Architecture
Reorganize logic into these layers:
- **Presentation Layer (`app/Presentation`)**: Thin controllers, FormRequests, and Inertia Pages.
- **Application Layer (`app/Application`)**: 
    - **Actions**: Atomic business use cases.
    - **Commands & Handlers**: For state-changing operations (Write).
    - **Queries**: For data retrieval operations (Read).
    - **DTOs**: Typed data transfer objects (`spatie/laravel-data`).
- **Domain Layer (`app/Domain/{DomainName}`)**: Rich models, Value Objects (Money), Enums, and Contracts.
- **Infrastructure Layer (`app/Infrastructure`)**: Concrete repository implementations and external service adapters (e.g., Polza AI).

### 2. Typed DTOs
Stop passing raw arrays between layers. Use `spatie/laravel-data` classes.
- Use constructor property promotion.
- Implement validation via attributes (`#[Min(0)]`, `#[Max(100)]`).
- Use `::from()` to instantiate from Requests or Arrays.

### 3. Separation of Read and Write (CQRS)
- **Commands**: DTOs representing the intent to change data.
- **Handlers**: Service classes that execute the business logic of a Command.
- **Queries**: Focused classes or methods for efficient data retrieval.

### 4. Thin Controllers
Controllers must only:
1. Receive the request.
2. Map it to a DTO/Command.
3. Call an Action or Handler.
4. Return a Response or Render a Page.

## Refactoring Process

1. **Test Coverage**: Ensure the existing functionality is covered by Pest tests.
2. **Define DTOs**: Create typed data structures for the data being moved.
3. **Extract Logic**: Move business logic from the controller to an Action or Handler.
4. **Simplify Controller**: Update the controller to delegate to the new layer.
5. **Update Documentation**: Update Swagger annotations and `removed.txt`.
6. **Validation**: Run Pint, PHPStan, and Pest via Sail.

## Quality Tools

- **Pint**: Fix code style (`./vendor/bin/sail pint --dirty --format agent`).
- **PHPStan**: Static analysis (`./vendor/bin/sail php vendor/bin/phpstan analyse`).
- **Pest**: Execute tests (`./vendor/bin/sail test --compact`).
- **Swagger**: API Documentation (`php artisan l5-swagger:generate`).
