## Purpose

Defines the runtime contract for starting, supervising, health checking, and operating the self-hosted chat stack through Docker Compose and supported Linux/VM process configuration.

## ADDED Requirements

### Requirement: Compose starts the full stack
The self-hosted bundle SHALL start all required local services with one documented `docker compose up -d` command after environment values are provided.

#### Scenario: One command startup
- **WHEN** an operator runs the documented Compose startup command
- **THEN** the API, web frontend, queue worker, scheduler, Reverb, Horizon, PostgreSQL, Redis, Typesense, reverse proxy, and configured storage/mail support services are created with health checks or documented readiness probes

### Requirement: Runtime exposes health and readiness
The system SHALL expose liveness and dependency readiness checks without leaking secrets or private operational details.

#### Scenario: Dependency readiness check
- **WHEN** the readiness endpoint is requested by an authorized or internal health checker
- **THEN** it reports the status of Octane API, PostgreSQL, Redis, Horizon, Reverb, and Typesense in a machine-readable response

### Requirement: Long-running Laravel processes are controlled
The Linux/VM bundle SHALL include Supervisor configuration for Octane, Horizon, scheduler, and Reverb processes.

#### Scenario: Supervisor profile review
- **WHEN** the Supervisor configuration is inspected
- **THEN** each long-running process has autostart, autorestart, group termination, non-root execution, separated logs, and stop timing that preserves in-flight work

### Requirement: Deploy reloads running workers safely
The release procedure SHALL reload long-running workers so old code is not left serving requests or jobs after deployment.

#### Scenario: Deployment reload
- **WHEN** an operator follows the deployment procedure
- **THEN** Octane workers are gracefully reloaded, Horizon is terminated for restart by the process monitor, Reverb is restarted, and post-deploy smoke checks validate HTTP, queues, and WebSocket delivery

### Requirement: Persistent data is protected
The self-hosted runtime SHALL document persistent volumes, backup, restore, and upgrade behavior for all stateful services.

#### Scenario: Restore procedure validation
- **WHEN** an operator follows the documented restore procedure on a clean environment
- **THEN** PostgreSQL data, uploaded files, search indexes or reindex instructions, and required application secrets are restored to a usable state

