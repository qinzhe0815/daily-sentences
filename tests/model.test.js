import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initialState,
  validateConfig,
  updateDifficulty,
  validateBackup,
  publicState,
} from "../server/model.mjs";
import { Store } from "../server/store.mjs";

test("six directions are valid; same language and invalid level rejected", () => {
  for (const source of ["zh", "en", "fr"])
    for (const target of ["zh", "en", "fr"]) {
      const config = {
        source,
        target,
        role: "daily",
        level: 3,
        mode: "auto",
        scene: "",
      };
      if (source === target) assert.throws(() => validateConfig(config));
      else assert.equal(validateConfig(config).target, target);
    }
  assert.throws(() =>
    validateConfig({ source: "zh", target: "en", role: "daily", level: 6 }),
  );
});
test("question source defaults to auto and rejects unsupported selections", () => {
  const config = { source: "zh", target: "en", role: "daily", level: 2 };
  assert.equal(validateConfig(config).questionSource, "auto");
  for (const questionSource of ["auto", "local", "ai"])
    assert.equal(validateConfig({ ...config, questionSource }).questionSource, questionSource);
  for (const questionSource of ["other", "", false])
    assert.throws(() => validateConfig({ ...config, questionSource }), /INVALID_INPUT/);
});
test("five first answers slowly adjust; revisions, reviews and fixed mode excluded", () => {
  const c = { config: { level: 3, mode: "auto" }, window: [], adjustments: [] };
  updateDifficulty(c, {
    id: "r",
    kind: "revision",
    eligible: true,
    feedback: { valid: true, total: 100 },
  });
  assert.equal(c.window.length, 0);
  for (let i = 0; i < 4; i++)
    updateDifficulty(c, {
      id: String(i),
      kind: "first",
      eligible: true,
      feedback: { valid: true, total: 90 },
    });
  assert.equal(c.config.level, 3);
  updateDifficulty(c, {
    id: "4",
    kind: "first",
    eligible: true,
    feedback: { valid: true, total: 90 },
  });
  assert.equal(c.config.level, 4);
  assert.equal(c.window.length, 0);
  c.config.mode = "fixed";
  for (let i = 0; i < 5; i++)
    updateDifficulty(c, {
      id: "f" + i,
      kind: "first",
      eligible: true,
      feedback: { valid: true, total: 0 },
    });
  assert.equal(c.config.level, 4);
});
test("atomic store rollback, persistence, interrupted jobs, invalid backup rejection", () => {
  const dir = mkdtempSync(join(tmpdir(), "daily-store-"));
  let db = new Store(dir);
  db.mutate((s) => {
    s.settings.uiLanguage = "fr";
    s.requests.push({ id: "req", status: "pending" });
  });
  assert.throws(() =>
    db.mutate((s) => {
      s.settings.uiLanguage = "en";
      throw Error("rollback");
    }),
  );
  assert.equal(db.read().settings.uiLanguage, "fr");
  db.close();
  db = new Store(dir);
  assert.equal(db.read().settings.uiLanguage, "fr");
  assert.equal(db.read().requests[0].status, "interrupted");
  assert.throws(() => validateBackup({ version: 99, state: initialState() }));
  const s = initialState();
  s.favorites.push({ id: "f", type: "question", objectId: "missing" });
  assert.throws(() => validateBackup({ version: 1, state: s }));
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
test("public view hides reference translations and diagnostic feedback", () => {
  const s = initialState();
  s.questions.push({
    id: "q",
    reference: "secret",
    knowledge: ["SECRET-HINT"],
    attempts: [],
    followups: [],
    diagnosticId: null,
  });
  s.questions.push({
    id: "d",
    reference: "secret",
    knowledge: ["SECRET-HINT"],
    diagnosticId: "diag",
    attempts: [{ feedback: { references: ["hidden"] } }],
    followups: [],
  });
  s.diagnostics.push({ id: "diag", status: "active" });
  const view = publicState(s);
  assert.equal(view.questions[0].reference, undefined);
  assert.deepEqual(view.questions[0].knowledge, []);
  assert.deepEqual(view.questions[1].knowledge, []);
  assert.equal(view.questions[1].attempts[0].feedback, undefined);
  assert.equal(s.questions[0].reference, "secret");
});

test("public view always strips rubric and withholds provenance throughout unfinished diagnostics", () => {
  const s = initialState();
  s.questions.push({
    id: "q",
    diagnosticId: "d",
    reference: "SECRET",
    rubric: { references: ["SECRET"], requiredMeaning: ["SECRET"] },
    provenance: [{ url: "SECRET-LINK" }],
    knowledge: ["SECRET-HINT"],
    attempts: [{ status: "completed", feedback: { references: ["SECRET"] } }],
  });
  s.diagnostics.push({ id: "d", status: "active" });
  let q = publicState(s).questions[0];
  assert.equal(q.rubric, undefined);
  assert.equal(q.provenance, undefined);
  assert.equal(q.attempts[0].feedback, undefined);
  s.diagnostics[0].status = "completed";
  q = publicState(s).questions[0];
  assert.equal(q.rubric, undefined);
  assert.equal(q.provenance.length, 1);
  assert.ok(q.attempts[0].feedback);
});

test("pre-answer metadata cannot disclose translation sentence IDs through task or family IDs", () => {
  const s = initialState();
  s.questions.push({
    id: "q",
    metadata: {
      provider: "corpus",
      taskId: "tatoeba-1-SECRET-TARGET-ID",
      groupId: "tatoeba-family-SECRET-TARGET-ID",
    },
    reference: "secret",
    rubric: {},
    provenance: [],
    knowledge: [],
    attempts: [],
  });
  const q = publicState(s).questions[0];
  assert.equal(q.metadata.taskId, undefined);
  assert.equal(q.metadata.groupId, undefined);
  assert.equal(q.metadata.provider, "corpus");
});
