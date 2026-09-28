// Resolve hook: maps the `@/` alias to the project root and lets extensionless
// imports resolve to .ts / .tsx / /index.ts. Test-only (never shipped).
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function resolve(specifier, context, nextResolve) {
  let spec = specifier;

  if (spec.startsWith('@/')) {
    spec = pathToFileURL(join(ROOT, spec.slice(2))).href;
  }

  const pathish =
    spec.startsWith('file:') || spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('/');

  if (pathish) {
    const candidates = [spec, `${spec}.ts`, `${spec}.tsx`, `${spec}/index.ts`];
    for (const c of candidates) {
      try {
        return await nextResolve(c, context);
      } catch {
        /* try next */
      }
    }
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    // Offline sandboxes without node_modules: allow pointing bare packages
    // (e.g. zod) at a local copy via TEST_PKG_<NAME>=/abs/path/entry.js.
    const env = process.env[`TEST_PKG_${specifier.replace(/[^a-z0-9]/gi, '_').toUpperCase()}`];
    if (env) return nextResolve(pathToFileURL(env).href, context);
    throw err;
  }
}
