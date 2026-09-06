// Vercel transpiles this file on its own (ignoring tsconfig "paths" aliases), so it must
// import the already-built output where tsc-alias has rewritten every "@/..." import to a
// plain relative path. The build command (see vercel.json) runs before this is bundled.
import app from '../dist/src/app';

export default app;
