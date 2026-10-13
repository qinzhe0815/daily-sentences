import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { Store } from "../server/store.mjs";
import { AI } from "../server/ai.mjs";
import { Service } from "../server/service.mjs";

async function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "daily-service-"));
  let n = 0,
    fail = false,
    delay = 0,
    calls = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    const payload = JSON.parse(body);
    const input = JSON.parse(payload.messages.at(-1).content);
    calls.push(input);
    if (delay) await new Promise((r) => setTimeout(r, delay));
    res.setHeader("Content-Type", "application/json");
    if (fail) {
      res.writeHead(401);
      res.end("{}");
      return;
    }
    const data =
      input.task === "generate"
        ? {
            source: {
              zh: `这是第${++n}道练习题。`,
              en: `This is sentence number ${n}.`,
              fr: `Voici la phrase numéro ${n}.`,
            }[input.config.source],
            context: "",
            reference: {
              zh: "这是一句自然的翻译。",
              en: "This is a natural translation.",
              fr: "Voici une traduction naturelle.",
            }[input.config.target],
            knowledge: ["tense"],
          }
        : input.task === "grade"
          ? {
              valid: true,
              overall: {
                zh: "意思准确，表达自然，可以保留。",
                en: "Accurate meaning and natural expression.",
                fr: "Le sens est précis et la traduction est naturelle.",
              }[input.question.snapshot.source],
              strength: "Clear.",
              issues: [],
              references: [
                {
                  zh: "这是一句自然的翻译。",
                  en: "This is a natural translation.",
                  fr: "Voici une traduction naturelle.",
                }[input.question.snapshot.target],
              ],
              dimensions: {
                meaning: 90,
                grammar: 90,
                vocabulary: 90,
                naturalness: 90,
              },
              total: 90,
            }
          : input.task === "diagnose"
            ? { level: 3, reason: "Comfortable with everyday expressions." }
            : input.task === "test"
              ? { ok: true }
              : { answer: "A contextual explanation." };
    res.end(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(data) } }],
      }),
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const store = new Store(dir);
  const ai = new AI(dir, {
    provider: "online",
    baseUrl: `http://127.0.0.1:${server.address().port}/v1`,
    model: "test-only",
    apiKey: "test-secret",
  });
  const service = new Service(store, ai);
  t.after(async () => {
    await new Promise((r) => server.close(r));
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    store,
    service,
    ai,
    calls,
    setFail: (v) => (fail = v),
    setDelay: (v) => (delay = v),
  };
}
const config = {
  source: "zh",
  target: "en",
  role: "daily",
  level: 3,
  mode: "auto",
  scene: "",
};
test("six language directions generate, grade; settings changes keep old snapshot", async (t) => {
  const { service, store, calls } = await fixture(t);
  for (const source of ["zh", "en", "fr"])
    for (const target of ["zh", "en", "fr"])
      if (source !== target) {
        const c = await service.createConversation({
          ...config,
          source,
          target,
          skipDiagnostic: true,
        });
        const q = store
          .read()
          .questions.find(
            (q) =>
              q.id ===
              store.read().conversations.find((x) => x.id === c.id)
                .currentQuestionId,
          );
        assert.equal(q.snapshot.source, source);
        assert.equal(q.snapshot.target, target);
        await service.submit(q.id, {
          answer: "A meaningful attempt",
          requestId: `answer-${source}-${target}`,
        });
      }
  const s = store.read(),
    c = s.conversations[0],
    q = s.questions[0];
  service.updateConversation(c.id, {
    config: { ...config, source: "en", target: "fr" },
  });
  await service.submit(q.id, {
    answer: "Revised attempt",
    requestId: "revision",
  });
  assert.equal(calls.at(-1).question.snapshot.target, q.snapshot.target);
  assert.equal(store.read().questions[0].attempts[1].kind, "revision");
});
test("async return stays in originating conversation; retry does not duplicate attempt", async (t) => {
  const { service, store, setFail, setDelay } = await fixture(t);
  const a = await service.createConversation({
    ...config,
    skipDiagnostic: true,
  });
  const b = await service.createConversation({
    ...config,
    target: "fr",
    skipDiagnostic: true,
  });
  const q = store
    .read()
    .conversations.find((c) => c.id === a.id).currentQuestionId;
  setDelay(40);
  const p = service.submit(q, { answer: "First answer", requestId: "unique" });
  service.activate(b.id);
  await p;
  assert.equal(store.read().activeConversationId, b.id);
  assert.equal(
    store.read().questions.find((x) => x.id === q).attempts.length,
    1,
  );
  await service.submit(q, { answer: "First answer", requestId: "unique" });
  assert.equal(
    store.read().questions.find((x) => x.id === q).attempts.length,
    1,
  );
  setFail(true);
  await assert.rejects(
    service.submit(q, { answer: "Second answer", requestId: "fail" }),
    { code: "AI_AUTH" },
  );
  const attempt = store
    .read()
    .questions.find((x) => x.id === q)
    .attempts.at(-1);
  assert.equal(attempt.status, "failed");
  setFail(false);
  await service.retryAttempt(q, attempt.id);
  assert.equal(
    store.read().questions.find((x) => x.id === q).attempts.length,
    2,
  );
});
test("diagnosis hides feedback until five answers; explicit apply updates profile and generates first question", async (t) => {
  const { service, store } = await fixture(t);
  const c = await service.createConversation(config);
  const diag = store.read().diagnostics[0];
  assert.ok(diag);
  for (let i = 0; i < 5; i++) {
    const d = store.read().diagnostics[0];
    const qid = d.questionIds.at(-1);
    await service.submit(qid, {
      answer: "Diagnostic answer",
      requestId: `d${i}`,
    });
    if (i === 0)
      assert.equal(
        service.state().questions[0].attempts[0].feedback,
        undefined,
      );
    await service.advanceDiagnostic(diag.id);
  }
  assert.equal(store.read().diagnostics[0].status, "completed");
  assert.equal(store.read().profiles.en, undefined);
  await service.applyDiagnostic(diag.id, { updateProfile: true });
  assert.equal(store.read().profiles.en.level, 3);
  assert.ok(
    store.read().conversations.find((x) => x.id === c.id).currentQuestionId,
  );
});
test("question and feedback favorites are distinct; review never contributes to difficulty", async (t) => {
  const { service, store } = await fixture(t);
  const c = await service.createConversation({
    ...config,
    skipDiagnostic: true,
  });
  const qid = store.read().conversations[0].currentQuestionId;
  await service.submit(qid, { answer: "Original", requestId: "orig" });
  const a = store.read().questions[0].attempts[0];
  service.favorite({ type: "question", objectId: qid, on: true });
  service.favorite({ type: "question", objectId: qid, on: true });
  service.favorite({ type: "feedback", objectId: a.id, on: true });
  assert.equal(store.read().favorites.length, 2);
  await service.submit(qid, {
    answer: "Review",
    requestId: "review",
    kind: "review",
  });
  assert.equal(store.read().conversations[0].window.length, 1);
  await service.followup(qid, {
    text: "Why?",
    attemptId: a.id,
    requestId: "why",
  });
  assert.equal(store.read().questions[0].followups[0].status, "completed");
  assert.equal(store.read().conversations[0].id, c.id);
});
test("explicit reassessment goes straight to diagnostic even with a saved profile", async (t) => {
  const { service, store, calls } = await fixture(t);
  service.profile("en", 3);
  await service.createConversation({ ...config, diagnostic: true });
  assert.equal(store.read().questions.length, 1);
  assert.ok(store.read().questions[0].diagnosticId);
  assert.equal(calls[0].diagnostic, true);
});
test("changing difficulty while grading excludes the old sample from the new window", async (t) => {
  const { service, store, setDelay } = await fixture(t);
  const c = await service.createConversation({
    ...config,
    skipDiagnostic: true,
  });
  const qid = store.read().conversations[0].currentQuestionId;
  setDelay(30);
  const pending = service.submit(qid, {
    answer: "Old difficulty",
    requestId: "old-difficulty",
  });
  service.updateConversation(c.id, { config: { level: 1 } });
  await pending;
  assert.equal(store.read().conversations[0].window.length, 0);
});
test("backup rejects malformed feedback and broken followup references without changing records", async (t) => {
  const { service, store } = await fixture(t);
  await service.createConversation({ ...config, skipDiagnostic: true });
  const qid = store.read().questions[0].id;
  await service.submit(qid, {
    answer: "Saved answer",
    requestId: "backup-answer",
  });
  const backup = store.export();
  backup.state.questions[0].attempts[0].feedback.issues = "not-an-array";
  assert.throws(() => service.importBackup(backup), { code: "BACKUP_INVALID" });
  assert.equal(store.read().questions[0].attempts[0].answer, "Saved answer");
});
test("diagnostic next retry applies the preceding score only once", async (t) => {
  const { service, store, setFail } = await fixture(t);
  await service.createConversation({ ...config, level: 2 });
  const d = store.read().diagnostics[0];
  await service.submit(d.questionIds[0], {
    answer: "Good diagnostic answer",
    requestId: "diagnostic-retry",
  });
  setFail(true);
  await assert.rejects(service.advanceDiagnostic(d.id));
  await assert.rejects(service.advanceDiagnostic(d.id));
  setFail(false);
  await service.advanceDiagnostic(d.id);
  const live = store.read().diagnostics[0];
  const next = store.read().questions.find((q) => q.id === live.questionIds[1]);
  assert.equal(next.snapshot.level, 3);
});
test("parallel retries of the same failed attempt cannot issue duplicate grading jobs", async (t) => {
  const { service, store, setFail, setDelay, calls } = await fixture(t);
  await service.createConversation({ ...config, skipDiagnostic: true });
  const qid = store.read().questions[0].id;
  setFail(true);
  await assert.rejects(
    service.submit(qid, { answer: "Saved", requestId: "retry-lock" }),
  );
  const aid = store.read().questions[0].attempts[0].id;
  setFail(false);
  setDelay(30);
  const before = calls.length,
    p = service.retryAttempt(qid, aid);
  await assert.rejects(service.retryAttempt(qid, aid), { code: "BUSY" });
  await p;
  assert.equal(calls.length, before + 1);
  assert.equal(store.read().questions[0].attempts[0].status, "completed");
  service.backupPreview(store.export());
});

