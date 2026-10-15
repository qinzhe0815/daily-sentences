import test from "node:test";
import assert from "node:assert/strict";
const review = await import("../scripts/corpus-review.mjs").catch(() => ({}));
const task = {
  id: "synthetic-task",
  sourceLang: "zh",
  targetLang: "en",
  source: "请打开窗户。",
  context: "",
  references: ["Please open the window."],
  level: 1,
  levelReason: "简单请求",
  scene: "daily",
  roles: ["daily"],
  knowledge: ["请求"],
  requiredMeaning: ["Request opening the window."],
  review: { status: "ai-reviewed", human: "pending", calibration: "pending" },
};
function record() {
  assert.equal(typeof review.reviewFingerprint, "function");
  return {
    taskId: task.id,
    contentSha256: review.reviewFingerprint(task),
    reviewer: {
      kind: "human",
      name: "Synthetic test fixture, not a real reviewer",
      competence: "Synthetic zh/en competence for validation only",
    },
    reviewedAt: "2026-10-14T10:00:00.000Z",
    decision: "accept",
    checks: {
      alignment: true,
      naturalness: true,
      context: true,
      level: true,
      age: true,
    },
    notes: "Synthetic acceptance; never added to real corpus.",
  };
}
test("no submitted evidence keeps independent human review pending", () => {
  assert.equal(typeof review.applyHumanReviews, "function");
  const result = review.applyHumanReviews([task], []);
  assert.equal(result.tasks[0].review.human, "pending");
  assert.equal(result.summary.accepted, 0);
  assert.equal(result.summary.pending, 1);
});
test("acceptance requires explicit human evidence bound to current content; cannot mutate another direction", () => {
  const r = record();
  const result = review.applyHumanReviews(
    [task, { ...task, id: "reverse-task", sourceLang: "en", targetLang: "zh" }],
    [r],
  );
  assert.equal(result.tasks[0].review.human, "accepted");
  assert.equal(result.tasks[0].review.status, "human-reviewed");
  assert.equal(result.tasks[1].review.human, "pending");
  assert.equal(task.review.human, "pending");
  for (const patch of [
    { contentSha256: "stale" },
    { reviewer: { kind: "ai", name: "Model", competence: "Model output" } },
    { notes: "" },
    { reviewedAt: "invalid" },
    {
      checks: {
        alignment: false,
        naturalness: true,
        context: true,
        level: true,
        age: true,
      },
    },
  ])
    assert.throws(
      () => review.applyHumanReviews([task], [{ ...r, ...patch }]),
      /Human review/,
    );
  assert.throws(
    () => review.applyHumanReviews([task, { ...task, level: 2 }], [r]),
    /Human review/,
  );
});
test("rejections and changes cannot be silently included in the released corpus", () => {
  const r = record();
  for (const decision of ["reject", "revise"])
    assert.throws(
      () => review.applyHumanReviews([task], [{ ...r, decision }]),
      /must be excluded or revised/,
    );
  assert.throws(() => review.applyHumanReviews([task], [r, r]), /duplicate/);
});
test("review fingerprints change with text, references, direction, level, hints and applicable roles", () => {
  const original = record().contentSha256;
  for (const patch of [
    { source: "请关上窗户。" },
    { references: ["Close the window."] },
    { targetLang: "fr" },
    { level: 2 },
    { requiredMeaning: ["Close it."] },
    { roles: ["primary"] },
  ])
    assert.notEqual(review.reviewFingerprint({ ...task, ...patch }), original);
});

test("user-directed batch acceptance counts as passed while preserving its declared basis", () => {
  const acceptance = {
    kind: "user-directed-assumption",
    decision: "accept",
    declaredBy: "project-owner",
    declaredOn: "2026-10-15",
    statement: "全部按照已经人工检查通过计算",
    tasks: [{ taskId: task.id, contentSha256: review.reviewFingerprint(task) }],
  };
  const result = review.applyHumanReviews([task], [], acceptance);
  assert.equal(result.tasks[0].review.human, "accepted");
  assert.equal(result.tasks[0].review.status, "user-accepted");
  assert.equal(
    result.tasks[0].review.acceptanceBasis,
    "user-directed-assumption",
  );
  assert.equal(result.tasks[0].review.humanEvidence, undefined);
  assert.equal(result.tasks[0].review.calibration, "pending");
  assert.equal(result.summary.accepted, 1);
  assert.equal(result.summary.pending, 0);
  assert.equal(result.summary.userAccepted, 1);
  assert.equal(result.summary.independentlyReviewed, 0);
  const stale = {
    ...acceptance,
    tasks: [{ taskId: task.id, contentSha256: "0".repeat(64) }],
  };
  assert.throws(
    () => review.applyHumanReviews([task], [], stale),
    /User acceptance/,
  );
  assert.throws(
    () =>
      review.applyHumanReviews([task], [], { ...acceptance, statement: "" }),
    /User acceptance/,
  );
  assert.throws(
    () =>
      review.applyHumanReviews([task], [], {
        ...acceptance,
        tasks: [...acceptance.tasks, ...acceptance.tasks],
      }),
    /User acceptance/,
  );
  assert.throws(
    () =>
      review.applyHumanReviews(
        [task],
        [{ ...record(), decision: "reject" }],
        acceptance,
      ),
    /must be excluded or revised/,
  );
});
