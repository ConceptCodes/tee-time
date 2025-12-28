/**
 * Typed error classes for booking operations.
 */

/**
 * Base class for booking-related errors.
 */
export class BookingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingError";
  }
}

/**
 * Thrown when a booking date/time is in the past.
 */
export class BookingInPastError extends BookingError {
  constructor(message = "booking_in_past") {
    super(message);
    this.name = "BookingInPastError";
  }
}

/**
 * Thrown when a booking time is too soon (e.g., less than minimum lead time).
 */
export class BookingTooSoonError extends BookingError {
  constructor(message = "booking_too_soon") {
    super(message);
    this.name = "BookingTooSoonError";
  }
}

/**
 * Thrown when attempting to cancel outside the allowed window.
 */
export class CancellationWindowExceededError extends BookingError {
  constructor(message = "cancellation_window_exceeded") {
    super(message);
    this.name = "CancellationWindowExceededError";
  }
}

/**
 * Thrown when a booking cannot be found.
 */
export class BookingNotFoundError extends BookingError {
  constructor(message = "booking_not_found") {
    super(message);
    this.name = "BookingNotFoundError";
  }
}

/**
 * Thrown when required booking IDs are missing.
 */
export class BookingMissingIdsError extends BookingError {
  constructor(message = "booking_intake_missing_ids") {
    super(message);
    this.name = "BookingMissingIdsError";
  }
}

/**
 * Type guard to check if an error is a BookingError.
 */
export const isBookingError = (error: unknown): error is BookingError => {
  return error instanceof BookingError;
};

/**
 * Type guard to check for specific booking error types.
 */
export const isBookingInPastError = (error: unknown): error is BookingInPastError => {
  return error instanceof BookingInPastError;
};

export const isBookingTooSoonError = (error: unknown): error is BookingTooSoonError => {
  return error instanceof BookingTooSoonError;
};

export const isCancellationWindowExceededError = (
  error: unknown
): error is CancellationWindowExceededError => {
  return error instanceof CancellationWindowExceededError;
};

export const isBookingNotFoundError = (error: unknown): error is BookingNotFoundError => {
  return error instanceof BookingNotFoundError;
};

export const isBookingMissingIdsError = (error: unknown): error is BookingMissingIdsError => {
  return error instanceof BookingMissingIdsError;
};