test("each new conversation defaults to diagnosis even for a previously profiled language", async (t) => {
  const { service, store, calls } = await fixture(t);
  for (const target of ["zh", "en", "fr"]) service.profile(target, 4);
  const profiles = structuredClone(store.read().profiles);
  for (const target of ["zh", "en", "fr"])
    for (let repeat = 0; repeat < 2; repeat++) {
      const c = await service.createConversation({
        source: target === "zh" ? "en" : "zh",
        target,
      });
      const live = store.read().conversations.find((x) => x.id === c.id);
      assert.ok(live.activeDiagnosticId, `${target}, creation ${repeat + 1}`);
      const diagnostic = store
        .read()
        .diagnostics.find((x) => x.id === live.activeDiagnosticId);
      const q = store
        .read()
        .questions.find((x) => x.id === diagnostic.questionIds[0]);
      assert.equal(q.diagnosticId, live.activeDiagnosticId);
      assert.equal(live.config.level, 4);
      assert.equal(calls.at(-1).diagnostic, true);
    }
  assert.deepEqual(store.read().profiles, profiles);
});

test("explicit skip starts directly at the chosen level without overwriting an existing profile", async (t) => {
  const { service, store, calls } = await fixture(t);
  service.profile("en", 4);
  const profile = structuredClone(store.read().profiles.en);
  const inherited = await service.createConversation({
    source: "zh",
    target: "en",
    skipDiagnostic: true,
  });
  assert.equal(
    store.read().conversations.find((x) => x.id === inherited.id).config.level,
    4,
  );
  const chosen = await service.createConversation({
    ...config,
    level: 2,
    skipDiagnostic: true,
  });
  const live = store.read().conversations.find((x) => x.id === chosen.id);
  assert.equal(live.config.level, 2);
  assert.equal(live.activeDiagnosticId, null);
  assert.equal(calls.at(-1).diagnostic, false);
  assert.deepEqual(store.read().profiles.en, profile);
});
