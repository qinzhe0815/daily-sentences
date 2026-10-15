// Isolated visual QA fixture. Never imported by the production server.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Store } from "../server/store.mjs";
import { Service } from "../server/service.mjs";
import { createApp } from "../server/http.mjs";
const directory = mkdtempSync(join(tmpdir(), "daily-browser-"));
const store = new Store(directory);
let n = 0;
const ai = {
  status: () => ({
    provider: "local",
    baseUrl: "http://127.0.0.1:11434",
    model: "QA fixture — not real AI",
    configured: true,
  }),
  call: async (task, input) => {
    await new Promise((r) => setTimeout(r, 600));
    const metadata = { model: "QA fixture", promptVersion: "test-only" };
    if (task === "generate")
      return {
        source:
          input.config.source === "zh"
            ? [
                "如果明天天气不错，我们就去河边散步吧。",
                "我想订一张靠窗的桌子，可以吗？",
                "我已经把会议改到下周一了。",
              ][n++ % 3]
            : "Could we move the meeting to next Monday?",
        context: "向朋友提出一个周末计划。",
        reference:
          "If the weather is nice tomorrow, let’s take a walk by the river.",
        knowledge: ["条件句", "日常邀约"],
        metadata,
      };
    if (task === "grade")
      return {
        valid: true,
        overall: "意思传达准确，表达自然。你使用的条件句和邀请语气都很合适。",
        strength: "“let’s take a walk” 是自然的日常表达。",
        issues: [
          {
            quote: "good",
            kind: "polish",
            category: "vocabulary",
            severity: "minor",
            explanation: "用 nice 描述天气更贴近日常口语，原词也可以成立。",
            suggestion: "If the weather is nice tomorrow…",
          },
        ],
        references: [
          "If the weather is nice tomorrow, let’s take a walk by the river.",
        ],
        dimensions: {
          meaning: 95,
          grammar: 90,
          vocabulary: 90,
          naturalness: 90,
        },
        total: 92,
        metadata,
      };
    if (task === "diagnose")
      return {
        level: 3,
        reason: "能够使用常见句型连接观点，可逐步练习更复杂的表达。",
        metadata,
      };
    return {
      answer:
        "这里的 let’s 表达共同邀约。也可以用 How about taking a walk?，语气更委婉。",
      metadata,
    };
  },
};
const service = new Service(store, ai, { corpus: null });
const a = await service.createConversation({
  source: "zh",
  target: "en",
  role: "daily",
  level: 3,
  skipDiagnostic: true,
});
const q = store.read().conversations[0].currentQuestionId;
await service.submit(q, {
  answer: "If the weather is good tomorrow, let’s take a walk by the river.",
  requestId: "qa-answer",
});
service.favorite({ type: "question", objectId: q, on: true });
service.favorite({
  type: "feedback",
  objectId: store.read().questions[0].attempts[0].id,
  on: true,
});
const b = await service.createConversation({
  source: "en",
  target: "fr",
  role: "work",
  level: 2,
  scene: "工作沟通",
  skipDiagnostic: true,
});
service.activate(a.id);
const app = createApp(service, { publicDir: resolve("public") });
app.listen(3211, "127.0.0.1", () =>
  console.log("QA fixture: http://127.0.0.1:3211"),
);
process.on("SIGINT", () => {
  app.close();
  store.close();
  rmSync(directory, { recursive: true, force: true });
  process.exit();
});
