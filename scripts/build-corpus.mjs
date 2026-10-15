import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { applyHumanReviews, reviewChecklist } from "./corpus-review.mjs";
import {
  LANG,
  LICENSES,
  screenPair,
  normalize,
  similarity,
} from "./corpus-tools.mjs";
const root = new URL("../corpus/", import.meta.url);
const read = (name) => readFileSync(new URL(name, root), "utf8");
const json = (name) => JSON.parse(read(name));
const hash = (s) => createHash("sha256").update(s).digest("hex");
export function buildCorpus({
  curation = json("curation.json"),
  humanReviews = json("human-review.json"),
} = {}) {
  assert.equal(
    humanReviews.schemaVersion,
    1,
    "Human review schema version unsupported",
  );
  const manifest = json("sources/manifest.json"),
    candidates = new Map();
  for (const request of manifest.requests) {
    assert.equal(new URL(request.url).origin, "https://api.tatoeba.org");
    const raw = read("sources/" + request.file);
    assert.equal(
      hash(raw),
      request.sha256,
      `Snapshot hash mismatch: ${request.file}`,
    );
    for (const a of JSON.parse(raw).data)
      for (const b of a.translations) {
        const key = a.id + "-" + b.id;
        if (!candidates.has(key)) candidates.set(key, { a, b, request });
      }
  }
  const exclusions = new Map(
    (curation.exclusions || []).map((e) => [
      `${e.sourceId}-${e.translationId}`,
      e.reason,
    ]),
  );
  for (const [key, reason] of exclusions) {
    assert.ok(candidates.has(key), `Excluded official pair not found: ${key}`);
    assert.ok(typeof reason === "string" && reason.trim());
  }
  const selected = new Map();
  for (const e of curation.entries) {
    const key = e.sourceId + "-" + e.translationId,
      pair = candidates.get(key);
    assert.ok(pair, `Official direct pair not found: ${key}`);
    assert.ok(
      !exclusions.has(key),
      `Editorially rejected pair selected: ${key}`,
    );
    assert.equal(
      screenPair(pair.a, pair.b),
      null,
      `Rejected pair selected: ${key}`,
    );
    assert.ok(!selected.has(key), `Duplicate selection: ${key}`);
    assert.ok(
      e.levels.length === 2 &&
        e.levels.every((l) => Number.isInteger(l) && l >= 1 && l <= 5),
    );
    assert.ok(
      e.levelReasons.length === 2 && e.levelReasons.every((r) => r.trim()),
    );
    assert.ok(
      ["daily", "food", "travel", "study", "work", "ideas"].includes(e.scene),
    );
    assert.ok(
      e.requiredMeaning.length &&
        e.requiredMeaning.every((v) => typeof v === "string" && v.trim()),
    );
    for (const l of ["zh", "en", "fr"]) assert.ok(e.focus[l]?.trim());
    assert.equal(e.review.status, "ai-reviewed");
    assert.equal(e.review.human, "pending");
    assert.equal(e.review.calibration, "pending");
    selected.set(key, { ...pair, e });
  }
  const rows = [...selected.values()],
    parent = rows.map((_, i) => i),
    nearDuplicates = [];
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (i, j) => {
    parent[find(j)] = find(i);
  };
  for (let i = 0; i < rows.length; i++)
    for (let j = 0; j < i; j++) {
      const x = rows[i],
        y = rows[j];
      const sameHint = x.e.familyHint && x.e.familyHint === y.e.familyHint;
      const shared = [x.a, x.b].some((a) =>
        [y.a, y.b].some(
          (b) =>
            a.id === b.id ||
            (a.lang === b.lang && normalize(a.text) === normalize(b.text)),
        ),
      );
      const near = [x.a, x.b].some((a) =>
        [y.a, y.b].some(
          (b) => a.lang === b.lang && similarity(a.text, b.text) >= 0.82,
        ),
      );
      if (sameHint || shared || near) {
        union(j, i);
        if (near && !shared)
          nearDuplicates.push({
            pairs: [`${y.a.id}-${y.b.id}`, `${x.a.id}-${x.b.id}`],
            decision: "same-family",
          });
      }
    }
  const groups = new Map();
  for (let i = 0; i < rows.length; i++) {
    const f = find(i);
    if (!groups.has(f)) groups.set(f, []);
    groups.get(f).push(rows[i]);
  }
  const families = [...groups.values()];
  const cells = families.map(
    (family) =>
      new Set(
        family.flatMap(({ a, b, e }) => [
          `${LANG[a.lang]}-${LANG[b.lang]}-${e.levels[0]}`,
          `${LANG[b.lang]}-${LANG[a.lang]}-${e.levels[1]}`,
        ]),
      ),
  );
  const requiredCells = [];
  for (const source of Object.values(LANG))
    for (const target of Object.values(LANG))
      if (source !== target)
        for (let level = 1; level <= 5; level++)
          requiredCells.push(`${source}-${target}-${level}`);
  const requirements = requiredCells.flatMap((cell) =>
    ["practice", "diagnostic", "evaluation"].map((split) => ({ cell, split })),
  );
  const assignment = new Map();
  const solve = () => {
    const missing = requirements.filter(
      (r) =>
        !cells.some((c, i) => c.has(r.cell) && assignment.get(i) === r.split),
    );
    if (!missing.length) return true;
    const options = missing
      .map((r) => ({
        ...r,
        available: cells.flatMap((c, i) =>
          c.has(r.cell) && !assignment.has(i) ? [i] : [],
        ),
      }))
      .sort((a, b) => a.available.length - b.available.length);
    if (!options[0].available.length) return false;
    const next = options[0];
    next.available.sort(
      (a, b) =>
        missing.filter((r) => r.split === next.split && cells[b].has(r.cell))
          .length -
        missing.filter((r) => r.split === next.split && cells[a].has(r.cell))
          .length,
    );
    for (const i of next.available) {
      assignment.set(i, next.split);
      if (solve()) return true;
      assignment.delete(i);
    }
    return false;
  };
  assert.ok(
    solve(),
    "Cannot cover every direction/level in all three family-isolated splits",
  );
  const tasks = [];
  let ordinal = 0;
  for (const family of families) {
    const groupId =
      "tatoeba-family-" + Math.min(...family.flatMap((r) => [r.a.id, r.b.id]));
    const index = ordinal++,
      slot = index % 10,
      split =
        assignment.get(index) ??
        (slot === 0 ? "evaluation" : slot <= 3 ? "diagnostic" : "practice");
    for (const { a, b, e, request } of family) {
      const provenance = [a, b].map((s) => ({
        provider: "Tatoeba",
        sentenceId: s.id,
        language: LANG[s.lang],
        author: s.owner,
        url: `https://tatoeba.org/en/sentences/show/${s.id}`,
        license: s.license,
        licenseUrl: LICENSES[s.license],
        retrievedAt: request.retrievedAt,
        snapshot: request.file,
        modified: false,
      }));
      for (const [source, target, index] of [
        [a, b, 0],
        [b, a, 1],
      ]) {
        const roles = ["daily", "independent", "ielts"];
        if (["daily", "food", "travel", "work"].includes(e.scene))
          roles.push("abroad");
        if (["study", "ideas"].includes(e.scene) && e.levels[index] >= 3)
          roles.push("gre");
        if (e.scene === "work") roles.push("work");
        if (e.childSafe) {
          roles.push("high");
          if (e.levels[index] <= 3) roles.push("middle");
          if (e.levels[index] <= 2) roles.push("primary");
        }
        tasks.push({
          id: `tatoeba-${source.id}-${target.id}`,
          groupId,
          split,
          sourceLang: LANG[source.lang],
          targetLang: LANG[target.lang],
          level: e.levels[index],
          levelReason: e.levelReasons[index],
          levelStatus: "provisional",
          scene: e.scene,
          roles,
          source: source.text,
          context: "",
          references: [target.text],
          knowledge: [e.focus[LANG[source.lang]]],
          requiredMeaning: e.requiredMeaning,
          provenance,
          review: e.review,
        });
      }
    }
  }
  const decisions = [...candidates].map(([key, { a, b }]) => ({
    pair: key,
    decision: selected.has(key)
      ? "selected"
      : exclusions.has(key)
        ? "editorial-rejected"
        : screenPair(a, b)
          ? "rejected"
          : "not-selected",
    reason: selected.has(key)
      ? "AI editorial acceptance"
      : exclusions.get(key) ||
        screenPair(a, b) ||
        "Outside pilot selection; not independently human-reviewed",
  }));
  const coverage = {};
  for (const t of tasks) {
    const k = t.sourceLang + "-" + t.targetLang;
    coverage[k] ??= {};
    coverage[k][t.level] ??= { practice: 0, diagnostic: 0, evaluation: 0 };
    coverage[k][t.level][t.split]++;
  }
  const reviewed = applyHumanReviews(
    tasks,
    humanReviews.records,
    humanReviews.releaseAcceptance,
  );
  const data = {
    schemaVersion: 1,
    version: curation.version,
    quality: `experimental: accepted ${reviewed.summary.accepted}/${tasks.length} (independent reviews ${reviewed.summary.independentlyReviewed}, user-directed acceptance ${reviewed.summary.userAccepted}); learner calibration pending`,
    tasks: reviewed.tasks,
  };
  const report = {
    version: data.version,
    sourceRequests: manifest.requests.length,
    candidatePairs: candidates.size,
    rejected: decisions.filter((d) =>
      ["rejected", "editorial-rejected"].includes(d.decision),
    ).length,
    notSelected: decisions.filter((d) => d.decision === "not-selected").length,
    curatedPairs: rows.length,
    tasks: tasks.length,
    families: groups.size,
    coverage,
    humanReview: reviewed.summary,
    nearDuplicates,
    decisions,
  };
  return { data, report };
}
export function artifacts({ data, report }) {
  const taskText = JSON.stringify(data, null, 2) + "\n";
  const lines = [
    "# 本地语料库发布报告",
    "",
    `版本：${data.version}。来源：Tatoeba 官方 API v1。`,
    "",
    `实际采集 ${report.sourceRequests} 个响应、${report.candidatePairs} 个去重句对；规则及编选拒绝 ${report.rejected} 对，未入选试用集 ${report.notSelected} 对。编选 ${report.curatedPairs} 个句对，分别标注两个方向形成 ${report.tasks} 道任务，归并 ${report.families} 个语义家族。`,
    "",
    `**质量状态：实验语料。** 已完成自动检查和 Codex AI 编选；按当前验收口径通过 ${report.humanReview.accepted} 道（独立逐题审核 ${report.humanReview.independentlyReviewed} 道，用户要求视为通过 ${report.humanReview.userAccepted} 道）、待通过 ${report.humanReview.pending} 道。真实学习者难度校准 pending。不宣称官方认证、全部人工审校完成或学习效果。高级别、角色与场景覆盖有限，缺口回退 AI。`,
    "",
    "| 方向 | 等级 | 练习 | 诊断 | 评估（不出题） |",
    "|---|---|---:|---:|---:|",
  ];
  for (const [pair, levels] of Object.entries(report.coverage))
    for (const [level, c] of Object.entries(levels))
      lines.push(
        `| ${pair} | L${level} | ${c.practice} | ${c.diagnostic} | ${c.evaluation} |`,
      );
  lines.push(
    "",
    "## 角色与场景覆盖",
    "",
    "角色标签可重叠，数量不可相加为独立题目数；下列统计包含三个分区，运行时仅使用对应练习／诊断分区。",
    "",
    "| 角色 | 任务数 |",
    "|---|---:|",
  );
  for (const role of [
    "primary",
    "middle",
    "high",
    "ielts",
    "gre",
    "abroad",
    "daily",
    "work",
    "independent",
  ])
    lines.push(
      `| ${role} | ${data.tasks.filter((t) => t.roles.includes(role)).length} |`,
    );
  lines.push("", "| 场景 | 任务数 |", "|---|---:|");
  for (const scene of ["daily", "food", "travel", "study", "work", "ideas"])
    lines.push(
      `| ${scene} | ${data.tasks.filter((t) => t.scene === scene).length} |`,
    );
  lines.push(
    "",
    "场景标签与客户端预设按明确别名匹配；海外生活等未设独立场景条目的预设可能回退 AI，不能把总体语料数当作某个具体场景的可用题数。",
  );
  lines.push(
    "",
    "## 筛选与复现",
    "",
    "`sources/manifest.json` 记录每次真实 URL、时间和响应 SHA-256。`screening-report.json` 记录所有候选的规则拒绝或入选／未入选决定，以及相似家族合并。未入选不等于已逐条人工否定。规则检查包括双方许可、作者、未批准状态、直连、脚本、长度、疑似个人信息和明显不适宜内容。",
    "",
    "`curation.json` 记录逐对 AI 编选、各方向等级、理由、场景、含义约束与三语言知识点；`human-review.json` 单独接收真实审核者记录，内容指纹变化后旧通过记录失效。逐题审核清单见 `REVIEW.md`，提交办法见 `../docs/CORPUS_HUMAN_REVIEW.md`。没有记录不算人工通过，人工核查不等于真实学习者校准。原文和参考保持官方快照原样。",
    "",
    "```sh",
    "npm run corpus:collect # 联网刷新候选，已缓存响应不重复下载",
    "npm run corpus:build   # 离线检查并重建任务、报告和署名",
    "npm run corpus:check   # 离线检查产物是否与快照和编选一致",
    "npm test",
    "```",
    "",
    "上游更新须先归档旧快照；移走需刷新的响应及对应 manifest 记录，再运行采集。新候选不会自动入选，必须重新编选。相同原句 ID、相同归一化文本、近似句与显式语义提示合并家族；完整家族共用分区，反向题不跨区。自动相似度不保证发现全部语义改写，发现遗漏须补 familyHint 后重建。",
    "",
    `tasks.json SHA-256：\`${hash(taskText)}\`。构建不使用当前时间或随机数，相同输入可重复生成。`,
    "",
    "## 校准与纠错",
    "",
    "维护者按任务 ID 记录人工核查意见、语言能力、日期、错误类型、修改理由；出现误译或有争议内容时先从 curation 删除后重建，历史快照保留。实际试用按方向收集太易／合适／太难与首次作答，再调整分级。诊断五题仅是练习估计；evaluation 为公开维护集，不是保密考试。",
  );
  const authors = [
    "# Tatoeba 文本署名与许可",
    "",
    "上游文本保持原貌；作者、许可和原句链接如下。相同句子在多个任务出现时只列一次。候选原始响应中的每条文本亦保留 owner、license 和 id，适用相同的官方许可规则。",
    "",
    "来源：[Tatoeba 官方 API](https://api.tatoeba.org/)、[下载与许可说明](https://tatoeba.org/en/downloads)。本项目不把 CC BY 译文重新授权为 CC0；数据许可独立于项目代码。编选标注以 CC0 1.0 提供，不改变上游文本许可。",
    "",
    "| 句子 | 语言 | 作者 | 许可 |",
    "|---|---|---|---|",
  ];
  const p = new Map(
    data.tasks.flatMap((t) => t.provenance.map((s) => [s.sentenceId, s])),
  );
  for (const s of [...p.values()].sort((a, b) => a.sentenceId - b.sentenceId))
    authors.push(
      `| [${s.sentenceId}](${s.url}) | ${s.language} | ${s.author.replaceAll("|", "\\|")} | [${s.license}](${s.licenseUrl}) |`,
    );
  return {
    "tasks.json": taskText,
    "REVIEW.md": reviewChecklist(data),
    "screening-report.json": JSON.stringify(report, null, 2) + "\n",
    "REPORT.md": lines.join("\n") + "\n",
    "ATTRIBUTION.md": authors.join("\n") + "\n",
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const files = artifacts(buildCorpus());
  for (const [file, content] of Object.entries(files)) {
    if (process.argv.includes("--check"))
      assert.equal(read(file), content, `Stale artifact: ${file}`);
    else writeFileSync(new URL(file, root), content);
  }
  console.log(
    process.argv.includes("--check")
      ? "Corpus artifacts verified."
      : "Corpus artifacts built.",
  );
}
