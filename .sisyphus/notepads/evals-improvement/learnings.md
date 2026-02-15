# Eval Runner - Learnings

## Database URL Configurable for CI

**Date**: 2026-02-15

**Problem**: The eval runner had a hardcoded database URL (`postgres://localhost/teetime_evals`) in `runner.ts:503`, which limited CI portability.

**Solution**: Made the database URL configurable through multiple methods:
1. **CLI flag**: `--db-url <url>`
2. **Environment variable**: `EVAL_DATABASE_URL`
3. **Fallback**: `postgres://localhost/teetime_evals`

**Priority Chain**:
```
config.dbUrl > process.env.EVAL_DATABASE_URL > postgres://localhost/teetime_evals
```

**Implementation Details**:
- Added `dbUrl?: string` to `EvalConfig` type in `runner.ts`
- Modified `runEvals` to read from the priority chain
- Added `--db-url` flag parsing in `cli.ts`
- Updated help text to document the new flag

**Testing**:
- All existing scenarios still pass
- TypeScript type checking passes
- Backward compatible with local development workflow

**Benefits**:
- CI/CD can use production or staging database URLs
- Local development continues to work without changes
- No embedded database support needed (out of scope)
