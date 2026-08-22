export function formatTzs(amount: unknown): string {
  const num = Number(amount || 0);
  return `TZS ${num.toLocaleString()}`;
}
