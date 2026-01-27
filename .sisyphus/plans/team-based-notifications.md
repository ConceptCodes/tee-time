# Team-Based Club Assignments with Slack Notifications

## Context

### Original Request
Implement team-based club assignments with Slack notifications:
- Clubs can be global (visible to all) or team-specific (assigned to a team)
- When a booking is created for a team-specific club, notify that team's Slack channel
- Admins can manage teams and assign staff to teams
- Admin UI for team management

### Interview Summary
**Key Discussions**:
- **Schema approach**: Add `teamId` to clubs table, add `slackChannel` to teams table
- **Global clubs**: Defined by `teamId = null` (no explicit isGlobal flag)
- **Notification routing**: Extend existing `notifyBooking()` with optional channel parameter
- **Team deletion policy**: Orphan clubs to global (set teamId = null)
- **Notification behavior**: Send to BOTH team channel AND global channel when team channel exists

**Research Findings**:
- `teams` and `teamMemberships` tables already exist but are unused
- `notifyBooking()` currently uses hardcoded env var `BOOKING_SLACK_UPDATES_CHANNEL`
- Existing repository patterns in `packages/database/src/repositories/clubs.ts`
- Test patterns established in `packages/core/src/__tests__/*.test.ts`
- Admin UI has StaffTab.tsx and SettingsPage.tsx as templates

### Metis Review
**Identified Gaps** (addressed):
- Missing unique constraint on `teamMemberships(teamId, staffUserId)` → Added to migration
- Team deletion behavior undefined → User confirmed: orphan to global
- Notification override vs supplement unclear → User confirmed: both channels
- Booking status updates may also need team routing → Scoped to create/cancel only

---

## Work Objectives

### Core Objective
Enable team-based club assignments where booking notifications are routed to the team's Slack channel in addition to the global channel, with full admin UI for team management.

### Concrete Deliverables
1. Database migration adding `teamId` to clubs and `slackChannel` to teams
2. Team repository with CRUD operations
3. Modified notification flow supporting team channel routing
4. API endpoints for team management
5. Admin UI for team CRUD and club-team assignment

### Definition of Done
- [ ] `bun run db:migrate` completes without error
- [ ] `bun test` passes all new and existing tests
- [ ] Creating a booking for a team-assigned club sends Slack notification to team channel AND global channel
- [ ] Creating a booking for a global club (no team) sends Slack notification to global channel only
- [ ] Admin can create/edit/delete teams via UI
- [ ] Admin can assign/remove staff from teams via UI
- [ ] Admin can assign clubs to teams via UI

### Must Have
- Team CRUD (create, read, update, delete)
- Team membership management (add/remove staff)
- Club team assignment (assign club to team or mark as global)
- Team Slack channel configuration
- Notification routing based on club's team
- Unique constraint on team memberships to prevent duplicates

### Must NOT Have (Guardrails)
- ❌ Team-based access control on API endpoints (out of scope)
- ❌ Filtering bookings list by staff's team membership (out of scope)
- ❌ Team assignment on club locations (only on clubs)
- ❌ Slack channel validation via API (fail silently per existing pattern)
- ❌ Team hierarchy or parent/child relationships
- ❌ Team-specific support request routing
- ❌ Audit logging for team operations (unless existing pattern does it)
- ❌ Modifying agent/WhatsApp flows

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES
- **User wants tests**: TDD (RED-GREEN-REFACTOR)
- **Framework**: `bun:test` (same as existing tests)

### TDD Workflow Per Task
Each implementation task follows:
1. **RED**: Write failing test first
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Clean up while keeping green

### Test Commands
```bash
# Run all tests
bun test

# Run specific test file
bun test packages/core/src/__tests__/team-notifications.test.ts

# Run with watch mode during development
bun test --watch
```

---

## Task Flow

