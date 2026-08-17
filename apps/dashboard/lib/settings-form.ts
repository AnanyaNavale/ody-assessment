export const TIME_PATTERN = /^\d{2}:\d{2}$/;

export function formsEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function isSettingsSaveDisabled(args: {
  saving: boolean;
  loading: boolean;
  isDirty: boolean;
}): boolean {
  return args.saving || args.loading || !args.isDirty;
}

export function normalizeTime(value: string): string | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return undefined;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return undefined;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function hoursValidationMessage(args: {
  hasOpenDay: boolean;
  start: string;
  end: string;
}): string | null {
  if (!args.hasOpenDay) {
    return null;
  }

  const openingTime = normalizeTime(args.start);
  const closingTime = normalizeTime(args.end);

  if (!openingTime || !TIME_PATTERN.test(openingTime)) {
    return "Opening time must be in HH:MM format";
  }

  if (!closingTime || !TIME_PATTERN.test(closingTime)) {
    return "Closing time must be in HH:MM format";
  }

  return null;
}
