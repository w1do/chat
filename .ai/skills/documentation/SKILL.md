---
name: documentation
description: "Apply this skill writing of documentations docs/symmary"
license: MIT
metadata:
  author: UNIQDEVELOPER
---

# Documentation Standard (BotSync)

This skill mandates the logging and documentation of implemented features, components, and completed functionality. It ensures a transparent and chronological record of project development.

## Requirements

### 1. Feature Logging (`docs/*.md`)
- For every implemented feature, component, or completed piece of functionality, write or update a corresponding documentation file in the `docs/` directory.
- Detail the architecture, decisions made, security measures, and data integrity rules applied.

### 2. Project Summary (`SUMMARY.md`)
- Maintain a concise, high-level summary of the project in the `SUMMARY.md` file at the root.
- Update `SUMMARY.md` whenever significant progress is made to reflect the current state of the project.

### 3. API Documentation (Swagger/OpenAPI)
- For every new or modified API endpoint, update Swagger annotations in the corresponding Controller or Data classes.
- Ensure all parameters, request bodies, and responses are accurately documented using `OpenApi\Attributes`.
- Run `php artisan l5-swagger:generate` to verify documentation.

### 4. Cleanup Tracking (`removed.txt`)
- **Mandatory**: As part of documenting a feature, auto-append its business-logic paths (domains, controllers, migrations, etc.) to `removed.txt` at the root.
- This allows for automated project cleaning via the `clean-project` skill.
- **Rules**: 
  - Do not record core/auth files.
  - Directories should end with `/`.
  - Do not record duplicates.

### 5. Removed Logic Section
- If existing logic was replaced or removed, document what was removed and why in the `removed.txt` patch section.

## When to Apply
Activate this skill after successfully completing any implementation task (e.g., adding a new module, component, or changing an API). This is the **final step** before submission.
