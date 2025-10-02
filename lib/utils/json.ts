export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch (error) {
    return [];
  }
}

export function parseJsonObject(value: string | null | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : undefined;
  } catch (error) {
    return undefined;
  }
}

export function stringifyNullable(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}
