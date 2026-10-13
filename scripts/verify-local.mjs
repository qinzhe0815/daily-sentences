// Real-model smoke check with synthetic content; does not touch learning records.
import { AI } from "../server/ai.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const ai = new AI(resolve("data"), {
  provider: "local",
  baseUrl: "http://127.0.0.1:11434",
  model: process.env.VERIFY_MODEL || "qwen3.5:4b-q4_K_M",
  timeoutMs: 180000,
});
const report = {
  at: new Date().toISOString(),
  model: process.env.VERIFY_MODEL || "qwen3.5:4b-q4_K_M",
  note: "Protocol and content samples; human language-quality review is still required.",
  samples: [],
};
for (const source of ["zh", "en", "fr"])
  for (const target of ["zh", "en", "fr"])
    if (source !== target) {
      const sample = { direction: `${source} → ${target}` };
      const start = Date.now();
      try {
        const config = {
          source,
          target,
          role: "daily",
          level: 2,
          mode: "fixed",
          scene: "",
        };
        const q = await ai.call("generate", { config, recent: [] });
        sample.question = q;
        sample.feedback = await ai.call("grade", {
          question: { source: q.source, context: q.context, snapshot: config },
          answer: q.reference,
        });
        sample.ok = true;
      } catch (e) {
        sample.ok = false;
        sample.error = e.code || e.message;
      }
      sample.elapsedMs = Date.now() - start;
      report.samples.push(sample);
      mkdirSync("docs/validation", { recursive: true });
      writeFileSync(
        "docs/validation/local-model-smoke.json",
        JSON.stringify(report, null, 2),
      );
      console.log(
        `${sample.direction}: ${sample.ok ? "PASS" : "FAIL " + sample.error} (${sample.elapsedMs}ms)`,
      );
    }
process.exitCode = report.samples.every((s) => s.ok) ? 0 : 1;
