---
name: architecture-ddd
description: "Apply this skill architecture-ddd rules"
license: MIT
metadata:
  author: UNIQDEVELOPER
---

# Layered DDD Architecture (BotSync Standard)

Domain-Driven Design (DDD) focused on the core domain and domain logic. This project follows a strict four-layer architecture to ensure scalability, security, and maintainability.

## Core Layers

### 1. Presentation Layer (`app/Presentation`)
Responsibility: Handling external inputs (HTTP, CLI) and returning formatted responses.
- **Controllers**: Thin. They only handle input validation and delegation to the Application layer.
- **Inertia Pages**: React components receiving props from Controllers.
- **Resources / DTOs**: Use `spatie/laravel-data` as both Requests and Responses.
- **Rules**: No business logic. No direct database queries. No persistence.

### 2. Application Layer (`app/Application`)
Responsibility: Orchestrating domain objects to satisfy specific use cases (user stories).
- **Actions**: Atomic classes like `CreateOrderAction`.
- **Commands & Handlers**: For CQRS-based state changes (Write).
- **Queries**: For CQRS-based data retrieval (Read).
- **DTOs**: Typed data structures for passing data between layers.
- **Rules**: Handles transactions. Coordinates multiple domain entities. No low-level infrastructure details.

### 3. Domain Layer (`app/Domain`)
Responsibility: Pure business logic, rules, and state transitions.
- **Models**: "Rich" Eloquent models containing business logic and domain rules.
- **Value Objects**: Immutable objects like `Money` (stored as integers/kopecks).
- **Enums**: For state and type definitions.
- **Contracts (Interfaces)**: Abstractions for repositories or external services.
- **Events**: Domain events triggered by state changes.
- **Rules**: Must be infrastructure-agnostic. No direct API calls or file system access.

### 4. Infrastructure Layer (`app/Infrastructure`)
Responsibility: Implementation of technical details and external integrations.
- **Repositories**: Concrete implementations of Domain contracts using Eloquent or other drivers.
- **External Services**: API clients (Polza AI, SerpApi), Payment Gateways, Mailers.
- **Service Providers**: Binding interfaces to implementations.
- **Rules**: Handles technical exceptions. No business logic.

## Key Principles

1. **Dependency Inversion**: Domain and Application layers must depend on abstractions (interfaces), not implementations.
2. **Thin Controllers**: Controllers should only handle request/response transformation.
3. **Rich Models**: Business logic belongs in Models or Domain Services, not in controllers or broad services.
4. **Data Integrity**: 
   - Use **Money VO** for all financial calculations (integers).
   - Use **Database Transactions** for multi-step persistence.
   - Use **lockForUpdate()** for critical balance or state changes.
5. **Security First**: 
   - Use **Sanctum abilities** for fine-grained access.
   - Ensure record ownership (tenant isolation) at the Application layer.
   - Return UUID `error_id` for production exceptions.

## Directory Structure

```text
app/
├── Presentation/
│   └── Http/
│       ├── Controllers/
│       ├── Requests/
│       └── Resources/
├── Application/
│   ├── Actions/
│   ├── Commands/
│   ├── Handlers/
│   ├── Queries/
│   └── DTOs/
├── Domain/
│   ├── {DomainName}/
│   │   ├── Models/
│   │   ├── Enums/
│   │   ├── ValueObjects/
│   │   ├── Contracts/
│   │   └── Events/
└── Infrastructure/
    ├── Persistence/
    ├── Services/
    └── Providers/
```
