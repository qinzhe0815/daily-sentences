import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const mod = await import("../scripts/build-corpus.mjs").catch(() => ({}));
test("offline build audits official snapshots and produces six-direction five-level coverage", () => {
  assert.equal(typeof mod.buildCorpus, "function");
  const { data, report } = mod.buildCorpus();
  const ledger = JSON.parse(readFileSync("corpus/human-review.json", "utf8"));
  const accepted = new Set([
    ...ledger.records
      .filter((r) => r.decision === "accept")
      .map((r) => r.taskId),
    ...(ledger.releaseAcceptance?.tasks.map((t) => t.taskId) || []),
  ]);
  assert.ok(data.tasks.length >= 300);
  for (const a of ["zh", "en", "fr"])
    for (const b of ["zh", "en", "fr"])
      if (a !== b)
        for (let level = 1; level <= 5; level++)
          assert.ok(
            data.tasks.some(
              (t) =>
                t.sourceLang === a && t.targetLang === b && t.level === level,
            ),
            `${a}-${b} L${level}`,
          );
  const groups = new Map();
  const ids = new Set();
  for (const t of data.tasks) {
    assert.ok(!ids.has(t.id));
    ids.add(t.id);
    if (groups.has(t.groupId)) assert.equal(groups.get(t.groupId), t.split);
    groups.set(t.groupId, t.split);
    assert.equal(t.provenance.length, 2);
    assert.equal(t.review.human, accepted.has(t.id) ? "accepted" : "pending");
    assert.equal(t.review.calibration, "pending");
    for (const p of t.provenance) {
      assert.match(p.url, /^https:\/\/tatoeba.org\/en\/sentences\/show\/\d+$/);
      assert.ok(p.author);
      assert.ok(p.license);
      assert.match(p.retrievedAt, /Z$/);
    }
  }
  assert.equal(report.curatedPairs, 150);
  assert.ok(report.rejected > 0);
  assert.ok(report.candidatePairs > report.curatedPairs);
  assert.ok(data.tasks.some((t) => t.split === "evaluation"));
  for (const [pair, levels] of Object.entries(report.coverage))
    for (const [level, counts] of Object.entries(levels))
      for (const split of ["practice", "diagnostic", "evaluation"])
        assert.ok(counts[split] > 0, `${pair} L${level} ${split}`);
  assert.deepEqual(mod.buildCorpus().data, data);
});
test("curation must reference an actual direct official pair and preserve split families", () => {
  assert.equal(typeof mod.buildCorpus, "function");
  const c = JSON.parse(readFileSync("corpus/curation.json", "utf8"));
  c.entries[0].translationId = 999999999;
  assert.throws(() => mod.buildCorpus({ curation: c }), /not found/);
});

test("GRE and overseas roles only receive matching editorial subject matter", () => {
  const { data } = mod.buildCorpus();
  for (const t of data.tasks) {
    if (t.roles.includes("gre"))
      assert.ok(t.level >= 3 && ["study", "ideas"].includes(t.scene));
    if (t.roles.includes("abroad"))
      assert.ok(["daily", "food", "travel", "work"].includes(t.scene));
  }
});

test("build refuses silently missing required direction-level cells", () => {
  const c = JSON.parse(readFileSync("corpus/curation.json", "utf8"));
  c.entries = c.entries.filter((e) => !e.levels.includes(5));
  assert.throws(
    () => mod.buildCorpus({ curation: c }),
    /cover every direction\/level/,
  );
});

test("editorially rejected alignments stay excluded with an explicit audit reason", () => {
  const { data, report } = mod.buildCorpus();
  assert.ok(
    !data.tasks.some((t) =>
      [
        "tatoeba-1304-27",
        "tatoeba-1304-3120",
        "tatoeba-1523-334467",
        "tatoeba-3339-334467",
      ].includes(t.id),
    ),
  );
  assert.equal(
    report.decisions.find((d) => d.pair === "1304-27").decision,
    "editorial-rejected",
  );
});

test("offline builder applies only evidence submitted for each current direction task", async () => {
  const { reviewFingerprint } = await import("../scripts/corpus-review.mjs");
  const baseline = mod.buildCorpus(),
    task = baseline.data.tasks[0];
  const humanReviews = {
    schemaVersion: 1,
    records: [
      {
        taskId: task.id,
        contentSha256: reviewFingerprint(task),
        reviewer: {
          kind: "human",
          name: "Synthetic integration fixture only",
          competence: "Synthetic bilingual test evidence",
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
        notes:
          "Synthetic unit-test record; not a real reviewer and never written to corpus.",
      },
    ],
  };
  const result = mod.buildCorpus({ humanReviews });
  assert.equal(result.data.tasks[0].review.human, "accepted");
  assert.equal(result.report.humanReview.accepted, 1);
  assert.equal(result.report.humanReview.pending, 299);
  const files = mod.artifacts(result);
  assert.match(files["REVIEW.md"], /299|pending/);
  assert.match(files["REPORT.md"], /1.*299/);
  assert.equal(
    mod.buildCorpus({ humanReviews: { schemaVersion: 1, records: [] } }).report
      .humanReview.accepted,
    0,
  );
});
