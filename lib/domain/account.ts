function normalizeHederaAccountId(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return trimmed;
  return `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`;
}

/** Browser-safe comparison for Mirror/env account ids. */
export function accountsEqual(a: string, b: string): boolean {
  return normalizeHederaAccountId(a) === normalizeHederaAccountId(b);
}
