import { randomUUID } from "node:crypto";
export const LANGUAGES = ["zh", "en", "fr"];
export const ROLES = [
  "primary",
  "middle",
  "high",
  "ielts",
  "gre",
  "abroad",
  "daily",
  "work",
  "independent",
];
export const id = () => randomUUID();
export const now = () => new Date().toISOString();
export class AppError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
export function ensure(condition, code = "INVALID_INPUT", status = 400) {
  if (!condition) throw new AppError(code, status);
}
export function text(value, max = 10000, allowEmpty = false) {
  ensure(
    typeof value === "string" &&
      value.length <= max &&
      (allowEmpty || value.trim()),
    "INVALID_INPUT",
  );
  return value.trim();
}
export function initialState() {
  return {
    version: 1,
    userId: id(),
    settings: {
      uiLanguage: "system",
      defaultRole: "daily",
      source: "zh",
      target: "en",
      onboarded: false,
    },
    profiles: {},
    conversations: [],
    questions: [],
    diagnostics: [],
    favorites: [],
    requests: [],
    activeConversationId: null,
    revision: 0,
  };
}
export function validateConfig(c) {
  ensure(
    c &&
      LANGUAGES.includes(c.source) &&
      LANGUAGES.includes(c.target) &&
      c.source !== c.target,
    "INVALID_DIRECTION",
  );
  ensure(ROLES.includes(c.role), "INVALID_ROLE");
  ensure(
    Number.isInteger(c.level) && c.level >= 1 && c.level <= 5,
    "INVALID_LEVEL",
  );
  ensure(["auto", "fixed"].includes(c.mode ?? "auto"), "INVALID_INPUT");
  return {
    source: c.source,
    target: c.target,
    role: c.role,
    level: c.level,
    mode: c.mode ?? "auto",
    scene: text(c.scene ?? "", 500, true),
  };
}
export function updateDifficulty(c, a) {
  if (
    c.config.mode === "fixed" ||
    a.kind !== "first" ||
    !a.eligible ||
    !a.feedback?.valid
  )
    return;
  if (c.window.some((x) => x.attemptId === a.id)) return;
  c.window.push({ attemptId: a.id, score: a.feedback.total });
  c.window = c.window.slice(-5);
  if (c.window.length < 5) return;
  const scores = c.window.map((x) => x.score),
    avg = scores.reduce((x, y) => x + y, 0) / 5;
  const delta = avg >= 85 && Math.min(...scores) >= 70 ? 1 : avg < 60 ? -1 : 0;
  if (delta) {
    const old = c.config.level;
    c.config.level = Math.max(1, Math.min(5, old + delta));
    if (old !== c.config.level)
      c.adjustments.push({
        at: now(),
        from: old,
        to: c.config.level,
        reason: delta > 0 ? "up" : "down",
        average: avg,
      });
    c.window = [];
  }
}
export function publicState(state) {
  const s = structuredClone(state);
  for (const q of s.questions) {
    delete q.reference;
    const diagnosticHidden =
      q.diagnosticId &&
      s.diagnostics.find((d) => d.id === q.diagnosticId)?.status !==
        "completed";
    if (
      diagnosticHidden ||
      !q.attempts.some((a) => a.status === "completed" && a.feedback)
    )
      q.knowledge = [];
    if (
      q.diagnosticId &&
      s.diagnostics.find((d) => d.id === q.diagnosticId)?.status !== "completed"
    )
      for (const a of q.attempts) delete a.feedback;
  }
  return s;
}
function validateStoredFeedback(f) {
  ensure(
    f &&
      typeof f.id === "string" &&
      typeof f.valid === "boolean" &&
      typeof f.overall === "string" &&
      typeof f.strength === "string" &&
      Array.isArray(f.issues) &&
      Array.isArray(f.references) &&
      f.references.length > 0 &&
      f.references.every((r) => typeof r === "string"),
    "BACKUP_INVALID",
  );
  for (const i of f.issues)
    ensure(
      i &&
        typeof i.quote === "string" &&
        typeof i.explanation === "string" &&
        typeof i.suggestion === "string" &&
        ["error", "polish"].includes(i.kind) &&
        ["major", "minor"].includes(i.severity) &&
        ["meaning", "grammar", "vocabulary", "register", "style"].includes(
          i.category,
        ),
      "BACKUP_INVALID",
    );
  if (f.valid) {
    ensure(
      f.dimensions &&
        Number.isFinite(f.total) &&
        f.total >= 0 &&
        f.total <= 100,
      "BACKUP_INVALID",
    );
    for (const k of ["meaning", "grammar", "vocabulary", "naturalness"])
      ensure(
        Number.isFinite(f.dimensions[k]) &&
          f.dimensions[k] >= 0 &&
          f.dimensions[k] <= 100,
        "BACKUP_INVALID",
      );
    const d = f.dimensions;
    ensure(
      Math.abs(
        f.total -
          Math.round(
            d.meaning * 0.4 +
              d.grammar * 0.25 +
              d.vocabulary * 0.2 +
              d.naturalness * 0.15,
          ),
      ) <= 2,
      "BACKUP_INVALID",
    );
  } else ensure(f.total === null && f.dimensions === null, "BACKUP_INVALID");
}
export function validateBackup(b) {
  ensure(b?.version === 1 && b.state?.version === 1, "BACKUP_VERSION");
  const s = b.state;
  ensure(
    typeof s.userId === "string" &&
      s.settings &&
      typeof s.profiles === "object" &&
      s.profiles &&
      !Array.isArray(s.profiles),
    "BACKUP_INVALID",
  );
  ensure(
    ["system", ...LANGUAGES].includes(s.settings.uiLanguage) &&
      ROLES.includes(s.settings.defaultRole),
    "BACKUP_INVALID",
  );
  ensure(
    LANGUAGES.includes(s.settings.source) &&
      LANGUAGES.includes(s.settings.target) &&
      s.settings.source !== s.settings.target,
    "BACKUP_INVALID",
  );
  for (const key of [
    "conversations",
    "questions",
    "diagnostics",
    "favorites",
    "requests",
  ])
    ensure(Array.isArray(s[key]), "BACKUP_INVALID");
  const ids = new Set();
  const register = (o) => {
    ensure(o && typeof o.id === "string" && !ids.has(o.id), "BACKUP_INVALID");
    ids.add(o.id);
  };
  for (const c of s.conversations) {
    register(c);
    validateConfig(c.config);
    ensure(
      typeof c.title === "string" &&
        Array.isArray(c.window) &&
        Array.isArray(c.adjustments),
      "BACKUP_INVALID",
    );
  }
  const conv = new Map(s.conversations.map((c) => [c.id, c]));
  const diag = new Map(s.diagnostics.map((d) => [d.id, d]));
  const questions = new Map(s.questions.map((q) => [q.id, q]));
  const attempts = new Map();
  for (const d of s.diagnostics) {
    register(d);
    validateConfig(d.config);
    ensure(
      conv.has(d.conversationId) &&
        Array.isArray(d.questionIds) &&
        d.questionIds.every((q) => questions.has(q)),
      "BACKUP_INVALID",
    );
    ensure(
      ["active", "completed", "skipped"].includes(d.status),
      "BACKUP_INVALID",
    );
  }
  for (const q of s.questions) {
    register(q);
    validateConfig(q.snapshot);
    ensure(
      conv.has(q.conversationId) &&
        typeof q.source === "string" &&
        typeof q.context === "string" &&
        typeof q.reference === "string" &&
        Array.isArray(q.attempts) &&
        Array.isArray(q.followups) &&
        Array.isArray(q.knowledge) &&
        q.knowledge.every((k) => typeof k === "string") &&
        typeof q.createdAt === "string" &&
        Number.isFinite(Date.parse(q.createdAt)) &&
        q.drafts &&
        typeof q.drafts.answer === "string" &&
        typeof q.drafts.followup === "string",
      "BACKUP_INVALID",
    );
    ensure(!q.diagnosticId || diag.has(q.diagnosticId), "BACKUP_INVALID");
    for (const a of q.attempts) {
      register(a);
      ensure(
        a.questionId === q.id &&
          typeof a.createdAt === "string" &&
          Number.isFinite(Date.parse(a.createdAt)) &&
          typeof a.answer === "string" &&
          ["first", "revision", "review"].includes(a.kind) &&
          ["pending", "completed", "failed", "interrupted"].includes(a.status),
        "BACKUP_INVALID",
      );
      if (a.status === "completed") validateStoredFeedback(a.feedback);
      else ensure(!a.feedback, "BACKUP_INVALID");
      attempts.set(a.id, a);
    }
    for (const f of q.followups) {
      register(f);
      ensure(
        typeof f.text === "string" &&
          ["pending", "completed", "failed", "interrupted"].includes(f.status),
        "BACKUP_INVALID",
      );
    }
  }
  for (const c of s.conversations) {
    ensure(
      !c.currentQuestionId ||
        (questions.has(c.currentQuestionId) &&
          questions.get(c.currentQuestionId).conversationId === c.id),
      "BACKUP_INVALID",
    );
    ensure(
      !c.activeDiagnosticId ||
        (diag.has(c.activeDiagnosticId) &&
          diag.get(c.activeDiagnosticId).conversationId === c.id),
      "BACKUP_INVALID",
    );
  }
  for (const q of s.questions) {
    for (const f of q.followups)
      ensure(
        q.attempts.some((a) => a.id === f.attemptId && a.feedback) &&
          (f.status !== "completed" || typeof f.answer === "string"),
        "BACKUP_INVALID",
      );
  }
  for (const d of s.diagnostics) {
    ensure(
      d.questionIds.every(
        (qid) =>
          questions.get(qid).diagnosticId === d.id &&
          questions.get(qid).conversationId === d.conversationId,
      ),
      "BACKUP_INVALID",
    );
    if (d.status === "completed")
      ensure(
        d.result &&
          Number.isInteger(d.result.level) &&
          d.result.level >= 1 &&
          d.result.level <= 5 &&
          typeof d.result.reason === "string",
        "BACKUP_INVALID",
      );
  }
  for (const q of s.questions)
    for (const a of q.attempts)
      ensure(
        !a.previousAttemptId ||
          attempts.get(a.previousAttemptId)?.questionId === q.id,
        "BACKUP_INVALID",
      );
  for (const f of s.favorites) {
    register(f);
    ensure(
      (f.type === "question" && questions.has(f.objectId)) ||
        (f.type === "feedback" &&
          attempts.has(f.objectId) &&
          attempts.get(f.objectId).feedback),
      "BACKUP_INVALID",
    );
  }
  for (const [lang, p] of Object.entries(s.profiles))
    ensure(
      LANGUAGES.includes(lang) &&
        Number.isInteger(p.level) &&
        p.level >= 1 &&
        p.level <= 5,
      "BACKUP_INVALID",
    );
  ensure(
    !s.activeConversationId || conv.has(s.activeConversationId),
    "BACKUP_INVALID",
  );
  const forbidden = new Set(["apiKey", "api_key", "authorization", "rawAudio"]);
  function scan(o) {
    if (!o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      ensure(!forbidden.has(k), "BACKUP_INVALID");
      scan(v);
    }
  }
  scan(s);
  return structuredClone(s);
}
export function recoverInterrupted(s) {
  for (const r of s.requests)
    if (r.status === "pending") {
      r.status = "interrupted";
      r.error = "INTERRUPTED";
    }
  for (const c of s.conversations)
    if (c.generationStatus === "pending") {
      c.generationStatus = "interrupted";
      c.generationError = "INTERRUPTED";
    }
  for (const d of s.diagnostics)
    if (d.busy) {
      d.busy = false;
      d.error = "INTERRUPTED";
    }
  for (const q of s.questions)
    for (const a of [...q.attempts, ...q.followups])
      if (a.status === "pending") {
        a.status = "interrupted";
        a.error = "INTERRUPTED";
      }
  return s;
}
