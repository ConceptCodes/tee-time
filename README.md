# Tee Time Booking WhatsApp Bot

Monorepo for A Tee Time Booking WhatsApp Bot: a WhatsApp-based tee‑time booking bot plus a staff admin dashboard.

## Project Structure

- `apps/admin`: Vite + React admin UI.
- `apps/api`: Hono + TypeScript API (admin endpoints + health + auth).
- `apps/worker`: Scheduled job runner, data retention cleanup, and report generation.
- `packages/agent`: Vite + AI SDK agent setup (OpenRouter provider).
- `packages/core`: Business logic and services.
- `packages/database`: Drizzle schema, migrations, and repositories.
- `docs`: Product spec and feature tracking.

## Commands

- `bun install`: install workspace dependencies.
- `bun --filter @tee-time/admin dev`: run the admin app.
- `bun --filter @tee-time/worker dev`: run the worker service.
- `bun db:generate`: generate Drizzle migrations.
- `bun db:migrate`: apply migrations.
- `bun run lint`: run Biome lint.
- `bun run format`: run Biome format.
- `bun run check`: run Biome check.

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string used by the API and Drizzle.
- `FAQ_EMBEDDING_DIMENSIONS`: Vector size for FAQ embeddings (default: `1536`).
- `BETTER_AUTH_SECRET`: Secret for Better Auth session signing.
- `BETTER_AUTH_URL`: Base URL for Better Auth (e.g. `http://localhost:8787`).
- `LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`). Default: `info`.
- `LOG_REDACT`: Redact emails/phones/coordinates in logs (`true`/`false`). Default: `true`.
- `WORKER_SCHEDULED_INTERVAL_MS`: Interval for scheduled job polling (ms). Default: `60000`.
- `WORKER_REPORTS_INTERVAL_MS`: Interval for report generation (ms). Default: `3600000`.
- `WORKER_JOB_BATCH_SIZE`: Max scheduled jobs claimed per poll. Default: `25`.
- `WORKER_MAX_ATTEMPTS`: Max attempts before failing a scheduled job. Default: `5`.
- `WORKER_RETRY_BASE_DELAY_MS`: Base retry delay for scheduled jobs (ms). Default: `60000`.
- `WORKER_RETRY_BACKOFF_MULTIPLIER`: Retry backoff multiplier. Default: `2`.
- `WORKER_RETRY_MAX_DELAY_MS`: Max retry delay (ms). Default: `3600000`.
- `OPENROUTER_API_KEY`: API key for the OpenRouter provider used by the agent package.
- `OPENROUTER_MODEL_ID`: Default OpenRouter model ID for agent workflows.
- `OPENROUTER_EMBEDDING_MODEL_ID`: OpenRouter embedding model ID used for FAQ vector search.
- `SLACK_BOT_TOKEN`: Slack bot token used to post support notifications.
- `SUPPORT_SLACK_UPDATES_CHANNEL`: Slack channel (name or ID) for support updates.
- `SUPPORT_SLACK_USERNAMES`: Comma‑separated Slack usernames to DM for support requests.
- `BOOKING_SLACK_UPDATES_CHANNEL`: Slack channel (name or ID) for booking updates.
- `BOOKING_SLACK_USERNAMES`: Comma‑separated Slack usernames to DM for new booking alerts.

## Agent Routing Overview

```mermaid
flowchart TD
  Start([Inbound WhatsApp Message]) --> Parse[Parse + Normalize Input]
  Parse --> Identify{Intent Router}
  Identify -->|Booking New| B1[Booking Intake Workflow]
  Identify -->|Change/Cancel| B2[Change or Cancel Workflow]
  Identify -->|Modify Booking| B4[Modify Booking Workflow]
  Identify -->|Booking Status| B3[Booking Status Lookup]
  Identify -->|FAQ / General Question| F1[FAQ Retrieval + Answer]
  Identify -->|Support / Human| S1[Create Support Request]
  Identify -->|Unclear| C1[Clarify Question]
  subgraph Booking_Fields["Booking Intake Requirements"]
    B1A{All Required Fields?}
    B1Q[Ask for Missing Info]
    B1C[Create Booking + Notify Staff]
    B1O[Confirm to Member]
    B1A -->|No| B1Q
    B1A -->|Yes| B1C
    B1C --> B1O
  end
  B1 --> B1A
  subgraph Change_Cancel["Change/Cancel Flow"]
    B2A[Find Booking]
    B2B{Found?}
    B2Q[Ask for Booking Info]
    B2C[Update / Cancel + Notify Staff]
    B2O[Confirm to Member]
    B2A --> B2B
    B2B -->|No| B2Q
    B2B -->|Yes| B2C
    B2C --> B2O
  end
  B2 --> B2A
  subgraph Modify_Booking["Modify Booking Flow"]
    B4A[Find Booking]
    B4B{Found?}
    B4Q[Ask for Booking Info]
    B4C[Collect Changes + Validate]
    B4D[Update Booking + Notify Staff]
    B4O[Confirm to Member]
    B4A --> B4B
    B4B -->|No| B4Q
    B4B -->|Yes| B4C
    B4C --> B4D
    B4D --> B4O
  end
  B4 --> B4A
  subgraph Status_Lookup["Booking Status Lookup"]
    B3A[Find Booking]
    B3B{Found?}
    B3Q[Ask for Booking Info]
    B3O[Return Status]
    B3A --> B3B
    B3B -->|No| B3Q
    B3B -->|Yes| B3O
  end
  B3 --> B3A
  subgraph FAQ_Path["FAQ / Q&A Path"]
    F1A{High Confidence Answer?}
    F1O[Send Answer]
    F1A -->|Yes| F1O
    F1A -->|No| S1
  end
  F1 --> F1A
  subgraph Escalation["Support Escalation"]
    S1A[Notify Staff + Log Audit]
  end
  S1 --> S1A
  C1 --> Identify
```

## API Highlights

- **Auth**: Better Auth endpoints mounted under `/api/auth/*`.
- **Health**: `/health` and `/ready` (DB connectivity).
- **Admin**: CRUD endpoints for staff, members, bookings, clubs/locations, support requests, audit logs, message logs, and FAQs.
- **Current User**: `/api/me` (get/update profile).

## Admin Dashboard

The admin UI lives in `apps/admin` and is built with Vite + React. It provides:
- Staff and member management screens.
- Booking overview and manual adjustments.
- FAQ management with vector‑based search.
- Real‑time Slack notifications for new bookings and support requests.

## Development Workflow

1. Install dependencies: `bun install`
2. Create a `.env` (copy from `.env.example`) and fill in required secrets.
3. Run the admin UI: `bun --filter @tee-time/admin dev`
4. Run database migrations when schema changes:
   - Generate: `bun db:generate`
   - Apply: `bun db:migrate`
5. Lint / format: `bun run lint` / `bun run format`
6. Run type‑checking: `bun run check`

## Testing

Unit and integration tests live alongside each package under `__tests__`. Run them with:
```
bun test
```
(Configure a test script in `package.json` as needed.)

## Contributing

Contributions are welcome! Please:
- Fork the repo.
- Create a feature branch.
- Ensure linting and type‑checking pass.
- Open a PR with a clear description of changes.

## License

MIT
