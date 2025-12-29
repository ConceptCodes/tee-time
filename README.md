# WhatsApp Bot for Tee Time Booking

An AI-powered automated WhatsApp booking system designed to streamline golf tee time reservations, featuring intelligent member onboarding, FAQ automation, and a comprehensive staff administration dashboard.

## Project Structure

- `apps/admin`: Vite + React admin UI.
- `apps/api`: Hono + TypeScript API (admin endpoints + health + auth).
- `apps/worker`: Scheduled job runner, data retention cleanup, and report generation.
- `packages/agent`: AI SDK agent setup (OpenRouter provider).
- `packages/core`: Business logic and services.
- `packages/database`: Drizzle schema, migrations, and repositories.
- `packages/evals`: Agent eval runner (booking, FAQ, fallback, updates).

## Technology Stack

- **Runtime**: [`Bun`](https://bun.sh)
- **Language**: [`TypeScript`](https://www.typescriptlang.org)
- **Frameworks**: [`Hono`](https://hono.dev), [`React`](https://react.dev), [`Vite`](https://vite.dev)
- **Database**: [`PostgreSQL`](https://www.postgresql.org) with [`PostGIS`](https://postgis.net), managed via [`drizzle-orm`](https://orm.drizzle.team/)
- **AI**: [`Vercel AI SDK`](https://ai-sdk.dev/docs/introduction) + [`OpenRouter`](https://openrouter.ai)
- **UI**: [`Tailwind CSS`](https://tailwindcss.com), [`shadcn/ui`](https://ui.shadcn.com), [`TanStack Query`](https://tanstack.com/query/latest)
- **Messaging**: [`Twilio`](https://www.twilio.com) (WhatsApp), [`Slack`](https://slack.com) (Admin Notifications)
- **Tooling**: [`Biome`](https://biomejs.dev) (Linting/Formatting), [`dotenvx`](https://github.com/dotenvx/dotenvx)

## Commands

Common development commands mapping to `package.json` scripts:

- `bun install`: Install workspace dependencies.
- `bun run admin:dev`: Run the admin UI (localhost:5173).
- `bun run api:dev`: Run the API server (localhost:8787).
- `bun run worker:dev`: Run the background worker.
- `bun run db:generate`: Generate Drizzle migrations.
- `bun run db:migrate`: Apply database migrations.
- `bun run lint`: Run Biome lint.
- `bun run format`: Run Biome format.
- `bun run chat`: Run the local CLI chat harness for testing agent flows.
- `bun run evals`: Run agent evaluation suite.

## Documentation

- **Application Spec**: See `docs/app-spec.txt` for detailed product specifications.
- **Features**: See `docs/features.json` for feature flags and definitions.
- **Progress**: See `docs/progress.md` for current development status.

## Agent Routing Overview

```mermaid
flowchart TD
  Start[Inbound WhatsApp Message] --> Parse[Parse and Normalize Input]
  Parse --> CheckMember{Member Exists?}
  CheckMember -->|No| Onboarding[Onboarding Workflow]
  CheckMember -->|Yes| Route{Intent Router}
  
  Route -->|Booking New| Intake[Booking Intake Workflow]
  Route -->|Change or Cancel| Cancel[Change or Cancel Workflow]
  Route -->|Modify Booking| Modify[Modify Booking Workflow]
  Route -->|Booking Status| Status[Booking Status Lookup]
  Route -->|FAQ or General Question| FAQ[FAQ Retrieval]
  Route -->|Support or Human| Support[Create Support Request]
  Route -->|Unclear| Clarify[Clarify Question]

  subgraph OnboardingFlow["Member Onboarding"]
    UserStart[New User] --> AskName[Ask Name]
    AskName --> AskTimezone[Ask Timezone]
    AskTimezone --> AskPrefs[Ask Club Preferences]
    AskPrefs --> CreateProfile[Create Member Profile]
    CreateProfile --> OnboardingComplete[Send Welcome]
  end
  Onboarding --> UserStart

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

## Example Booking Flow

```text
You: I would like to book some tee time
Agent: What name should we use for your member profile?

You: George Michael
Agent: What timezone are you in? (e.g., Europe/London) You can say "skip".

You: Dallas, TX
Agent: Do you have a favorite club? You can say "skip".

You: TopGolf
Agent: Do you have a preferred club location? You can say "skip".

You: skip
Agent: Do you have a preferred bay? You can say "skip".

You: no
Agent: Welcome, George Michael! You're all set up. How can I help you book some tee time?

You: i would like book a 2hr slot tommorow at 5pm
Agent: Which location should we use for that club?
Available locations:
- Dallas
- Austin
- The Colony

You: Dallas
Agent: What are the names of the other guests?

You: Sarah, Devin
Agent: Which bay should we use?
Available bays:
- Bay 3
- Bay 4
- Bay 5
- Bay 1
- Bay 2

You: 5
Agent: Please confirm these booking details:

⛳ Club: Topgolf (Dallas)
🎯 Bay: Bay 5
📅 Date: 2025-12-30
🕒 Time: 17:00
👥 Players: 3
👤 Guests: Sarah, Devin

You: looks good to me

<send slack message to staff>

Agent: I can help book a new tee time, update or cancel your existing booking, check booking status, and answer FAQs. If you need something else, I can connect you to staff. 
```

## Admin Dashboard

The admin UI (`apps/admin`) lives at `http://localhost:5173` during development and offers:

- **Overview**: Real-time stats, recent activity feed, and quick actions.
- **Bookings**: Detailed list view, filtered search, and manual booking management.
- **Members**: Complete member directory, profile management, and onboarding status.
- **Clubs**: Configuration for golf clubs and their specific locations/bays.
- **Messages**: Support request management and full conversation history view.
- **Reports**: Analytics for bookings, member growth, and system usage.
- **Audit Logs**: Secuirty and operational logs for all staff actions.
- **Settings**: System configuration including Staff management and KB/FAQ updates.

## Development Workflow

1.  **Setup**:
    ```bash
    bun install
    cp .env.example .env
    # Fill in required secrets in .env
    ```

2.  **Database**:
    ```bash
    bun run db:generate
    bun run db:migrate
    ```

3.  **Run Services**:
    Open separate terminals for:
    - API: `bun run api:dev`
    - Admin: `bun run admin:dev`
    - Worker: `bun run worker:dev` (optional, for scheduled tasks)

4.  **Testing**:
    - Unit tests: `bun test`
    - Agent Evals: `bun run evals`
    - Interactive Chat: `bun run chat`

## License

MIT
