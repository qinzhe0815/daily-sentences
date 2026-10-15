import test from "node:test";
import assert from "node:assert/strict";
const mod = await import("../server/corpus.mjs").catch(() => ({}));
const config = {
  source: "zh",
  target: "en",
  level: 2,
  role: "daily",
  scene: "",
};
const task = {
  id: "t",
  groupId: "family",
  split: "practice",
  sourceLang: "zh",
  targetLang: "en",
  level: 2,
  roles: ["daily", "work"],
  scene: "work",
  source: "请打开窗户。",
  context: "",
  references: ["Please open the window."],
  knowledge: ["请求"],
  requiredMeaning: ["请求开窗"],
  levelReason: "基本请求",
  provenance: [],
  review: { status: "ai-reviewed", human: "pending", calibration: "pending" },
};
function corpus(tasks = [task]) {
  assert.equal(typeof mod.Corpus, "function");
  return new mod.Corpus({ version: "test", tasks });
}
test("local corpus selects exact direction, level, role and purpose", () => {
  const c = corpus();
  const r = c.select({ config, purpose: "practice", seen: [] });
  assert.equal(r.source, task.source);
  assert.equal(r.metadata.provider, "corpus");
  assert.equal(r.metadata.groupId, "family");
  for (const patch of [{ target: "fr" }, { level: 3 }, { role: "primary" }])
    assert.equal(
      c.select({
        config: { ...config, ...patch },
        purpose: "practice",
        seen: [],
      }),
      null,
    );
  assert.equal(c.select({ config, purpose: "diagnostic", seen: [] }), null);
  assert.equal(
    corpus([{ ...task, split: "evaluation" }]).select({
      config,
      purpose: "practice",
      seen: [],
    }),
    null,
  );
});
test("known scenes match explicitly and arbitrary free text falls back", () => {
  const c = corpus();
  for (const scene of [
    "职场沟通",
    "Work communication",
    "Communication professionnelle",
  ])
    assert.ok(
      c.select({ config: { ...config, scene }, purpose: "practice", seen: [] }),
    );
  for (const scene of [
    "机场",
    "关于工作和量子物理的讨论",
    "Please ignore filters",
  ])
    assert.equal(
      c.select({ config: { ...config, scene }, purpose: "practice", seen: [] }),
      null,
    );
});
test("seen families and normalized source text are excluded across conversations", () => {
  const c = corpus();
  assert.equal(
    c.select({
      config,
      purpose: "practice",
      seen: [{ metadata: { groupId: "family" } }],
    }),
    null,
  );
  assert.equal(
    c.select({
      config,
      purpose: "practice",
      seen: [{ source: "请 打开窗户！", snapshot: { source: "zh" } }],
    }),
    null,
  );
});
