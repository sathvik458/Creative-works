// Copies the Rive runtime's WebAssembly file into public/ so the app serves it itself,
// instead of the runtime downloading it from a public CDN on every start.
// Runs on `npm install` (postinstall), so the file always matches the installed runtime version.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const runtimeDir = path.dirname(require.resolve("@rive-app/canvas"));
const target = path.join(process.cwd(), "public", "rive", "rive.wasm");

mkdirSync(path.dirname(target), { recursive: true });
copyFileSync(path.join(runtimeDir, "rive.wasm"), target);
console.log(`Copied Rive runtime to ${path.relative(process.cwd(), target)}`);
