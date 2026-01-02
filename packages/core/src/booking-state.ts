import { createBookingStateRepository, type Database } from "@tee-time/database";
import { logger } from "./logger";

export type StoredBookingState<TState = Record<string, unknown>> = {
  memberId: string;
  state: TState;
};

const DEFAULT_BOOKING_STATE_TTL_MINUTES = 120;

const parseBookingStateTtlMinutes = () => {
  const raw = process.env.BOOKING_STATE_TTL_MINUTES;
  if (raw === undefined) {
    return DEFAULT_BOOKING_STATE_TTL_MINUTES;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_BOOKING_STATE_TTL_MINUTES;
  }
  if (parsed <= 0) {
    return null;
  }
  return parsed;
};

export type FlowStateEnvelope<TState = Record<string, unknown>> = {
  flow: string;
  data: TState;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

export const isFlowStateEnvelope = (
  value: unknown
): value is FlowStateEnvelope => {
  if (!isRecord(value)) {
    return false;
  }
  return "flow" in value && "data" in value;
};

export type SharedBookingContext = {
  club?: string;
  clubId?: string;
  clubLocation?: string;
  preferredDate?: string;
  preferredTime?: string;
  players?: number;
  guestNames?: string;
  notes?: string;
  bay?: string;
  bayLabel?: string;
};

export const SHARED_CONTEXT_KEY = "sharedBookingContext";

export const wrapFlowState = <TState>(
  flow: string,
  data: TState,
  sharedContext?: SharedBookingContext
): FlowStateEnvelope<TState> => ({
  flow,
  data,
  ...(sharedContext && { [SHARED_CONTEXT_KEY]: sharedContext }),
});

export const unwrapFlowState = <TState>(
  value: unknown,
  flow: string
): TState | undefined => {
  if (isFlowStateEnvelope(value)) {
    return value.flow === flow ? (value.data as TState) : undefined;
  }
  if (flow === "booking-new" && isRecord(value)) {
    return value as TState;
  }
  return undefined;
};

export const extractSharedContext = (
  value: unknown
): SharedBookingContext | undefined => {
  if (isFlowStateEnvelope(value)) {
    const envelope = value as FlowStateEnvelope & Record<string, unknown>;
    return (
      (envelope[SHARED_CONTEXT_KEY] as SharedBookingContext | undefined) ??
      (envelope.data as Record<string, unknown>)[
        SHARED_CONTEXT_KEY
      ] as SharedBookingContext | undefined
    );
  }
  if (isRecord(value)) {
    return value[SHARED_CONTEXT_KEY] as SharedBookingContext;
  }
  return undefined;
};

export const mergeSharedContext = (
  existing: SharedBookingContext | undefined,
  updates: Partial<SharedBookingContext>
): SharedBookingContext => {
  const base = existing ?? {};
  const merged = {
    ...base,
    ...updates,
  };
  Object.keys(merged).forEach((key) => {
    if (merged[key as keyof SharedBookingContext] === undefined) {
      delete merged[key as keyof SharedBookingContext];
    }
  });
  return merged;
};

export const getFlowFromState = (value: unknown): string | null => {
  if (isFlowStateEnvelope(value)) {
    return value.flow;
  }
  if (isRecord(value)) {
    return "booking-new";
  }
  return null;
};

const compactState = <TState extends Record<string, unknown>>(state: TState) =>
  Object.fromEntries(
    Object.entries(state).filter(([, value]) => value !== undefined)
  ) as TState;

export const getBookingState = async <TState extends Record<string, unknown>>(
  db: Database,
  memberId: string
): Promise<StoredBookingState<TState> | null> => {
  const repo = createBookingStateRepository(db);
  const record = await repo.getByMemberId(memberId);
  if (!record) {
    return null;
  }
  const ttlMinutes = parseBookingStateTtlMinutes();
  if (ttlMinutes) {
    const updatedAt = record.updatedAt ?? record.createdAt;
    const ageMs = Date.now() - updatedAt.getTime();
    if (ageMs > ttlMinutes * 60 * 1000) {
      await repo.deleteByMemberId(memberId);
      logger.info("core.bookingState.expired", {
        memberId,
        ttlMinutes,
      });
      return null;
    }
  }
  return {
    memberId: record.memberId,
    state: record.state as TState
  };
};

export const saveBookingState = async <TState extends Record<string, unknown>>(
  db: Database,
  memberId: string,
  state: TState
) => {
  const repo = createBookingStateRepository(db);
  const now = new Date();
  const payload = compactState(state);
  const record = await repo.upsert({
    memberId,
    state: payload,
    createdAt: now,
    updatedAt: now
  });
  logger.info("core.bookingState.save", { memberId });
  return {
    memberId: record.memberId,
    state: record.state as TState
  };
};

export const clearBookingState = async (db: Database, memberId: string) => {
  const repo = createBookingStateRepository(db);
  const record = await repo.deleteByMemberId(memberId);
  if (record) {
    logger.info("core.bookingState.clear", { memberId });
  }
  return record;
};
