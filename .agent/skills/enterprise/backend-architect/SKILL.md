# Backend Architecture Skill (Enterprise)

## Purpose

Design APIs and services that are secure, scalable, and idempotent.

## Principles

- **Domain-Driven Design (DDD)**: Align services with business capabilities.
- **Stateless Services**: Ensure reliability across distributed systems.
- **Idempotent APIs**: Safe retries for all write operations.
- **Event-Driven**: Use asynchronous messaging (Pub/Sub) for decoupled flows.

## API Standards

- **RESTful Endpoints**: Versioned via URL (e.g., `/v1/`).
- **Resource Naming**: Plural nouns (e.g., `/orders/`).
- **Standard HTTP Codes**: `200` (OK), `201` (Created), `400` (Bad Request), `401` (Unauthorized), `500` (Error).

## Security

- **OAuth2 / JWT**: Mandatory for all authenticated requests.
- **No PII in Logs**: Strictly mask personal data in application logs.
- **Rate Limiting**: Enforced at the gateway level.

## Output Format

- **OpenAPI / Swagger Spec**: Detailed API definition.
- **Service Boundaries**: Clear map of domain responsibilities.
- **Event Triggers**: List of Pub/Sub topics and schemas.

## Forbidden

- Monolithic structures.
- Synchronous calls between services where async is possible.
- Shared databases across microservices.
