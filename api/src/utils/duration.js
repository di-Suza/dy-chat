const unitToMs = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
};

// Converts compact duration strings like 15m or 7d into milliseconds.
export const durationToMs = (duration) => {
  if (typeof duration === "number") {
    return duration * 1000;
  }

  const match = String(duration).trim().match(/^(\d+)([smhd])$/);

  if (!match) {
    return 0;
  }

  const [, amount, unit] = match;
  return Number(amount) * unitToMs[unit];
};

// Converts a compact duration string into an absolute Date.
export const durationToDate = (duration) => {
  return new Date(Date.now() + durationToMs(duration));
};

// Returns TTL seconds until a Date/timestamp, clamped at zero.
export const secondsUntil = (dateOrTimestamp) => {
  const timestamp =
    dateOrTimestamp instanceof Date ? dateOrTimestamp.getTime() : dateOrTimestamp;

  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
};
