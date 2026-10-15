import assert from "node:assert/strict";
import { createHash } from "node:crypto";
export function reviewFingerprint(task) {
  const fields = [
    "id",
    "sourceLang",
    "targetLang",
    "source",
    "context",
    "references",
    "level",
    "levelReason",
    "scene",
    "roles",
    "knowledge",
    "requiredMeaning",
    "provenance",
  ];
  return createHash("sha256")
    .update(
      JSON.stringify(
        Object.fromEntries(fields.map((key) => [key, task[key] ?? null])),
      ),
    )
    .digest("hex");
}
export function applyHumanReviews(tasks, records, releaseAcceptance = null) {
  assert.ok(Array.isArray(records), "Human review records must be an array");
  const output = structuredClone(tasks),
    byId = new Map(output.map((t) => [t.id, t]));
  assert.equal(byId.size, output.length, "Human review task IDs duplicate");
  const summary = {
      accepted: 0,
      pending: tasks.length,
      archived: 0,
      independentlyReviewed: 0,
      userAccepted: 0,
    },
    seen = new Set();
  const nonempty = (s, max = 1000) =>
    typeof s === "string" && s.trim() && s.length <= max;
  for (const r of records) {
    assert.ok(
      r && nonempty(r.taskId) && !seen.has(r.taskId),
      "Human review duplicate or missing task ID",
    );
    seen.add(r.taskId);
    assert.ok(
      r.reviewer?.kind === "human" &&
        nonempty(r.reviewer.name, 300) &&
        nonempty(r.reviewer.competence),
      "Human review needs a named human and language competence",
    );
    assert.ok(
      typeof r.reviewedAt === "string" &&
        /^\d{4}-\d{2}-\d{2}T.*Z$/.test(r.reviewedAt) &&
        Number.isFinite(Date.parse(r.reviewedAt)),
      "Human review date invalid",
    );
    assert.ok(
      nonempty(r.notes, 5000) &&
        ["accept", "reject", "revise"].includes(r.decision),
      "Human review conclusion or notes missing",
    );
    const checks = ["alignment", "naturalness", "context", "level", "age"];
    assert.ok(
      checks.every((k) => typeof r.checks?.[k] === "boolean"),
      "Human review must assess all five checks",
    );
    assert.match(
      r.contentSha256 ?? "",
      /^[a-f0-9]{64}$/,
      "Human review fingerprint invalid",
    );
    const task = byId.get(r.taskId);
    if (!task) {
      assert.notEqual(
        r.decision,
        "accept",
        "Human review accepted task not in current corpus",
      );
      summary.archived++;
      continue;
    }
    assert.equal(
      r.contentSha256,
      reviewFingerprint(task),
      "Human review fingerprint stale: content or labels changed",
    );
    assert.equal(
      r.decision,
      "accept",
      `Human review ${r.taskId} must be excluded or revised before release`,
    );
    assert.ok(
      checks.every((k) => r.checks[k]),
      "Human review acceptance cannot contain failed checks",
    );
    task.review = {
      ...task.review,
      status: "human-reviewed",
      human: "accepted",
      humanEvidence: structuredClone(r),
    };
    summary.accepted++;
    summary.independentlyReviewed++;
    summary.pending--;
  }
  if (releaseAcceptance) {
    const a = releaseAcceptance;
    assert.ok(
      a.kind === "user-directed-assumption" &&
        a.decision === "accept" &&
        nonempty(a.declaredBy, 300) &&
        nonempty(a.statement, 5000),
      "User acceptance declaration invalid",
    );
    assert.ok(
      typeof a.declaredOn === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(a.declaredOn) &&
        Number.isFinite(Date.parse(a.declaredOn)) &&
        new Date(a.declaredOn).toISOString().slice(0, 10) === a.declaredOn,
      "User acceptance date invalid",
    );
    assert.ok(
      Array.isArray(a.tasks) && a.tasks.length > 0,
      "User acceptance tasks missing",
    );
    const declared = new Set();
    for (const item of a.tasks) {
      assert.ok(
        item && !declared.has(item.taskId),
        "User acceptance duplicate task",
      );
      declared.add(item.taskId);
      const task = byId.get(item.taskId);
      assert.ok(task, "User acceptance task not in current corpus");
      assert.equal(
        item.contentSha256,
        reviewFingerprint(task),
        "User acceptance fingerprint stale",
      );
      if (task.review.human === "accepted") continue;
      task.review = {
        ...task.review,
        status: "user-accepted",
        human: "accepted",
        acceptanceBasis: a.kind,
        independentVerification: false,
        userAcceptance: {
          declaredBy: a.declaredBy,
          declaredOn: a.declaredOn,
          statement: a.statement,
          contentSha256: item.contentSha256,
        },
      };
      summary.accepted++;
      summary.userAccepted++;
      summary.pending--;
    }
  }
  return { tasks: output, summary };
}
export function reviewChecklist(data) {
  const md = (s) =>
    String(s)
      .replace(/[\\`*_[\]<>]/g, "\\$&")
      .replaceAll("\n", " ");
  const lines = [
    "# 逐题人工审核清单",
    "",
    `语料版本：${data.version}。共 ${data.tasks.length} 个方向任务。`,
    "",
    "本文件由快照与编选记录生成。当前状态来自 corpus/human-review.json；用户要求按通过计算与独立逐题人审分别标明。逐题核查原文／译文对齐、自然度、上下文、方向等级与适龄性；正反两个方向分别确认。",
    "",
    "真实审核者使用 docs/CORPUS_HUMAN_REVIEW.md 中的格式提交记录；不要编辑本生成文件或替审核者签名。等级指纹变化后旧通过记录失效。人工核查与真实学习者校准分开，后者不因审核通过而自动完成。",
    "",
  ];
  for (const t of [...data.tasks].sort((a, b) =>
    `${a.sourceLang}-${a.targetLang}-${a.level}-${a.id}`.localeCompare(
      `${b.sourceLang}-${b.targetLang}-${b.level}-${b.id}`,
      "en",
    ),
  )) {
    lines.push(
      `## ${t.id}`,
      "",
      `${t.sourceLang} → ${t.targetLang} · L${t.level} · ${t.scene} · ${t.split} · 人工审核：${t.review.status === "user-accepted" ? "按用户要求视为通过（非独立逐题审核记录）" : t.review.human}`,
      "",
      `原句：${md(t.source)}`,
      ``,
      `参考：${t.references.map(md).join(" / ")}`,
      "",
      `等级理由：${md(t.levelReason)}`,
      "",
      `含义要点：${t.requiredMeaning.map(md).join("；")}`,
      "",
      `内容指纹：\`${reviewFingerprint(t)}\``,
      "",
      ...t.provenance.map(
        (p) =>
          `- [Tatoeba #${p.sentenceId}](${p.url}) · ${md(p.author)} · [${p.license}](${p.licenseUrl})`,
      ),
      "",
    );
  }
  return lines.join("\n").trimEnd() + "\n";
}
