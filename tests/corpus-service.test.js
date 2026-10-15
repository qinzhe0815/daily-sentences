import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../server/store.mjs";
import { Service } from "../server/service.mjs";
import { Corpus } from "../server/corpus.mjs";
import { validateBackup } from "../server/model.mjs";
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "daily-corpus-"));
  const store = new Store(dir);
  const calls = [];
  const ai = {
    async call(task, input) {
      calls.push({ task, input });
      if (task === "generate")
        return {
          source: "模型补充的新句子" + calls.length + "。",
          context: "",
          reference: "A generated sentence.",
          knowledge: [],
          metadata: { model: "fixture" },
        };
      return {
        valid: true,
        overall: "意思准确，表达自然。",
        strength: "很好。",
        issues: [],
        references: input.question.rubric.references,
        dimensions: {
          meaning: 90,
          grammar: 90,
          vocabulary: 90,
          naturalness: 90,
        },
        total: 90,
        metadata: { model: "fixture" },
      };
    },
  };
  const service = new Service(store, ai);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { service, store, calls };
}
const cfg = {
  source: "zh",
  target: "en",
  role: "daily",
  level: 2,
  mode: "fixed",
  skipDiagnostic: true,
};
test("default service serves actual local corpus and sends rubric to grading without exposing answers", async (t) => {
  const { service, store, calls } = fixture(t);
  const c = await service.createConversation(cfg);
  const q = store.read().questions.find((q) => q.conversationId === c.id);
  assert.equal(q.metadata.provider, "corpus");
  assert.equal(calls.length, 0);
  assert.equal(q.provenance.length, 2);
  const exposed = service.state().questions[0];
  assert.equal(exposed.rubric, undefined);
  assert.equal(exposed.reference, undefined);
  assert.equal(exposed.provenance, undefined);
  assert.deepEqual(exposed.knowledge, []);
  await service.submit(q.id, {
    answer: q.reference,
    requestId: "submit-local",
  });
  assert.deepEqual(calls[0].input.question.rubric, q.rubric);
  assert.equal(service.state().questions[0].provenance.length, 2);
  assert.doesNotThrow(() => validateBackup(store.export()));
});
test("all six directions and five levels use corpus; global family exclusion survives new conversations", async (t) => {
  const { service, store, calls } = fixture(t);
  for (const source of ["zh", "en", "fr"])
    for (const target of ["zh", "en", "fr"])
      if (source !== target)
        for (let level = 1; level <= 5; level++) {
          // Reset only this isolated test fixture to check independent cells.
          store.mutate((s) => {
            s.questions = [];
            s.conversations = [];
            s.activeConversationId = null;
          });
          const c = await service.createConversation({
            ...cfg,
            source,
            target,
            level,
          });
          const q = store
            .read()
            .questions.find((q) => q.conversationId === c.id);
          assert.equal(
            q.metadata.provider,
            "corpus",
            `${source}-${target} L${level}`,
          );
        }
  assert.equal(calls.length, 0);
  const c = await service.createConversation({
    ...cfg,
    source: "zh",
    target: "en",
    level: 2,
  });
  const d = await service.createConversation({
    ...cfg,
    source: "zh",
    target: "en",
    level: 2,
  });
  const a = store.read().questions.find((q) => q.conversationId === c.id),
    b = store.read().questions.find((q) => q.conversationId === d.id);
  assert.notEqual(a.metadata.groupId, b.metadata.groupId);
});
test("unsupported scenes and exhausted corpus fall back honestly; concurrent chats cannot reserve same family", async (t) => {
  const { service, store, calls } = fixture(t);
  const c = await service.createConversation({
    ...cfg,
    scene: "量子计算研讨会",
  });
  const q = store.read().questions.find((q) => q.conversationId === c.id);
  assert.equal(q.metadata.fallbackReason, "no-matching-local-task");
  assert.equal(calls[0].task, "generate");
  assert.equal(q.metadata.origin, "ai-generated");
  const tasks = new Corpus().tasks.filter(
    (t) =>
      t.sourceLang === "zh" &&
      t.targetLang === "en" &&
      t.level === 2 &&
      t.split === "practice",
  );
  service.corpus = new Corpus({ version: "one", tasks: [tasks[0]] });
  const [x, y] = await Promise.all([
    service.createConversation(cfg),
    service.createConversation(cfg),
  ]);
  const qs = store
    .read()
    .questions.filter((q) => [x.id, y.id].includes(q.conversationId));
  assert.equal(qs.filter((q) => q.metadata.provider === "corpus").length, 1);
  assert.equal(
    qs.filter((q) => q.metadata.origin === "ai-generated").length,
    1,
  );
});
test("diagnostics use only diagnostic families and hide source links until completed", async (t) => {
  const { service, store } = fixture(t);
  const c = await service.createConversation({ ...cfg, skipDiagnostic: false });
  const q = store
    .read()
    .questions.find((q) => q.conversationId === c.id && q.diagnosticId);
  assert.equal(q.metadata.provider, "corpus");
  assert.equal(q.metadata.split, "diagnostic");
  await service.submit(q.id, { answer: q.reference, requestId: "diag-submit" });
  assert.equal(service.state().questions[0].provenance, undefined);
  assert.equal(service.state().questions[0].attempts[0].feedback, undefined);
});

test("corpus snapshot survives restore and malformed rubric or provenance is rejected", async (t) => {
  const { service, store } = fixture(t);
  await service.createConversation(cfg);
  const backup = store.export();
  assert.equal(backup.state.questions[0].metadata.provider, "corpus");
  assert.doesNotThrow(() => validateBackup(backup));
  for (const patch of [
    { rubric: { references: [42], requiredMeaning: [] } },
    { provenance: [{ sentenceId: -1, author: "evil", license: "PROBLEM" }] },
  ]) {
    const invalid = structuredClone(backup);
    Object.assign(invalid.state.questions[0], patch);
    assert.throws(() => validateBackup(invalid), /BACKUP_INVALID/);
  }
});