```
[1: Migration] → [2: Team Repo] → [3: Membership Repo] → [4: Club Repo Updates]
                                                                    ↓
[5: Notification Flow] → [6: Booking Integration] → [7: Team API] → [8: Club API Updates]
                                                                            ↓
                                                        [9: Teams UI] → [10: Club UI] → [11: Staff UI]
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 2, 3 | Independent repositories after migration |
| B | 9, 10, 11 | UI components can be built in parallel after API |

| Task | Depends On | Reason |
|------|------------|--------|
| 2-4 | 1 | Need schema before repositories |
| 5 | - | Can start independently (modifying existing) |
| 6 | 4, 5 | Needs club repo and notification flow |
| 7 | 2, 3 | API needs repositories |
| 8 | 4 | Needs club repo updates |
| 9-11 | 7, 8 | UI needs API endpoints |

---

## TODOs

### Phase 1: Database Layer

- [ ] 1. Schema Migration: Add teamId to clubs, slackChannel to teams

  **What to do**:
  - Add `slackChannel` column (text, nullable) to `teams` table
  - Add `teamId` column (uuid, nullable, FK to teams.id) to `clubs` table
  - Add unique constraint on `teamMemberships(teamId, staffUserId)` to prevent duplicates
  - Generate and apply migration

  **Must NOT do**:
  - Do NOT add cascading delete - clubs should orphan to global
  - Do NOT add any access control columns

  **Parallelizable**: NO (first task, everything depends on it)

  **References**:
  
  **Schema Definition**:
  - `packages/database/src/schema.ts:249-265` - Existing `teams` and `teamMemberships` table definitions
  - `packages/database/src/schema.ts:78-84` - Existing `clubs` table definition (needs teamId)
  
  **Migration Pattern**:
  - `packages/database/drizzle/` - Directory containing existing migrations (follow naming pattern)
  - Drizzle docs: https://orm.drizzle.team/docs/migrations
  
  **FK Pattern**:
  - `packages/database/src/schema.ts:256-265` - `teamMemberships` shows FK pattern with `references`

  **Acceptance Criteria**:
  - [ ] Test: `bun test packages/database/src/__tests__/schema.test.ts` (create if needed)
    - Assert `teams` table has `slackChannel` column
    - Assert `clubs` table has `teamId` column
    - Assert unique constraint exists on teamMemberships
  - [ ] `bun run db:generate` → Creates migration file
  - [ ] `bun run db:migrate` → Applies without error
  - [ ] Verify in DB: `SELECT column_name FROM information_schema.columns WHERE table_name = 'teams'` includes `slack_channel`
  - [ ] Verify in DB: `SELECT column_name FROM information_schema.columns WHERE table_name = 'clubs'` includes `team_id`

  **Commit**: YES
  - Message: `feat(db): add teamId to clubs and slackChannel to teams`
  - Files: `packages/database/src/schema.ts`, `packages/database/drizzle/*.sql`
  - Pre-commit: `bun run type-check`

---

- [ ] 2. Team Repository: Create team CRUD operations

  **What to do**:
  - Create `packages/database/src/repositories/teams.ts`
  - Export `createTeamRepository(db)` factory function
  - Implement: `create`, `getById`, `listAll`, `update`, `delete`
  - On delete: Update clubs with matching teamId to set teamId = null (orphan to global)
  - Write tests first (TDD)

  **Must NOT do**:
  - Do NOT add any caching
  - Do NOT validate slackChannel format (allow any string)

  **Parallelizable**: YES (with task 3, after task 1)

  **References**:
  
  **Repository Pattern**:
  - `packages/database/src/repositories/clubs.ts:17-69` - CRUD pattern to follow (create, getById, update)
  - `packages/database/src/repositories/staff.ts` - Another repository example with similar patterns
  
  **Type Exports**:
  - `packages/database/src/repositories/clubs.ts:1-15` - Import pattern for types
  
  **Test Pattern**:
  - `packages/core/src/__tests__/booking-state.test.ts` - Test structure with `describe/expect/test`

  **Acceptance Criteria**:
  - [ ] **RED**: Create test file `packages/database/src/__tests__/teams.test.ts`
    - Test `create` returns team with id
    - Test `getById` returns team or null
    - Test `listAll` returns array
    - Test `update` modifies team
    - Test `delete` removes team and orphans clubs
  - [ ] `bun test packages/database/src/__tests__/teams.test.ts` → FAIL (tests exist, implementation doesn't)
  - [ ] **GREEN**: Implement `packages/database/src/repositories/teams.ts`
  - [ ] `bun test packages/database/src/__tests__/teams.test.ts` → PASS
  - [ ] **REFACTOR**: Clean up, ensure types are exported

  **Commit**: YES
  - Message: `feat(db): add team repository with CRUD operations`
  - Files: `packages/database/src/repositories/teams.ts`, `packages/database/src/__tests__/teams.test.ts`
  - Pre-commit: `bun test`

---

- [ ] 3. TeamMembership Repository: Manage staff-team assignments

  **What to do**:
  - Create `packages/database/src/repositories/team-memberships.ts`
  - Export `createTeamMembershipRepository(db)` factory
  - Implement: `addMember`, `removeMember`, `listByTeamId`, `listByStaffUserId`
  - Handle unique constraint violation gracefully (already a member → no-op or return existing)
  - Write tests first (TDD)

  **Must NOT do**:
  - Do NOT add role/permission fields to memberships
  - Do NOT cascade delete staff when removed from team

  **Parallelizable**: YES (with task 2, after task 1)

  **References**:
  
  **Schema**:
  - `packages/database/src/schema.ts:256-265` - `teamMemberships` table structure
  
  **Repository Pattern**:
  - `packages/database/src/repositories/clubs.ts` - Pattern for list operations
  
  **Drizzle Query Pattern**:
  - `packages/database/src/repositories/clubs.ts:22-30` - `db.select().from().where()` pattern

  **Acceptance Criteria**:
  - [ ] **RED**: Create test file `packages/database/src/__tests__/team-memberships.test.ts`
    - Test `addMember` creates membership
    - Test `addMember` on existing membership doesn't duplicate
    - Test `removeMember` deletes membership
    - Test `listByTeamId` returns staff for team
    - Test `listByStaffUserId` returns teams for staff
  - [ ] `bun test packages/database/src/__tests__/team-memberships.test.ts` → FAIL
  - [ ] **GREEN**: Implement `packages/database/src/repositories/team-memberships.ts`
  - [ ] `bun test packages/database/src/__tests__/team-memberships.test.ts` → PASS

  **Commit**: YES
  - Message: `feat(db): add team membership repository`
  - Files: `packages/database/src/repositories/team-memberships.ts`, `packages/database/src/__tests__/team-memberships.test.ts`
  - Pre-commit: `bun test`

---

- [ ] 4. Club Repository Updates: Add team filtering methods

  **What to do**:
  - Modify `packages/database/src/repositories/clubs.ts`
  - Add methods: `listByTeamId(teamId)`, `listGlobal()` (where teamId IS NULL), `assignToTeam(clubId, teamId)`
  - Add `getClubWithTeam(clubId)` that joins with teams table to get slackChannel
  - Update existing methods to include teamId in results
  - Write tests first (TDD)

  **Must NOT do**:
  - Do NOT modify club locations queries
  - Do NOT add team filtering to location-based searches

  **Parallelizable**: NO (depends on 1, blocks 6)

  **References**:
  
  **Existing Club Repo**:
  - `packages/database/src/repositories/clubs.ts:17-69` - Current club repository implementation
  
  **Join Pattern**:
  - Drizzle join docs: https://orm.drizzle.team/docs/joins
  
  **Schema**:
  - `packages/database/src/schema.ts:78-84` - clubs table
  - `packages/database/src/schema.ts:249-254` - teams table for join

  **Acceptance Criteria**:
  - [ ] **RED**: Add tests to `packages/database/src/__tests__/clubs.test.ts` (create if needed)
    - Test `listByTeamId` returns only clubs for that team
    - Test `listGlobal` returns only clubs with teamId = null
    - Test `assignToTeam` updates club's teamId
    - Test `getClubWithTeam` returns club with team's slackChannel
  - [ ] `bun test` → FAIL (new tests)
  - [ ] **GREEN**: Implement new methods in clubs.ts
  - [ ] `bun test` → PASS
  - [ ] Verify existing club tests still pass

  **Commit**: YES
  - Message: `feat(db): add team filtering to club repository`
  - Files: `packages/database/src/repositories/clubs.ts`, `packages/database/src/__tests__/clubs.test.ts`
  - Pre-commit: `bun test`

---

### Phase 2: Core Logic

- [x] 5. Notification Flow: Add team channel routing to notifyBooking

  **What to do**:
  - Modify `packages/core/src/notifications/slack.ts`
  - Update `notifyBooking()` signature to accept optional `teamChannel?: string`
  - When `teamChannel` is provided AND non-empty, send to BOTH:
    1. `teamChannel` (the team's Slack channel)
    2. `BOOKING_SLACK_UPDATES_CHANNEL` (global channel from env)
  - When `teamChannel` is null/undefined, send only to global channel (existing behavior)
  - Continue sending to usernames as before
  - Write tests first (TDD)

  **Must NOT do**:
  - Do NOT modify `notifySupport()` (stays global)
  - Do NOT validate that Slack channel exists
  - Do NOT throw on notification failure (log and continue)

  **Parallelizable**: YES (can start before repo tasks complete)

  **References**:
  
  **Current Implementation**:
  - `packages/core/src/notifications/slack.ts:144-155` - Current `notifyBooking()` function
  - `packages/core/src/notifications/slack.ts:124-127` - Error handling pattern (log, don't throw)
  - `packages/core/src/notifications/slack.ts:40-65` - `postSlackMessage()` core function
  
  **Existing Test Pattern**:
  - `packages/core/src/__tests__/booking-state.test.ts` - Test file structure

  **Acceptance Criteria**:
  - [ ] **RED**: Create test file `packages/core/src/__tests__/slack-notifications.test.ts`
    - Test `notifyBooking({ text })` sends to global channel only
    - Test `notifyBooking({ text, teamChannel: '#team-a' })` sends to BOTH channels
    - Test `notifyBooking({ text, teamChannel: '' })` sends to global only (empty string = no team)
    - Test notification failure is logged, not thrown
  - [ ] `bun test packages/core/src/__tests__/slack-notifications.test.ts` → FAIL
  - [ ] **GREEN**: Modify `notifyBooking()` in `packages/core/src/notifications/slack.ts`
  - [ ] `bun test packages/core/src/__tests__/slack-notifications.test.ts` → PASS
  - [ ] Verify: Existing notification tests still pass

  **Commit**: YES
  - Message: `feat(core): add team channel routing to notifyBooking`
  - Files: `packages/core/src/notifications/slack.ts`, `packages/core/src/__tests__/slack-notifications.test.ts`
  - Pre-commit: `bun test`

---

- [x] 6. Booking Integration: Lookup team channel on booking create/cancel

  **What to do**:
  - Modify `packages/core/src/booking-create.ts`
  - Before calling `notifyBooking()`, lookup:
    1. Get club from booking
    2. If club has teamId, get team's slackChannel
    3. Pass slackChannel to `notifyBooking({ text, teamChannel })`
  - Apply same logic to `packages/core/src/booking-cancel.ts`
  - Use club repository's new `getClubWithTeam()` method
  - Write tests first (TDD)

  **Must NOT do**:
  - Do NOT modify booking state machine
  - Do NOT add team lookup to booking status updates (only create/cancel)

  **Parallelizable**: NO (depends on 4 and 5)

  **References**:
  
  **Booking Create**:
  - `packages/core/src/booking-create.ts:188` - Where `notifyBooking()` is called
  - `packages/core/src/booking-create.ts:1-50` - Imports and function signature
  
  **Booking Cancel**:
  - `packages/core/src/booking-cancel.ts:53` - Where `notifyBooking()` is called for cancellation
  
  **Club Repo Access**:
  - Need to understand how to access club repository in booking-create context

  **Acceptance Criteria**:
  - [ ] **RED**: Create/extend test file `packages/core/src/__tests__/booking-notifications.test.ts`
    - Test booking for global club sends to global channel only
    - Test booking for team club sends to both team and global channels
    - Test cancellation follows same routing logic
  - [ ] `bun test packages/core/src/__tests__/booking-notifications.test.ts` → FAIL
  - [ ] **GREEN**: Modify `booking-create.ts` and `booking-cancel.ts`
  - [ ] `bun test packages/core/src/__tests__/booking-notifications.test.ts` → PASS

  **Commit**: YES
  - Message: `feat(core): route booking notifications through team channels`
  - Files: `packages/core/src/booking-create.ts`, `packages/core/src/booking-cancel.ts`, `packages/core/src/__tests__/booking-notifications.test.ts`
  - Pre-commit: `bun test`

---

### Phase 3: API Layer

- [ ] 7. Team API: Create team management endpoints

  **What to do**:
  - Create `apps/api/src/routes/admin/teams.ts`
  - Implement endpoints:
    - `GET /api/teams` - List all teams
    - `POST /api/teams` - Create team
    - `PATCH /api/teams/:id` - Update team
    - `DELETE /api/teams/:id` - Delete team (orphans clubs)
    - `GET /api/teams/:id/members` - List team members
    - `POST /api/teams/:id/members` - Add staff to team
    - `DELETE /api/teams/:id/members/:staffId` - Remove staff from team
  - Register routes in `apps/api/src/index.ts`
  - Add Zod schemas in `apps/api/src/schemas.ts`

  **Must NOT do**:
  - Do NOT add authentication beyond existing admin auth
  - Do NOT add team-based authorization filtering

  **Parallelizable**: NO (depends on 2, 3)

  **References**:
  
  **Route Pattern**:
  - `apps/api/src/routes/admin/staff.ts` - Full CRUD pattern for admin routes
  - `apps/api/src/routes/admin/clubs.ts` - Another admin route example
  
  **Route Registration**:
  - `apps/api/src/index.ts` - Where routes are registered with Hono app
  
  **Schema Pattern**:
  - `apps/api/src/schemas.ts` - Zod schemas for staff (use as template)
  
  **Auth Middleware**:
  - `apps/api/src/middleware/` - Auth middleware applied to admin routes

  **Acceptance Criteria**:
  - [ ] Create `apps/api/src/routes/admin/teams.ts`
  - [ ] Add Zod schemas for team create/update in `apps/api/src/schemas.ts`
  - [ ] Register team routes in `apps/api/src/index.ts`
  - [ ] Manual verification using curl:
    ```bash
    # Create team
    curl -X POST http://localhost:8787/api/teams -H "Content-Type: application/json" -d '{"name": "Team A", "slackChannel": "#team-a"}'
    # Expected: 201 with team object
    
    # List teams
    curl http://localhost:8787/api/teams
    # Expected: 200 with array of teams
    
    # Add member
    curl -X POST http://localhost:8787/api/teams/{id}/members -H "Content-Type: application/json" -d '{"staffUserId": "..."}'
    # Expected: 201 with membership
    ```
  - [ ] `bun run type-check` → No errors

  **Commit**: YES
  - Message: `feat(api): add team management endpoints`
  - Files: `apps/api/src/routes/admin/teams.ts`, `apps/api/src/schemas.ts`, `apps/api/src/index.ts`
  - Pre-commit: `bun run type-check`

---

- [ ] 8. Club API Updates: Add team assignment endpoint

  **What to do**:
  - Modify `apps/api/src/routes/admin/clubs.ts`
  - Add or update endpoint: `PATCH /api/clubs/:id` to accept `teamId` in body
  - Allow `teamId: null` to mark club as global
  - Return updated club with team info
  - Update schemas if needed

  **Must NOT do**:
  - Do NOT modify club location endpoints
  - Do NOT add team filtering to club list (that's access control)

  **Parallelizable**: NO (depends on 4)

  **References**:
  
  **Club Routes**:
  - `apps/api/src/routes/admin/clubs.ts` - Current club endpoints
  
  **Update Pattern**:
  - `apps/api/src/routes/admin/staff.ts` - PATCH/PUT pattern for updates

  **Acceptance Criteria**:
  - [ ] `PATCH /api/clubs/:id` accepts `{ teamId: string | null }`
  - [ ] Manual verification:
    ```bash
    # Assign club to team
    curl -X PATCH http://localhost:8787/api/clubs/{clubId} -H "Content-Type: application/json" -d '{"teamId": "team-uuid"}'
    # Expected: 200 with updated club
    
    # Make club global
    curl -X PATCH http://localhost:8787/api/clubs/{clubId} -H "Content-Type: application/json" -d '{"teamId": null}'
    # Expected: 200 with club having teamId: null
    ```
  - [ ] `bun run type-check` → No errors

  **Commit**: YES
  - Message: `feat(api): add team assignment to club update endpoint`
  - Files: `apps/api/src/routes/admin/clubs.ts`, `apps/api/src/schemas.ts`
  - Pre-commit: `bun run type-check`

---

### Phase 4: Admin UI

- [ ] 9. Teams UI: Create team management page in admin

  **What to do**:
  - Create `apps/admin/src/pages/settings/TeamsTab.tsx`
  - Show list of teams with name, slackChannel, member count
  - Add "Create Team" button with modal form
  - Add edit/delete actions per team
  - Add "Manage Members" section per team (add/remove staff)
  - Use TanStack Query for data fetching
  - Add TeamsTab to SettingsPage tabs

  **Must NOT do**:
  - Do NOT add team-based filtering for what staff can see
  - Do NOT add drag-and-drop for member management (simple add/remove)

  **Parallelizable**: YES (with 10, 11 after API complete)

  **References**:
  
  **Tab Component Pattern**:
  - `apps/admin/src/pages/settings/StaffTab.tsx` - Tab structure, table layout, action buttons
  - `apps/admin/src/pages/SettingsPage.tsx` - How tabs are organized (NOTE: in pages/, not pages/settings/)
  
  **Data Fetching**:
  - `apps/admin/src/pages/settings/StaffTab.tsx` - TanStack Query usage pattern
  
  **UI Components**:
  - `apps/admin/src/components/` - Shadcn UI components available
  
  **Modal Pattern**:
  - Look for Dialog or Sheet components in existing codebase

  **Acceptance Criteria**:
  - [ ] TeamsTab component created at `apps/admin/src/pages/settings/TeamsTab.tsx`
  - [ ] TeamsTab registered in SettingsPage tabs
  - [ ] Using Playwright browser automation:
    - Navigate to: `http://localhost:5173/settings`
    - Click "Teams" tab
    - Verify: Team list table appears
    - Click "Create Team" button
    - Fill form: name="Test Team", slackChannel="#test"
    - Submit form
    - Verify: New team appears in list
    - Click edit on team
    - Verify: Edit modal opens with current values
    - Click delete on team
    - Verify: Confirmation dialog, team removed after confirm
  - [ ] `bun run type-check` → No errors in admin app

  **Commit**: YES
  - Message: `feat(admin): add team management UI`
  - Files: `apps/admin/src/pages/settings/TeamsTab.tsx`, `apps/admin/src/pages/SettingsPage.tsx`
  - Pre-commit: `bun run type-check`

---

- [ ] 10. Club UI Updates: Add team assignment to club editing

  **What to do**:
  - Modify `apps/admin/src/pages/ClubsPage.tsx`
  - Add team assignment dropdown to club edit form/modal
  - Dropdown options: "Global (no team)" + list of teams
  - Display current team assignment in club list/details
  - Use TanStack Query to fetch teams for dropdown

  **Must NOT do**:
  - Do NOT filter clubs by team
  - Do NOT add team-based access restrictions

  **Parallelizable**: YES (with 9, 11 after API complete)

  **References**:
  
  **Club Page**:
  - `apps/admin/src/pages/ClubsPage.tsx` - Current club UI
  
  **Dropdown Pattern**:
  - `apps/admin/src/components/ui/select.tsx` or similar Shadcn Select component
  
  **Edit Modal Pattern**:
  - Look for existing edit modals in the codebase

  **Acceptance Criteria**:
  - [ ] Club edit UI includes team assignment dropdown
  - [ ] Using Playwright browser automation:
    - Navigate to: `http://localhost:5173/clubs`
    - Click on a club (or edit button)
    - Verify: Team dropdown appears with "Global" + team options
    - Select a team
    - Save
    - Verify: Club now shows team assignment
    - Edit again, select "Global (no team)"
    - Save
    - Verify: Club shows as global
  - [ ] `bun run type-check` → No errors

  **Commit**: YES
  - Message: `feat(admin): add team assignment to club UI`
  - Files: `apps/admin/src/pages/ClubsPage.tsx`
  - Pre-commit: `bun run type-check`

---

- [ ] 11. Staff UI Updates: Show team memberships

  **What to do**:
  - Modify `apps/admin/src/pages/settings/StaffTab.tsx`
  - Add "Teams" column showing which teams each staff member belongs to
  - Optionally: Add ability to assign teams from staff view (or link to TeamsTab)
  - Fetch team memberships with staff list

  **Must NOT do**:
  - Do NOT filter staff by team
  - Do NOT make team assignment the primary action here (TeamsTab handles it)

  **Parallelizable**: YES (with 9, 10 after API complete)

  **References**:
  
  **Staff Tab**:
  - `apps/admin/src/pages/settings/StaffTab.tsx` - Current staff table

  **Acceptance Criteria**:
  - [ ] Staff table includes "Teams" column
  - [ ] Using Playwright browser automation:
    - Navigate to: `http://localhost:5173/settings`
    - Click "Staff" tab
    - Verify: "Teams" column visible in table
    - Verify: Staff assigned to teams show team names
    - Verify: Staff not in any team show "-" or "None"
  - [ ] `bun run type-check` → No errors

  **Commit**: YES
  - Message: `feat(admin): show team memberships in staff table`
  - Files: `apps/admin/src/pages/settings/StaffTab.tsx`
  - Pre-commit: `bun run type-check`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(db): add teamId to clubs and slackChannel to teams` | schema.ts, migrations | `bun run db:migrate` |
| 2 | `feat(db): add team repository with CRUD operations` | teams.ts, tests | `bun test` |
| 3 | `feat(db): add team membership repository` | team-memberships.ts, tests | `bun test` |
| 4 | `feat(db): add team filtering to club repository` | clubs.ts, tests | `bun test` |
| 5 | `feat(core): add team channel routing to notifyBooking` | slack.ts, tests | `bun test` |
| 6 | `feat(core): route booking notifications through team channels` | booking-create.ts, booking-cancel.ts, tests | `bun test` |
| 7 | `feat(api): add team management endpoints` | teams.ts, schemas.ts, index.ts | `bun run type-check` |
| 8 | `feat(api): add team assignment to club update endpoint` | clubs.ts, schemas.ts | `bun run type-check` |
| 9 | `feat(admin): add team management UI` | TeamsTab.tsx, SettingsPage.tsx | `bun run type-check` |
| 10 | `feat(admin): add team assignment to club UI` | ClubsPage.tsx | `bun run type-check` |
| 11 | `feat(admin): show team memberships in staff table` | StaffTab.tsx | `bun run type-check` |

---

## Success Criteria

### Verification Commands
```bash
# All tests pass
bun test

# Type check passes
bun run type-check

# Migrations apply cleanly
bun run db:migrate

# API server starts
bun run api:dev

# Admin UI builds
bun --filter @tee-time/admin build
```

### Final Checklist
- [ ] All "Must Have" present:
  - [ ] Team CRUD operational
  - [ ] Team membership management working
  - [ ] Club team assignment working
  - [ ] Team Slack channel configuration saved
  - [ ] Notifications routed to team channel + global channel
  - [ ] Unique constraint prevents duplicate memberships
- [ ] All "Must NOT Have" absent:
  - [ ] No access control filtering added
  - [ ] No team hierarchy
  - [ ] No support notification modification
  - [ ] No agent/WhatsApp changes
- [ ] All new tests pass
- [ ] All existing tests still pass
- [ ] E2E flow works: Create team → Assign club → Book for club → Slack notifications sent to both channels
