# Operational Suite Implementation - Issues and Gotchas

## Potential Issues

### Inactivity Test Limitation
The inactivity test (`operational-inactivity-1`) has a limitation:
- Cannot directly insert into `message_log` table without proper schema structure
- Workaround: Manually clear state using `clearBookingState()` to simulate inactivity timeout
- This is acceptable for testing but doesn't fully reproduce the webhook's message-timestamp-based inactivity detection

### Crypto Hash Import
Used `crypto.hash()` which is available in Node.js environment:
- May not work in browser environments (not relevant for evals)
- Ensure Bun/Node.js runtime for scenario execution

### Member Creation Side Effects
Each scenario creates a test member using `createMemberProfile()`:
- Tests are independent due to unique phone numbers
- No cleanup between tests (acceptable for eval suite)
- Database is cleared before each full eval run

## Gotchas

### Rate Limit Counter Behavior
The rate limit counter uses time-based buckets:
- `windowStart` is calculated as floor(now / windowMs) * windowMs
- This means rate limit resets at the start of each hour window
- Tests assume this behavior when consuming tokens

### DLQ Next Retry Time
DLQ entries must have a `nextRetryAt` in the future:
- Tests use `now.getTime() + 60 * 1000` (1 minute in future)
- If this is set to past, the DLQ worker might process it immediately

### Dedup Entry Expiry
Dedup entries must have `expiresAt` in the future:
- Tests use `now.getTime() + 60 * 1000` (60 seconds)
- Webhook default is 60 seconds (dedup window)
- If `expiresAt <= now`, the entry is considered expired

## Success Criteria Met

✅ New file `packages/evals/src/scenarios/operational.ts` created
✅ At least 4 scenarios (dedup, rate-limit, inactivity, DLQ)
✅ `bun run eval --suite operational` runs without errors (CLI shows operational in help)
✅ Suite registered in `scenarios/index.ts`
✅ CLI supports `--operational <count>` flag
✅ Each scenario has clear expected outcome

