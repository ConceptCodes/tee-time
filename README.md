# The Syndicate - A Tee Time Booking Whatsapp Bot

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string used by the API and Drizzle.
- `FAQ_EMBEDDING_DIMENSIONS`: Vector size for FAQ embeddings (default: `1536`).
- `BETTER_AUTH_SECRET`: Secret for Better Auth session signing.
- `BETTER_AUTH_URL`: Base URL for Better Auth (e.g. `http://localhost:8787`).
- `LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`). Default: `info`.
- `LOG_REDACT`: Redact emails/phones/coordinates in logs (`true`/`false`). Default: `true`.
