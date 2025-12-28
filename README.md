# Tee Time Booking WhatsApp Bots

An automated WhatsApp-based tee-time booking system featuring member onboarding, FAQ automation, and a dedicated staff administration dashboard.

## Project Structure

- `apps/admin`: Vite + React admin UI.
- `apps/api`: Hono + TypeScript API (admin endpoints + health + auth).
- `apps/worker`: Scheduled job runner, data retention cleanup, and report generation.
- `packages/agent`: AI SDK agent setup (OpenRouter provider).
- `packages/core`: Business logic and services.
- `packages/database`: Drizzle schema, migrations, and repositories.
- `packages/evals`: Agent eval runner (booking, FAQ, fallback, updates).

## Commands

- `bun install`: install workspace dependencies.
- `bun --filter @tee-time/admin dev`: run the admin app.
- `bun --filter @tee-time/api dev`: run the API server.
- `bun --filter @tee-time/worker dev`: run the worker service.
- `bun db:generate`: generate Drizzle migrations.
- `bun db:migrate`: apply migrations.
- `bun run lint`: run Biome lint.
- `bun run format`: run Biome format.
- `bun run check`: run Biome check.
- `bun run chat`: run the local CLI chat harness.
- `bun run evals`: run agent evals (use `--help` for options).

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
    B2Q[Ask for Booking Info or Offer Booking]
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
    B3O[Return Status (Upcoming/Past)]
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
- **Reports**: `/api/reports/*` for booking and member analytics.
- **WhatsApp Webhook**: `/webhooks/whatsapp` for inbound message handling.
- **Current User**: `/api/me` (get/update profile).

## Admin Dashboard

The admin UI lives in `apps/admin` and is built with Vite + React. It provides:
- Staff and member management screens.
- Booking overview and manual adjustments.
- FAQ management with vector‑based search.
- Reports dashboard (conversion, response time, booking mix).
- Real‑time Slack notifications for new bookings and support requests.

## Development Workflow

1. Install dependencies: `bun install`
2. Create a `.env` (copy from `.env.example`) and fill in required secrets.
3. Run the admin UI: `bun --filter @tee-time/admin dev`
4. Run the API server: `bun --filter @tee-time/api dev`
5. Run database migrations when schema changes:
   - Generate: `bun db:generate`
   - Apply: `bun db:migrate`
6. Lint / format: `bun run lint` / `bun run format`
7. Run type‑checking: `bun run check`

## Testing

Use the eval harness for system checks:
```
bun run evals --help
```

Unit and integration tests live alongside each package under `__tests__`. Run them with:
```
bun test
```

## License

MIT
