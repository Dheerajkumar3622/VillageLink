# Database Design Skill (Enterprise)

## Purpose

Ensure long-term scalability, data integrity, and cross-region compliance.

## Rules

- **Transactions → RDBMS**: Use SQL (PostgreSQL/MySQL) for consistent financial data.
- **Sessions & Caching → Redis**: High-speed ephemeral storage.
- **Complex Search → Dedicated Index**: Use Elasticsearch or Algolia.
- **Big Data → NoSQL**: Use MongoDB or Bigtable for unstructured/semi-structured data.

## Scaling Patterns

- **Read Replicas**: Distribute read load to offload primary nodes.
- **Sharding/Partitioning**: Segment large datasets by geography or key.
- **Tenant Isolation**: Ensure strict data separation in multi-tenant systems.

## Migration Policy

- **Backward Compatible**: Schema changes must not break existing application versions.
- **Zero-Downtime**: Use Blue/Green migrations for critical tables.
- **Verification**: All migrations must be tested on a staging clone first.

## Compliance

- **PII Storage**: Encrypt personal data at rest (AES-256).
- **Data Residency**: Ensure data is stored in the user's home region (GDPR/APEC).

## Forbidden

- Cross-region joins.
- Manual schema updates in production.
- Default 'root' or 'admin' users in application configs.
