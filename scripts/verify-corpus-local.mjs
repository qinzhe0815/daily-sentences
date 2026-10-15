// Real local-model protocol smoke check. Uses an isolated learning database.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { AI } from "../server/ai.mjs";
import { Store } from "../server/store.mjs";
import { Service } from "../server/service.mjs";
import { LocalRuntime } from "../server/runtime.mjs";
const directory = mkdtempSync(join(tmpdir(), "daily-corpus-smoke-"));
const runtime = new LocalRuntime(resolve("data"));
const store = new Store(directory);
const ai = new AI(directory, {
  provider: "local",
  baseUrl: "http://127.0.0.1:11434",
  model: process.env.VERIFY_MODEL || "qwen3.5:4b-q4_K_M",
  timeoutMs: 180000,
});
const report = {
  at: new Date().toISOString(),
  model: ai.config.model,
  note: "Local corpus + real model protocol smoke only. Reference answers are supplied as inputs; this does not prove translation quality, independent human review, level calibration or scoring accuracy.",
  samples: [],
};
try {
  await runtime.start();
  const service = new Service(store, ai);
  for (const source of ["zh", "en", "fr"])
    for (const target of ["zh", "en", "fr"])
      if (source !== target) {
        const sample = { direction: `${source}-${target}` },
          started = Date.now();
        try {
          const c = await service.createConversation({
            source,
            target,
            level: 2,
            mode: "fixed",
            role: "daily",
            skipDiagnostic: true,
          });
          const q = store
            .read()
            .questions.find((q) => q.conversationId === c.id);
          if (q?.metadata.provider !== "corpus")
            throw new Error("Expected corpus hit");
          sample.taskId = q.metadata.taskId;
          sample.source = q.source;
          sample.reference = q.reference;
          await service.submit(q.id, {
            answer: q.reference,
            requestId: `corpus-smoke-${source}-${target}`,
          });
          const a = store.read().questions.find((x) => x.id === q.id)
            .attempts[0];
          if (a.status !== "completed") throw new Error(a.error || a.status);
          sample.feedback = a.feedback;
          sample.ok = true;
        } catch (e) {
          sample.ok = false;
          sample.error = e.code || e.message;
        }
        sample.elapsedMs = Date.now() - started;
        report.samples.push(sample);
        writeFileSync(
          "docs/validation/corpus-local-smoke.json",
          JSON.stringify(report, null, 2) + "\n",
        );
        console.log(
          `${sample.direction}: ${sample.ok ? "PASS" : "FAIL " + sample.error} (${sample.elapsedMs}ms)`,
        );
      }
  process.exitCode = report.samples.every((s) => s.ok) ? 0 : 1;
} finally {
  runtime.stop();
  store.close();
  rmSync(directory, { recursive: true, force: true });
}
