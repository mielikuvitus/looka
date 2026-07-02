// A claim still open after this many days counts as past-SLA.
export const SLA_DAYS = 7

// Soft cap of open claims per handler before Team flags them as overloaded.
export const HANDLER_SOFT_CAP = 6

export function slaCutoff(now = Date.now()): Date {
  return new Date(now - SLA_DAYS * 86_400_000)
}
