import { LocalRuntime } from "../server/runtime.mjs";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
if (existsSync(".env")) process.loadEnvFile(".env");
const runtime = new LocalRuntime(resolve(process.env.DATA_DIR || "data"));
const timer = setInterval(() => {
  const p = runtime.status();
  console.log(
    `${p.stage}${p.total ? " " + Math.round(((p.completed || 0) / p.total) * 100) + "%" : ""}`,
  );
}, 5000);
try {
  await runtime.provision();
  console.log("Qwen is ready. Run npm start.");
} catch (e) {
  console.error(
    `Setup failed: ${e.code || e.message}. See README.md for manual installation.`,
  );
  process.exitCode = 1;
} finally {
  clearInterval(timer);
  runtime.stop();
}
