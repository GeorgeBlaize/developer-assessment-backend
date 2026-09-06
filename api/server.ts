// Vercel transpiles this file on its own (ignoring tsconfig "paths" aliases), so it must
// import the already-built output where tsc-alias has rewritten every "@/..." import to a
// plain relative path. The build command (see vercel.json) runs before this is bundled.
// require() (not import) avoids TS7016 -- there is no .d.ts for the compiled JS output.
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const app = require('../dist/src/app').default;

export default app;
