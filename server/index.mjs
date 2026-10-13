import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "./store.mjs";
import { AI } from "./ai.mjs";
import { Service } from "./service.mjs";
import { createApp } from "./http.mjs";
import { LocalRuntime } from "./runtime.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(resolve(root, ".env")))
  process.loadEnvFile(resolve(root, ".env"));
const directory = resolve(root, process.env.DATA_DIR || "data");
const store = new Store(directory),
  ai = new AI(directory),
  runtime = new LocalRuntime(directory);
const app = createApp(new Service(store, ai), {
  publicDir: resolve(root, "public"),
  runtime,
});
const port = Number(process.env.PORT) || 3210;
// Loopback-only is intentional: LAN/public deployment needs a separate security design.
app.listen(port, "127.0.0.1", () =>
  console.log(`Daily Sentences: http://127.0.0.1:${port}\nData: ${store.path}`),
);
if (ai.status().provider === "local" && runtime.binary())
  runtime.start().catch(() => {});
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  runtime.stop();
  app.close(() => {
    store.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
