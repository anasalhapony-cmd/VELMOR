// Minimal global shims for the offline pure-logic typecheck only.
// In the real app these come from @types/node + the DOM lib.
declare const process: { env: Record<string, string | undefined> };
