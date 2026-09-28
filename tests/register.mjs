// Registers a resolve hook so `node --test` can import the project's TS modules
// that use the `@/` path alias. Node 22 strips TS types natively.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./resolve-hook.mjs', pathToFileURL('./tests/'));
