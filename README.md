# The Syndicate - Tee Time Booking WhatsApp Bot

Monorepo for the Syndicate Tee Booker: a WhatsApp-based tee-time booking bot plus a staff admin dashboard.

## Project Structure

- `apps/admin`: Vite + React admin UI.
- `apps/api`: Hono + TypeScript API (admin endpoints + health + auth).
- `packages/agent`: Vercel AI SDK agent setup (OpenRouter provider).
- `packages/core`: Business logic and services.
- `packages/database`: Drizzle schema, migrations, and repositories.
- `docs`: Product spec and feature tracking.

## Commands

- `bun install`: install workspace deps.
- `bun --filter @syndicate/admin dev`: run the admin app.
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
- `OPENROUTER_API_KEY`: API key for the OpenRouter provider used by the agent package.
- `OPENROUTER_MODEL_ID`: Default OpenRouter model ID for agent workflows.
- `SLACK_BOT_TOKEN`: Slack bot token used to post support notifications.
- `SUPPORT_SLACK_UPDATES_CHANNEL`: Slack channel (name or ID) for support updates.
- `SUPPORT_SLACK_USERNAMES`: Comma-separated Slack usernames to DM for support requests.
- `BOOKING_SLACK_UPDATES_CHANNEL`: Slack channel (name or ID) for booking updates.
- `BOOKING_SLACK_USERNAMES`: Comma-separated Slack usernames to DM for new booking alerts.

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

## Current API Highlights

- Auth: Better Auth endpoints mounted under `/api/auth/*`.
- Health: `/health` and `/ready` (DB connectivity).
- Admin: staff, members, bookings, clubs/locations, support requests, audit logs, message logs, FAQs.
- Current user: `/api/me` (get/update).
