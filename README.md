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
  Start[Inbound WhatsApp Message] --> Parse[Parse and Normalize Input]
  Parse --> Route{Intent Router}
  Route -->|Booking New| Intake[Booking Intake Workflow]
  Route -->|Change or Cancel| Cancel[Change or Cancel Workflow]
  Route -->|Modify Booking| Modify[Modify Booking Workflow]
  Route -->|Booking Status| Status[Booking Status Lookup]
  Route -->|FAQ or General Question| FAQ[FAQ Retrieval]
  Route -->|Support or Human| Support[Create Support Request]
  Route -->|Unclear| Clarify[Clarify Question]

  subgraph BookingFields["Booking Intake Requirements"]
    IntakeCheck{"All Required Fields?"}
    IntakeAsk[Ask for Missing Info]
    IntakeCreate[Create Booking and Notify Staff]
    IntakeConfirm[Confirm to Member]
    IntakeCheck -->|No| IntakeAsk
    IntakeCheck -->|Yes| IntakeCreate
    IntakeCreate --> IntakeConfirm
  end
  Intake --> IntakeCheck

  subgraph CancelFlow["Change or Cancel Flow"]
    CancelFind[Find Booking]
    CancelFound{"Found?"}
    CancelAsk[Ask for Booking Info or Offer Booking]
    CancelUpdate[Update or Cancel and Notify Staff]
    CancelConfirm[Confirm to Member]
    CancelFind --> CancelFound
    CancelFound -->|No| CancelAsk
    CancelFound -->|Yes| CancelUpdate
    CancelUpdate --> CancelConfirm
  end
  Cancel --> CancelFind

  subgraph ModifyFlow["Modify Booking Flow"]
    ModifyFind[Find Booking]
    ModifyFound{"Found?"}
    ModifyAsk[Ask for Booking Info]
    ModifyCollect[Collect Changes and Validate]
    ModifyApply[Update Booking and Notify Staff]
    ModifyConfirm[Confirm to Member]
    ModifyFind --> ModifyFound
    ModifyFound -->|No| ModifyAsk
    ModifyFound -->|Yes| ModifyCollect
    ModifyCollect --> ModifyApply
    ModifyApply --> ModifyConfirm
  end
  Modify --> ModifyFind

  subgraph StatusFlow["Booking Status Lookup"]
    StatusFind[Find Booking]
    StatusFound{"Found?"}
    StatusAsk[Ask for Booking Info]
    StatusReturn[Return Status for Upcoming or Past]
    StatusFind --> StatusFound
    StatusFound -->|No| StatusAsk
    StatusFound -->|Yes| StatusReturn
  end
  Status --> StatusFind

  subgraph FaqFlow["FAQ Path"]
    FaqCheck{"High Confidence Answer?"}
    FaqAnswer[Send Answer]
    FaqCheck -->|Yes| FaqAnswer
    FaqCheck -->|No| Support
  end
  FAQ --> FaqCheck

  subgraph SupportFlow["Support Escalation"]
    SupportNotify[Notify Staff and Log Audit]
  end
  Support --> SupportNotify
  Clarify --> Route
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
