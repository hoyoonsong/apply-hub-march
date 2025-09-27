// Quiet duplicate "fetchX result …" logs in dev (no runtime change)
// React 18 StrictMode double-invokes effects in dev only. Keep StrictMode on, just dedupe logs:

const _seen = new Set<string>();

export function logOnce(key: string, ...args: any[]) {
  if (_seen.has(key)) return;
  _seen.add(key);
  // eslint-disable-next-line no-console
  console.log(...args);
}
